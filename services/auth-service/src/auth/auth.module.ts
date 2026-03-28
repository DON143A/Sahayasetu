import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { OtpModule } from '../otp/otp.module';
import { TokenService } from '../tokens/token.service';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from '../tokens/refresh-token.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
        signOptions: { expiresIn: config.get<string>('jwt.accessExpiry') },
      }),
    }),
    OtpModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, TokenService],
  exports: [AuthService, JwtStrategy, TokenService],
})
export class AuthModule {}
