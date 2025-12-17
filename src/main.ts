import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Microbus Booking API')
    .setDescription('Enterprise-grade microbus station booking system with real-time seat management')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Routes', 'Route management')
    .addTag('Stations', 'Station management')
    .addTag('Sessions', 'Driver session management')
    .addTag('Bookings', 'Seat booking management')
    .addTag('Payments', 'Payment processing')
    .addTag('Payouts', 'Driver payout management')
    .addTag('Admin', 'Admin operations')
    .addTag('Notifications', 'User notifications')
    .addTag('Complaints', 'Complaint management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 5000;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://0.0.0.0:${port}`);
  console.log(`Swagger documentation: http://0.0.0.0:${port}/api/docs`);
}

bootstrap();
