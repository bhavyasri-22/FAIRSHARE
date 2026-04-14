import { useState, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// ReceiptScanner
//
// Flow:
//   1. User picks image (camera on mobile, file picker on desktop)
//   2. Convert to base64 → POST to /api/receipts/scan (Mindee backend)
//   3. Mindee returns: { amount, description, date, category, line_items, ... }
//   4. If backend fails → fall back to Tesseract OCR (client-side)
//   5. Call onResult({ amount, description }) to auto-fill the expense form
//
// Backend requirement:
//   BACKEND/.env  →  MINDEE_API_KEY=your_mindee_key_here
//   npm install axios form-data   (in BACKEND)
//   Register route in server.js:  app.use('/api/receipts', receiptRoutes)
// ─────────────────────────────────────────────────────────────────────────────

// ── Mindee via backend ────────────────────────────────────────────────────────
async function extractWithMindee(base64Data, mimeType) {
  console.log('[Receipt] → Sending image to Mindee backend...');
  console.log('[Receipt]   mimeType:', mimeType);

  const response = await fetch('/api/receipts/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64: base64Data, mimeType }),
  });

  console.log('[Receipt] ← Backend responded with status:', response.status);

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    console.error('[Receipt] Backend error body:', errBody);
    throw new Error(`Backend scan failed (${response.status}): ${errBody.error || 'unknown'}`);
  }

  const data = await response.json();
  console.log('[Receipt] ✅ Mindee raw result:', data);

  // Validate we got something useful
  if (data.amount == null && !data.description) {
    throw new Error('Mindee returned empty fields — image may be unreadable');
  }

  return { ...data, source: 'mindee' };
}

// ── Tesseract OCR fallback ────────────────────────────────────────────────────
const AMOUNT_PATTERNS = [
  /(?:total|amount|grand\s*total|net\s*total|bill\s*amount|payable|due)[^\d]{0,10}([\d,]+\.?\d{0,2})/i,
  /(?:₹|rs\.?|inr|usd|\$|eur|€|gbp|£)\s*([\d,]+\.?\d{0,2})/i,
];

async function extractWithTesseract(file, onProgress) {
  if (typeof Tesseract === 'undefined') {
    throw new Error('Tesseract not loaded — add CDN script to public/index.html');
  }

  console.log('[Receipt] → Starting Tesseract OCR...');

  const result = await Tesseract.recognize(file, 'eng', {
    logger: m => {
      if (m.status === 'recognizing text') {
        const pct = Math.round(m.progress * 100);
        onProgress(pct);
        if (pct % 25 === 0) console.log(`[Receipt]   Tesseract progress: ${pct}%`);
      }
    },
  });

  const text  = result.data.text;
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  console.log('[Receipt]   Tesseract raw text (first 300 chars):', text.slice(0, 300));

  let amount = null;
  for (const pattern of AMOUNT_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const n = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(n) && n > 0) { amount = n; break; }
    }
  }

  // Last resort: largest decimal number in the receipt
  if (!amount) {
    const nums = [...text.matchAll(/([\d,]+\.\d{2})/g)]
      .map(m => parseFloat(m[1].replace(/,/g, '')))
      .filter(n => n > 0 && n < 1_000_000);
    if (nums.length) amount = Math.max(...nums);
  }

  const candidate = lines.find(
    l => l.length > 3 && !/^\d/.test(l) && !/^(date|time|tax|gst|cgst|sgst)/i.test(l)
  );

  const parsed = {
    amount:      amount ? parseFloat(amount.toFixed(2)) : null,
    description: candidate ? candidate.slice(0, 60) : '',
    source:      'tesseract',
  };

  console.log('[Receipt] ✅ Tesseract result:', parsed);
  return parsed;
}

