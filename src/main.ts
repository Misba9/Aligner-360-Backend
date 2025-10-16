import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  app.use(cookieParser());
  app.setGlobalPrefix('api/v1');

  const port = configService.get<number>('PORT') || 8080;

  app.enableCors({
    origin: [
      configService.get<string>('ADMIN_PANEL_URL') || '',
      configService.get<string>('FRONTEND_URL') || '',
      'http://localhost:3000',  // Admin panel local development
      'http://localhost:3001',  // Admin panel local development (fallback port)
      'http://localhost:3002',  // Frontend local development
    ].filter(Boolean),

    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Removes unknown properties
      forbidNonWhitelisted: false, // Optional: Set to true to throw an error for unknown properties
    }),
  );
  await app.listen(port);
  console.log(`Application is running on: ${port}`);
}

bootstrap();