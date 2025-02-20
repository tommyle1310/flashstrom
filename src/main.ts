import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common'; // Import the ValidationPipe
import * as dotenv from 'dotenv';
import { HttpExceptionFilter } from './utils/createResponse'; // Your custom exception filter

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Add this line for debug logging
  app.useLogger(['debug', 'error', 'log', 'verbose', 'warn']);

  app.enableCors({
    origin: ['*', 'localhost:1310'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  });

  // Use the ValidationPipe globally with the whitelist option
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Automatically remove properties that do not exist in the DTO
      forbidNonWhitelisted: true, // Throw an error if there are non-whitelisted properties
      transform: true // Automatically transform payloads to the DTO class type
    })
  );

  // Register the custom HttpExceptionFilter globally
  app.useGlobalFilters(new HttpExceptionFilter());

  // Start the server
  await app.listen(process.env.PORT ?? 1310);
  console.log('🚀 Server running on port', process.env.PORT ?? 1310);
}

bootstrap();
