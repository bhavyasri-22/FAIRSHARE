import { useState, useRef } from 'react';

// ── AI extraction (Mindee via backend) ───────────────────────────────────────
async function extractWithAI(base64Data, mimeType) {
  const response = await fetch('/api/receipts/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64: base64Data, mimeType })
  });

  if (!response.ok) throw new Error('Backend scan failed');

  const data = await response.json();

  return { ...data, source: 'mindee' };
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

// ── Convert File to base64 ───────────────────────────────────────────────────
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
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

    // ── Try AI (Mindee backend) ─────────────────────────────
    try {
      setProgress(30);
      const base64 = await fileToBase64(file);
      result = await extractWithAI(base64, file.type);
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
    onResult({ amount: result.amount, description: result.description });
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
          📷 Scan Receipt — AI auto-fill
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
          <div>✓ Receipt processed</div>
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