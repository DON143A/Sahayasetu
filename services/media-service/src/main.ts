import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('MediaService');
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: '*', credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  if (process.env.NODE_ENV !== 'production') {
    const cfg = new DocumentBuilder()
      .setTitle('SahayaSetu — Media Service')
      .setDescription('File upload, storage and verification')
      .setVersion('1.0').addBearerAuth().build();
    SwaggerModule.setup('api/v1/docs', app, SwaggerModule.createDocument(app, cfg));
  }

  await app.listen(process.env.PORT || 3003);
  logger.log(`Media service running on port ${process.env.PORT || 3003}`);
}
bootstrap();
