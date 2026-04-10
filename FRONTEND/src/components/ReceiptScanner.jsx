import { useState, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// ReceiptScanner
//
// Strategy:
//   1. Convert image to base64
//   2. Call Gemini Vision (gemini-1.5-flash — free tier) with a structured prompt
//   3. Parse the JSON response → auto-fill description + amount
//   4. If Gemini fails (no key, network error, etc.) → fall back to Tesseract OCR
//
// Setup:
//   - Get a FREE Gemini API key at https://aistudio.google.com/app/apikey
//   - Add to FRONTEND/.env:  REACT_APP_GEMINI_KEY=your_key_here
//   - Tesseract CDN must still be in public/index.html as a fallback
// ─────────────────────────────────────────────────────────────────────────────

const GEMINI_KEY = process.env.REACT_APP_GEMINI_KEY;
const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-001:generateContent?key=${GEMINI_KEY}`;

// ── Gemini Vision extraction ──────────────────────────────────────────────────
async function extractWithGemini(base64Data, mimeType) {
  const prompt = `You are a receipt parser. Look at this receipt image and extract:
1. The TOTAL amount paid (the final amount, after tax, the largest "total" figure)
2. A short description of what was purchased (merchant name or category, max 50 characters)

Respond ONLY with valid JSON in exactly this format, no explanation, no markdown:
{"amount": 1234.56, "description": "Merchant Name or Category"}

If you cannot find the total amount, use null for amount.
If you cannot determine a description, use null for description.`;

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: base64Data } }
        ]
      }],
      generationConfig: { temperature: 0, maxOutputTokens: 100 }
    })
  });

  if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);

  const data = await response.json();
  const raw  = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!raw) throw new Error('Empty Gemini response');

  // Strip markdown code fences if model adds them despite the prompt
  const clean   = raw.replace(/```json|```/g, '').trim();
  const parsed  = JSON.parse(clean);
  return {
    amount:      parsed.amount      ? parseFloat(parsed.amount)       : null,
    description: parsed.description ? String(parsed.description).trim() : '',
    source:      'gemini',
  };
}

// ── Tesseract OCR fallback ────────────────────────────────────────────────────
const AMOUNT_PATTERNS = [
  /(?:total|amount|grand\s*total|net\s*total|bill\s*amount|payable|due)[^\d]{0,10}([\d,]+\.?\d{0,2})/i,
  /(?:₹|rs\.?|inr|usd|\$|eur|€|gbp|£)\s*([\d,]+\.?\d{0,2})/i,
];

async function extractWithTesseract(file, onProgress) {
  if (typeof Tesseract === 'undefined') throw new Error('Tesseract not loaded');

  const result = await Tesseract.recognize(file, 'eng', {
    logger: m => { if (m.status === 'recognizing text') onProgress(Math.round(m.progress * 100)); }
  });

  const text  = result.data.text;
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  let amount = null;
  for (const pattern of AMOUNT_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const n = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(n) && n > 0) { amount = n; break; }
    }
  }
  if (!amount) {
    const nums = [...text.matchAll(/([\d,]+\.\d{2})/g)]
      .map(m => parseFloat(m[1].replace(/,/g, '')))
      .filter(n => n > 0 && n < 1_000_000);
    if (nums.length) amount = Math.max(...nums);
  }

  const candidate = lines.find(l => l.length > 3 && !/^\d/.test(l) && !/^(date|time|tax|gst|cgst|sgst)/i.test(l));
  return {
    amount:      amount ? parseFloat(amount.toFixed(2)) : null,
    description: candidate ? candidate.slice(0, 60) : '',
    source:      'tesseract',
  };
}

// ── Convert File to base64 ────────────────────────────────────────────────────
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ReceiptScanner({ onResult }) {
  const [status,   setStatus]   = useState('idle'); // idle | scanning | done | error
  const [progress, setProgress] = useState(0);
  const [preview,  setPreview]  = useState(null);
  const [source,   setSource]   = useState('');    // 'gemini' | 'tesseract'
  const [errMsg,   setErrMsg]   = useState('');
  const fileRef = useRef();

  async function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      setStatus('error'); setErrMsg('Please select an image file.');
      return;
    }

    setPreview(URL.createObjectURL(file));
    setStatus('scanning');
    setProgress(0);
    setErrMsg('');

    let result = null;

    // ── Try Gemini first ──────────────────────────────────
    if (GEMINI_KEY) {
      try {
        setProgress(30); // show some progress while waiting for API
        const base64 = await fileToBase64(file);
        result = await extractWithGemini(base64, file.type);
        setProgress(100);
      } catch (geminiErr) {
        console.warn('Gemini failed, falling back to Tesseract:', geminiErr.message);
        result = null;
      }
    }

    // ── Fallback to Tesseract ─────────────────────────────
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
    setStatus('idle'); setPreview(null); setProgress(0); setErrMsg(''); setSource('');
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div style={{ marginBottom: '14px' }}>

      {/* Idle — trigger button */}
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

      {/* Hidden file input — captures camera on mobile */}
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
        <div style={{
          background: 'var(--surface2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', padding: '14px',
        }}>
          {preview && (
            <img src={preview} alt="receipt" style={{
              width: '100%', maxHeight: '140px', objectFit: 'cover',
              borderRadius: '6px', marginBottom: '12px', opacity: 0.7
            }} />
          )}
          <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '8px', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
            {GEMINI_KEY ? 'Reading receipt with AI...' : 'Reading receipt with OCR...'} {progress}%
          </div>
          <div style={{ height: '3px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${progress}%`,
              background: 'var(--accent)', borderRadius: '2px',
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      )}

      {/* Done */}
      {status === 'done' && (
        <div style={{
          background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.2)',
          borderRadius: 'var(--radius-sm)', padding: '12px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
        }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--accent)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
              ✓ Receipt read — fields auto-filled
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '2px' }}>
              {source === 'gemini' ? 'Powered by Gemini Vision AI' : 'Powered by Tesseract OCR'}
            </div>
          </div>
          <button type="button" onClick={reset} style={{
            background: 'none', border: 'none', color: 'var(--text3)',
            cursor: 'pointer', fontSize: '11px', fontFamily: 'var(--font-mono)', flexShrink: 0,
          }}>
            Scan again
          </button>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div style={{
          background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)',
          borderRadius: 'var(--radius-sm)', padding: '12px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
        }}>
          <div style={{ fontSize: '12px', color: 'var(--red)', lineHeight: 1.5 }}>
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