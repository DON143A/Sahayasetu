import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('RequestService');
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: process.env.CORS_ORIGINS?.split(',') || ['*'], credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('SahayaSetu — Request Service')
      .setDescription('Help Request Management API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/v1/docs', app, SwaggerModule.createDocument(app, config));
  }

  const port = process.env.PORT || 3002;
  await app.listen(port);
  logger.log(`Request service running on port ${port}`);
}
bootstrap();
