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

  // WARNING: This is a temporary solution for development only
  // Do not use '*' in production as it's a security risk
  app.enableCors({
     origin: [
    'https://www.aligner360.in', // ✅ production frontend
    'http://localhost:3000',     // ✅ for local development
  ],
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