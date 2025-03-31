import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { HttpExceptionFilter } from './utils/createResponse';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useLogger(['debug', 'error', 'log', 'verbose', 'warn']);
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders:
      'Content-Type, Accept, Authorization, ngrok-skip-browser-warning, X-Content-Type-Options',
    credentials: true
  });
  app.use((req, res, next) => {
    res.setHeader('ngrok-skip-browser-warning', 'true');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(process.env.PORT ?? 1310);
  console.log('🚀 Server running on port', process.env.PORT ?? 1310);
}

bootstrap();
