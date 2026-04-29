import { useEffect, useState } from 'react';
import Tesseract from 'tesseract.js';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

function ocrUrl(path: string): string {
  if (API_BASE) return `${API_BASE}${path}`;
  return path;
}

export function OcrScanner() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [resultText, setResultText] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    setResultText('');
    setFile(nextFile);

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    if (nextFile) {
      setPreview(URL.createObjectURL(nextFile));
    } else {
      setPreview(null);
    }
  };

  const scanWithTesseract = async () => {
    if (!file) return;
    setLoading(true);
    setResultText('Recognizing text...');

    try {
      const { data } = await Tesseract.recognize(file, 'eng');
      setResultText(data.text || 'No text found.');
    } catch {
      setResultText('OCR failed. Please try a clearer image.');
    } finally {
      setLoading(false);
    }
  };

  const scanWithServer = async () => {
    if (!file) return;

    setLoading(true);
    setResultText('Sending image to OCR service...');

    const reader = new FileReader();
    reader.onload = async () => {
      const imageBase64 = reader.result as string;
      try {
        const response = await fetch(ocrUrl('/ocr'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageBase64 }),
        });

        const data = await response.json();
        if (!response.ok || data.error) {
          throw new Error(data.error || 'OCR request failed.');
        }

        setResultText(data.text ?? 'No text returned.');
      } catch (err) {
        setResultText(err instanceof Error ? err.message : 'Could not reach OCR endpoint.');
      } finally {
        setLoading(false);
      }
    };

    reader.readAsDataURL(file);
  };

  return (
    <section className="wow-card">
      <h2 style={{ marginTop: 0 }}>OCR Scanner</h2>

      <label className="wow-field" style={{ marginBottom: 12 }}>
        <span className="wow-label">Upload a screenshot or image</span>
        <input className="wow-input" type="file" accept="image/*" onChange={handleFile} />
      </label>

      {preview ? (
        <img src={preview} alt="OCR preview" style={{ maxWidth: '100%', borderRadius: 10, marginBottom: 12, border: '1px solid #4f2f7f' }} />
      ) : null}

      <div style={{ marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="wow-btn wow-btn-primary" onClick={scanWithTesseract} disabled={!file || loading}>
          Free OCR
        </button>
        <button className="wow-btn wow-btn-neon" onClick={scanWithServer} disabled={!file || loading}>
          OCR via Backend
        </button>
      </div>

      <div className="wow-status" style={{ whiteSpace: 'pre-wrap', minHeight: 120 }}>
        {loading ? 'Working...' : resultText || 'Upload an image and choose OCR mode.'}
      </div>

      <div style={{ marginTop: 12, color: '#b8a9da', fontSize: 13 }}>
        Free mode runs in-browser. Backend mode uses your Nest API + OCR provider config.
      </div>
    </section>
  );
}
