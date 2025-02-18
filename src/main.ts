import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common'; // Import the ValidationPipe
import * as dotenv from 'dotenv';
import { HttpExceptionFilter } from './utils/createResponse'; // Your custom exception filter
import { Server } from 'socket.io';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
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

  const server = app.getHttpServer();
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });
  console.log('clg check ws server', io);

  // Start the server
  await app.listen(process.env.PORT ?? 2610);
  console.log('Server running on port 3000');
  console.log('WebSocket server initialized');
}

bootstrap();
