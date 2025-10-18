import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // Middleware
  app.use(cookieParser());
  app.setGlobalPrefix('api/v1');

  // ✅ Enable CORS (Nest handles OPTIONS internally)
  app.enableCors({
    origin: [
      'https://www.aligner360.in', // production frontend
      'https://aligner-360-admin-panel.vercel.app', // production admin panel
      'http://localhost:3000',     // local development frontend
      'http://localhost:3001',     // local development admin panel
      'http://localhost:3002',     // alternative local development
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  });

  // ✅ Global validation pipes
  app.useGlobalPipes(new ValidationPipe({ 
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true
  }));

  // ✅ Port configuration
  const port = configService.get<number>('PORT') || 8080;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
}

bootstrap();