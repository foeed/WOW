import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: '*' });
  await app.listen(process.env.PORT ? parseInt(process.env.PORT, 10) : 3333);
  console.log('Nest API running on port', process.env.PORT ?? 3333);
}
bootstrap();
