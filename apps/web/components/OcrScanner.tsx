import { useState } from 'react';
import Tesseract from 'tesseract.js';

export function OcrScanner() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [resultText, setResultText] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'tesseract' | 'server'>('tesseract');

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    setResultText('');
    setFile(nextFile);
    if (nextFile) {
      setPreview(URL.createObjectURL(nextFile));
    }
  };

  const scanWithTesseract = async () => {
    if (!file) return;
    setLoading(true);
    setResultText('Recognizing text...');

    try {
      const { data } = await Tesseract.recognize(file, 'eng');
      setResultText(data.text || 'No text found.');
    } catch (error) {
      setResultText('OCR failed. Please try a different image.');
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
        const response = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageBase64 })
        });
        const data = await response.json();
        setResultText(data.text ?? data.error ?? 'No text returned.');
      } catch (error) {
        setResultText('Could not reach OCR endpoint.');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <section style={{ padding: 20, border: '1px solid #444', borderRadius: 14, marginTop: 20 }}>
      <h2>OCR Scanner</h2>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
          Upload an image for OCR
        </label>
        <input type="file" accept="image/*" onChange={handleFile} />
      </div>
      {preview ? <img src={preview} alt="OCR preview" style={{ maxWidth: '100%', borderRadius: 10, marginBottom: 12 }} /> : null}
      <div style={{ marginBottom: 16 }}>
        <button onClick={scanWithTesseract} disabled={!file || loading} style={{ marginRight: 10, padding: '10px 18px' }}>
          Free OCR (Tesseract)
        </button>
        <button onClick={scanWithServer} disabled={!file || loading} style={{ padding: '10px 18px' }}>
          OCR via Backend
        </button>
      </div>
      <div style={{ whiteSpace: 'pre-wrap', minHeight: 120, background: '#111', color: '#e8e8e8', padding: 14, borderRadius: 10 }}>
        {loading ? 'Working...' : resultText || 'Upload an image and choose an OCR mode.'}
      </div>
      <div style={{ marginTop: 12, color: '#999', fontSize: 13 }}>
        Free option: client-side OCR runs inside the browser with no external API key. Backend OCR uses OCR.space if configured in the Nest API.
      </div>
    </section>
  );
}
