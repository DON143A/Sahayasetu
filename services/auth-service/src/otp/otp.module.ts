import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OtpService } from './otp.service';
import { OtpRecord } from './otp.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OtpRecord])],
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule {}
