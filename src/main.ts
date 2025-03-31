import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { HttpExceptionFilter } from './utils/createResponse';

dotenv.config();

// Khởi tạo app
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Logger
  app.useLogger(['debug', 'error', 'log', 'verbose', 'warn']);

  // CORS
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders:
      'Content-Type, Accept, Authorization, ngrok-skip-browser-warning, X-Content-Type-Options',
    credentials: true
  });

  // Middleware
  app.use((req, res, next) => {
    res.setHeader('ngrok-skip-browser-warning', 'true');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });

  // Global Pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  // Global Filters
  app.useGlobalFilters(new HttpExceptionFilter());

  return app; // Trả về app thay vì listen
}

// Xuất handler cho Vercel
module.exports = async (req, res) => {
  const app = await bootstrap();
  await app.init(); // Khởi tạo app mà không listen
  const expressApp = app.getHttpAdapter().getInstance();
  return expressApp(req, res); // Xử lý request kiểu serverless
};
