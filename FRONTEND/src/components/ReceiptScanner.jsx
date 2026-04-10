import { useState, useRef } from 'react';

// Tesseract is loaded via CDN script tag in public/index.html (no npm install needed)
// See instructions at bottom of this file

const AMOUNT_PATTERNS = [
  // "Total: 1,234.56" / "TOTAL 1234.56" / "Total INR 1234"
  /(?:total|amount|grand\s*total|net\s*total|bill\s*amount|payable|due)[^\d]{0,10}([\d,]+\.?\d{0,2})/i,
  // "₹ 1,234.56" / "Rs. 1234" / "INR 1,234"
  /(?:₹|rs\.?|inr|usd|\$|eur|€|gbp|£)\s*([\d,]+\.?\d{0,2})/i,
  // Last resort: largest number on the receipt
  null,
];

const DESC_PATTERNS = [
  /(?:restaurant|hotel|cafe|cab|taxi|uber|ola|zomato|swiggy|amazon|flipkart|store|mart|shop|medical|pharmacy|petrol|fuel)\s*[:\-]?\s*([^\n]{3,40})/i,
  /(?:bill\s*for|payment\s*for|paid\s*for)\s*[:\-]?\s*([^\n]{3,40})/i,
];

function parseReceipt(rawText) {
  const text  = rawText.replace(/\r/g, '').trim();
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // ── Extract amount ────────────────────────────────────
  let amount = null;

  for (const pattern of AMOUNT_PATTERNS) {
    if (!pattern) break; // fallback handled below
    const match = text.match(pattern);
    if (match) {
      const num = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(num) && num > 0) { amount = num; break; }
    }
  }

  // Fallback: find the largest number in the text
  if (!amount) {
    const allNums = [...text.matchAll(/([\d,]+\.\d{2})/g)]
      .map(m => parseFloat(m[1].replace(/,/g, '')))
      .filter(n => n > 0 && n < 1_000_000);
    if (allNums.length) amount = Math.max(...allNums);
  }

  // ── Extract description ───────────────────────────────
  let description = '';

  for (const pattern of DESC_PATTERNS) {
    const match = text.match(pattern);
    if (match) { description = match[0].trim().slice(0, 60); break; }
  }

  // Fallback: first non-numeric, non-empty line (often the merchant name)
  if (!description) {
    const candidate = lines.find(l => l.length > 3 && !/^\d/.test(l) && !/^(date|time|tax|gst|cgst|sgst)/i.test(l));
    if (candidate) description = candidate.slice(0, 60);
  }

  return {
    amount:      amount ? parseFloat(amount.toFixed(2)) : null,
    description: description || '',
    rawText,
  };
}

export default function ReceiptScanner({ onResult }) {
  const [status,   setStatus]   = useState('idle'); // idle | scanning | done | error
  const [progress, setProgress] = useState(0);
  const [preview,  setPreview]  = useState(null);
  const fileRef = useRef();

  async function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setStatus('error');
      return;
    }

    setPreview(URL.createObjectURL(file));
    setStatus('scanning');
    setProgress(0);

    try {
      // Tesseract must be loaded via CDN — see public/index.html instructions
      if (typeof Tesseract === 'undefined') {
        throw new Error('Tesseract not loaded. Add the CDN script to public/index.html.');
      }

      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const parsed = parseReceipt(result.data.text);
      setStatus('done');
      onResult(parsed);
    } catch (err) {
      console.error('OCR error:', err);
      setStatus('error');
    }
  }

  function reset() {
    setStatus('idle');
    setPreview(null);
    setProgress(0);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div style={{ marginBottom: '14px' }}>
      {/* Trigger button */}
      {status === 'idle' && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          style={{
            width: '100%',
            padding: '11px 14px',
            background: 'var(--surface2)',
            border: '1px dashed var(--border2)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text2)',
            fontFamily: 'var(--font-display)',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            letterSpacing: '0.5px',
            transition: 'all 0.18s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text2)'; }}
        >
          <span style={{ fontSize: '16px' }}>📷</span>
          Scan Receipt (OCR auto-fill)
        </button>
      )}

      {/* Hidden file input — accepts camera on mobile */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files[0])}
      />

      {/* Scanning state */}
      {status === 'scanning' && (
        <div style={{
          background: 'var(--surface2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '14px',
        }}>
          {preview && (
            <img
              src={preview}
              alt="receipt preview"
              style={{ width: '100%', maxHeight: '140px', objectFit: 'cover', borderRadius: '6px', marginBottom: '12px', opacity: 0.7 }}
            />
          )}
          <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '8px', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
            Reading receipt... {progress}%
          </div>
          {/* Progress bar */}
          <div style={{ height: '3px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: 'var(--accent)',
              borderRadius: '2px',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      )}

      {/* Done state */}
      {status === 'done' && (
        <div style={{
          background: 'rgba(0,212,170,0.06)',
          border: '1px solid rgba(0,212,170,0.2)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
        }}>
          <div style={{ fontSize: '12px', color: 'var(--accent)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
            ✓ Receipt scanned — fields auto-filled
          </div>
          <button
            type="button"
            onClick={reset}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text3)',
              cursor: 'pointer',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              flexShrink: 0,
            }}
          >
            Scan again
          </button>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div style={{
          background: 'rgba(255,107,107,0.08)',
          border: '1px solid rgba(255,107,107,0.2)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
        }}>
          <div style={{ fontSize: '12px', color: 'var(--red)' }}>
            Could not read receipt. Please fill in manually.
          </div>
          <button
            type="button"
            onClick={reset}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text3)',
              cursor: 'pointer',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              flexShrink: 0,
            }}
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}