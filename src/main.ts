import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Danh sách origin được phép, phân tách bằng dấu phẩy. Mặc định là Vite dev server.
  const origins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({ origin: origins });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Các nền tảng hosting inject PORT và yêu cầu bind 0.0.0.0.
  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`Backend running on port ${port}`);
}

void bootstrap();
