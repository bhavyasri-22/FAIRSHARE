import { useState, useRef } from 'react';

// ── AI extraction (Mindee via backend) ───────────────────────────────────────
async function extractWithAI(base64Data, mimeType) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch('/api/receipts/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64: base64Data, mimeType }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error('Backend scan failed');
    const data = await response.json();
    return { ...data, source: 'mindee' };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') throw new Error('Scan timed out (45s).');
    throw err;
  }
}

// ── Tesseract OCR fallback ───────────────────────────────────────────────────
const AMOUNT_PATTERNS = [
  /(?:total|amount|grand\s*total|net\s*total|bill\s*amount|payable|due)[^\d]{0,10}([\d,]+\.?\d{0,2})/i,
  /(?:₹|rs\.?|inr|usd|\$|eur|€|gbp|£)\s*([\d,]+\.?\d{0,2})/i,
];

async function extractWithTesseract(file, onProgress) {
  if (typeof Tesseract === 'undefined') throw new Error('Tesseract not loaded');

  const result = await Tesseract.recognize(file, 'eng', {
    logger: m => {
      if (m.status === 'recognizing text') {
        onProgress(Math.round(m.progress * 100));
      }
    }
  });

  const text = result.data.text;
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  let amount = null;

  for (const pattern of AMOUNT_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const n = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(n) && n > 0) {
        amount = n;
        break;
      }
    }
  }

  if (!amount) {
    const nums = [...text.matchAll(/([\d,]+\.\d{2})/g)]
      .map(m => parseFloat(m[1].replace(/,/g, '')))
      .filter(n => n > 0 && n < 1_000_000);

    if (nums.length) amount = Math.max(...nums);
  }

  const candidate = lines.find(
    l =>
      l.length > 3 &&
      !/^\d/.test(l) &&
      !/^(date|time|tax|gst|cgst|sgst)/i.test(l)
  );

  return {
    amount: amount ? parseFloat(amount.toFixed(2)) : null,
    description: candidate ? candidate.slice(0, 60) : '',
    source: 'tesseract',
  };
}

// ── Compress Image ───────────────────────────────────────────────────────────
function compressImage(file, maxWidth = 1000) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ReceiptScanner({ onResult }) {
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState(null);
  const [source, setSource] = useState('');
  const [errMsg, setErrMsg] = useState('');
  const fileRef = useRef();

  async function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      setStatus('error');
      setErrMsg('Please select an image file.');
      return;
    }

    setPreview(URL.createObjectURL(file));
    setStatus('scanning');
    setProgress(0);
    setErrMsg('');

    let result = null;
    let b64 = null;

    // ── Try AI (Mindee backend) ─────────────────────────────
    try {
      setProgress(30);
      b64 = await compressImage(file);
      result = await extractWithAI(b64, 'image/jpeg');
      setProgress(100);
    } catch (err) {
      console.warn('AI failed, falling back to Tesseract:', err.message);
      result = null;
    }

    // ── Fallback ────────────────────────────────────────────
    if (!result) {
      try {
        result = await extractWithTesseract(file, setProgress);
      } catch (tErr) {
        console.error('Tesseract failed:', tErr.message);
        setStatus('error');
        setErrMsg('Could not read the receipt. Try a clearer photo.');
        return;
      }
    }

    setSource(result.source);
    setStatus('done');
    onResult({ 
      amount: result.amount, 
      description: result.description, 
      billImage: b64,
      lineItems: result.line_items || []
    });
  }

  function reset() {
    setStatus('idle');
    setPreview(null);
    setProgress(0);
    setErrMsg('');
    setSource('');
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div style={{ marginBottom: '14px' }}>

      {/* Idle */}
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
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            Scan Receipt — AI auto-fill
          </div>
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files[0])}
      />

      {/* Scanning */}
      {status === 'scanning' && (
        <div style={{ padding: '14px' }}>
          {preview && (
            <img
              src={preview}
              alt="receipt"
              style={{ width: '100%', maxHeight: '140px' }}
            />
          )}
          <div>
            Reading receipt... {progress}%
          </div>
        </div>
      )}

      {/* Done */}
      {status === 'done' && (
        <div style={{ padding: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Receipt processed
          </div>
          <div>
            {source === 'mindee'
              ? 'Powered by Mindee AI'
              : 'Powered by Tesseract OCR'}
          </div>
          <button onClick={reset}>Scan again</button>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div style={{ padding: '12px' }}>
          <div>{errMsg}</div>
          <button onClick={reset}>Try again</button>
        </div>
      )}
    </div>
  );
}