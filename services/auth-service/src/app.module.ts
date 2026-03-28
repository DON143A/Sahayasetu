import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { databaseConfig, jwtConfig, appConfig } from '@sahayasetu/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OtpModule } from './otp/otp.module';
import { HealthModule } from './health/health.module';
import { User } from './users/entities/user.entity';
import { RefreshToken } from './tokens/refresh-token.entity';
import { OtpRecord } from './otp/otp.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, appConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('database.postgres.host'),
        port: config.get('database.postgres.port'),
        username: config.get('database.postgres.username'),
        password: config.get('database.postgres.password'),
        database: config.get('database.postgres.database'),
        entities: [User, RefreshToken, OtpRecord],
        synchronize: config.get('database.postgres.synchronize'),
        logging: config.get('database.postgres.logging'),
        ssl: process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false,
      }),
    }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 5 },
      { name: 'medium', ttl: 10000, limit: 20 },
      { name: 'long', ttl: 60000, limit: 100 },
    ]),
    AuthModule,
    UsersModule,
    OtpModule,
    HealthModule,
  ],
})
export class AppModule {}
