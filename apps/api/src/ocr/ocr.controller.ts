import { Body, Controller, Post } from '@nestjs/common';
import { OcrRequestDto } from './dto/ocr-request.dto';
import { OcrService } from './ocr.service';

@Controller('ocr')
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  @Post()
  async scanImage(@Body() body: OcrRequestDto) {
    return this.ocrService.parseImage(body.image);
  }
}
