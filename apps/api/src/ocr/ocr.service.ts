import { Injectable } from '@nestjs/common';
import { OcrResponseDto } from './dto/ocr-response.dto';

@Injectable()
export class OcrService {
  private readonly apiKey = process.env.OCR_SPACE_API_KEY;

  async parseImage(imageDataUrl: string): Promise<OcrResponseDto> {
    if (!this.apiKey) {
      return {
        error: 'OCR.space API key not configured. Use client-side Tesseract OCR or set OCR_SPACE_API_KEY in the API environment.'
      };
    }

    try {
      const base64 = imageDataUrl.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
      const form = new URLSearchParams();
      form.append('base64Image', `data:image/png;base64,${base64}`);
      form.append('language', 'eng');
      form.append('isOverlayRequired', 'false');

      const response = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        headers: {
          apikey: this.apiKey,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: form.toString()
      });

      const data: any = await response.json();

      if (data?.IsErroredOnProcessing) {
        return { error: data?.ErrorMessage?.[0] ?? 'OCR.space service returned an error.' };
      }

      const parsedText = data?.ParsedResults?.map((item: any) => item.ParsedText).join('\n') ?? '';
      return { text: parsedText || 'No text found in image.' };
    } catch (error) {
      return { error: 'OCR request failed. Check server logs and API key.' };
    }
  }
}
