import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common'; // Import the ValidationPipe
import * as dotenv from 'dotenv';
import { HttpExceptionFilter } from './utils/createResponse'; // Your custom exception filter

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      '*',
      'https://73fd-2405-4800-5716-1560-f510-80e4-a4dd-d086.ngrok-free.app'
    ], // Specify exact origins
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept',
    credentials: true,
    exposedHeaders: 'x-custom-header',
    maxAge: 3600
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
  await app.listen(process.env.PORT ?? 2610);
}

bootstrap();
