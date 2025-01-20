import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';  // Import the ValidationPipe
import * as dotenv from 'dotenv';
import { HttpExceptionFilter } from './utils/createResponse';  // Your custom exception filter

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',  // You can specify allowed origins here, for example, 'http://localhost:3000'
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',  // Allowed HTTP methods
    allowedHeaders: 'Content-Type, Accept',  // Allowed headers
    credentials: true,  // Allow credentials (cookies, authorization headers)
  });


  // Use the ValidationPipe globally with the whitelist option
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,  // Automatically remove properties that do not exist in the DTO
      forbidNonWhitelisted: true,  // Throw an error if there are non-whitelisted properties
      transform: true,  // Automatically transform payloads to the DTO class type
    }),
  );

  // Register the custom HttpExceptionFilter globally
  app.useGlobalFilters(new HttpExceptionFilter());

  // Start the server
  await app.listen(process.env.PORT ?? 2610);
}

bootstrap();