// ── Convert File to base64 ────────────────────────────────────────────────────
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader    = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ReceiptScanner({ onResult }) {
  const [status,   setStatus]   = useState('idle');    // idle | scanning | done | error
  const [progress, setProgress] = useState(0);
  const [preview,  setPreview]  = useState(null);
  const [source,   setSource]   = useState('');        // 'mindee' | 'tesseract'
  const [errMsg,   setErrMsg]   = useState('');
  const [details,  setDetails]  = useState(null);      // extra fields from Mindee
  const fileRef = useRef();

  async function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      setStatus('error');
      setErrMsg('Please select an image file (JPG, PNG, etc.)');
      return;
    }

    console.log('[Receipt] ─────────────────────────────────');
    console.log('[Receipt] File selected:', file.name, '|', file.type, '|', (file.size / 1024).toFixed(1) + 'KB');

    setPreview(URL.createObjectURL(file));
    setStatus('scanning');
    setProgress(0);
    setErrMsg('');
    setDetails(null);

    let result = null;

    // ── Primary: Mindee via backend ───────────────────────
    try {
      setProgress(20);
      const base64 = await fileToBase64(file);
      console.log('[Receipt] Base64 conversion done, size:', Math.round(base64.length / 1024) + 'KB');
      setProgress(40);

      result = await extractWithMindee(base64, file.type);
      setProgress(100);

      // Store extra Mindee fields for display
      setDetails({
        date:     result.date     || null,
        category: result.category || null,
        tax:      result.total_tax || null,
        items:    result.line_items?.length || 0,
      });
    } catch (mindeeErr) {
      console.warn('[Receipt] ⚠️ Mindee failed:', mindeeErr.message);
      console.warn('[Receipt] Falling back to Tesseract OCR...');
      result = null;
    }

    // ── Fallback: Tesseract ───────────────────────────────
    if (!result) {
      try {
        result = await extractWithTesseract(file, setProgress);
      } catch (tErr) {
        console.error('[Receipt] ❌ Tesseract also failed:', tErr.message);
        setStatus('error');
        setErrMsg('Could not read this receipt. Try a clearer, well-lit photo.');
        return;
      }
    }

    console.log('[Receipt] ✅ Final result sent to form:', {
      amount:      result.amount,
      description: result.description,
      source:      result.source,
    });

    setSource(result.source);
    setStatus('done');
    onResult({ amount: result.amount, description: result.description });
  }

  function reset() {
    setStatus('idle');
    setPreview(null);
    setProgress(0);
    setErrMsg('');
    setSource('');
    setDetails(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div style={{ marginBottom: '14px' }}>

      {/* ── Idle ── */}
      {status === 'idle' && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          style={{
            width: '100%', padding: '11px 14px',
            background: 'var(--surface2)',
            border: '1px dashed var(--border2)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text2)',
            fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            letterSpacing: '0.5px', transition: 'all 0.18s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text2)'; }}
        >
          <span style={{ fontSize: '16px' }}>📷</span>
          Scan Receipt — AI auto-fill
        </button>
      )}

      {/* Hidden file input — opens camera on mobile */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files[0])}
      />

      {/* ── Scanning ── */}
      {status === 'scanning' && (
        <div style={{
          background: 'var(--surface2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', padding: '14px',
        }}>
          {preview && (
            <img src={preview} alt="receipt preview" style={{
              width: '100%', maxHeight: '140px', objectFit: 'cover',
              borderRadius: '6px', marginBottom: '12px', opacity: 0.75,
            }} />
          )}
          <div style={{
            fontSize: '12px', color: 'var(--text2)', marginBottom: '8px',
            fontFamily: 'var(--font-display)', fontWeight: 700,
          }}>
            {progress < 50 ? 'Uploading to Mindee AI...' : progress < 90 ? 'Reading receipt...' : 'Finishing up...'} {progress}%
          </div>
          {/* Progress bar */}
          <div style={{ height: '3px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${progress}%`,
              background: 'var(--accent)', borderRadius: '2px',
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      )}

      {/* ── Done ── */}
      {status === 'done' && (
        <div style={{
          background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.2)',
          borderRadius: 'var(--radius-sm)', padding: '12px 14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
            <div>
              <div style={{
                fontSize: '12px', color: 'var(--accent)',
                fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '4px',
              }}>
                ✓ Receipt scanned — fields auto-filled
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text3)' }}>
                {source === 'mindee' ? '⚡ Powered by Mindee AI' : '🔍 Powered by Tesseract OCR'}
              </div>

              {/* Extra Mindee fields */}
              {source === 'mindee' && details && (
                <div style={{
                  marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px',
                }}>
                  {details.date && (
                    <span style={pill}>📅 {details.date}</span>
                  )}
                  {details.category && (
                    <span style={pill}>🏷️ {details.category}</span>
                  )}
                  {details.tax != null && (
                    <span style={pill}>Tax: {details.tax}</span>
                  )}
                  {details.items > 0 && (
                    <span style={pill}>{details.items} line item{details.items > 1 ? 's' : ''}</span>
                  )}
                </div>
              )}
            </div>

            <button type="button" onClick={reset} style={{
              background: 'none', border: 'none', color: 'var(--text3)',
              cursor: 'pointer', fontSize: '11px', fontFamily: 'var(--font-mono)',
              flexShrink: 0, padding: '0',
            }}>
              Scan again
            </button>
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {status === 'error' && (
        <div style={{
          background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)',
          borderRadius: 'var(--radius-sm)', padding: '12px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
        }}>
          <div style={{ fontSize: '12px', color: 'var(--red)', lineHeight: 1.6 }}>
            {errMsg || 'Could not read receipt. Please fill in manually.'}
          </div>
          <button type="button" onClick={reset} style={{
            background: 'none', border: 'none', color: 'var(--text3)',
            cursor: 'pointer', fontSize: '11px', fontFamily: 'var(--font-mono)', flexShrink: 0,
          }}>
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

const pill = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: '999px',
  fontSize: '10px',
  background: 'rgba(0,212,170,0.1)',
  border: '1px solid rgba(0,212,170,0.15)',
  color: 'var(--accent)',
  fontFamily: 'var(--font-mono)',
};