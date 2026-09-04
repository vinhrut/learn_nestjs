import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS configuration - allow multiple origins
  const allowedOrigins = [
    'http://localhost:5173', // Local development
    'http://localhost:4173', // Vite preview
    'https://learnnest-client.vercel.app', // Production Vercel
  ];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0'); // bind 0.0.0.0 cho hosting (Render)

  console.log(`Backend running at http://localhost:${port}`);
}

void bootstrap();
