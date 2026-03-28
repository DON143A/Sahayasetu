import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { databaseConfig, s3Config, jwtConfig, appConfig } from '@sahayasetu/config';
import { MediaController } from './media/media.controller';
import { MediaService } from './media/media.service';
import { MediaFile, MediaFileSchema } from './media/entities/media.entity';
import { S3Service } from './storage/s3.service';
import { VerificationService } from './verification/verification.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, s3Config, jwtConfig, appConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('database.mongodb.uri'),
      }),
    }),
    MongooseModule.forFeature([{ name: MediaFile.name, schema: MediaFileSchema }]),
    MulterModule.register({ storage: memoryStorage() }),
  ],
  controllers: [MediaController],
  providers: [MediaService, S3Service, VerificationService],
})
export class AppModule {}
