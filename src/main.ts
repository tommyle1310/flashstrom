// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { HttpExceptionFilter } from './utils/createResponse';
import { NestExpressApplication } from '@nestjs/platform-express';
import { resolve } from 'path';
import { PermissionFilter } from './filters/permission.filter';
import * as hbs from 'hbs';

dotenv.config();
console.log('JWT_SECRET:', process.env.JWT_SECRET);

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useLogger(['debug', 'error', 'log', 'verbose', 'warn']);
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:1310'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Authorization',
      'auth',
      'ngrok-skip-browser-warning',
      'X-Content-Type-Options'
    ],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
  });

  // Middleware to handle content types
  app.use((req, res, next) => {
    // Don't set JSON headers for HTML pages
    if (
      req.path.startsWith('/auth/reset-password') ||
      req.path.startsWith('/auth/change-password-success')
    ) {
      res.setHeader('Content-Type', 'text/html');
      next();
      return;
    }

    // Set JSON headers for API routes
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
  app.useGlobalFilters(new PermissionFilter());
  app.useGlobalFilters(new HttpExceptionFilter());

  // Use an absolute path to src/views
  const viewsPath = resolve(__dirname, '..', 'src', 'views');
  console.log('Views directory:', viewsPath);
  app.setBaseViewsDir(viewsPath);
  app.setViewEngine('hbs');
  app.engine('hbs', hbs.__express);

  await app.listen(process.env.PORT ?? 1310);
  console.log('🚀 Server running on port', process.env.PORT ?? 1310);
}

bootstrap();
