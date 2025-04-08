// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { HttpExceptionFilter } from './utils/createResponse';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join, resolve } from 'path';
import { PermissionFilter } from './filters/permission.filter';

dotenv.config();
console.log('JWT_SECRET:', process.env.JWT_SECRET);

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useLogger(['debug', 'error', 'log', 'verbose', 'warn']);
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders:
      'Content-Type, Accept, Authorization, ngrok-skip-browser-warning, X-Content-Type-Options',
    credentials: true
  });
  app.use((req, res, next) => {
    if (!req.path.startsWith('/auth/reset-password')) {
      res.setHeader('ngrok-skip-browser-warning', 'true');
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
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
  app.useGlobalFilters(new PermissionFilter());

  // Use an absolute path to src/views
  const viewsPath = resolve(__dirname, '..', 'src', 'views');
  console.log('Views directory:', viewsPath); // Log the path for debugging
  app.setBaseViewsDir(viewsPath);
  app.setViewEngine('hbs');

  await app.listen(process.env.PORT ?? 1310);
  console.log('🚀 Server running on port', process.env.PORT ?? 1310);
}

bootstrap();
