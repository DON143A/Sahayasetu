import {
  Injectable, BadRequestException, NotFoundException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { OtpRecord } from './otp.entity';
import { generateOtp, addMinutes, isExpired } from '@sahayasetu/utils';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly MAX_ATTEMPTS = 3;
  private readonly OTP_EXPIRY_MINUTES: number;

  constructor(
    @InjectRepository(OtpRecord)
    private readonly otpRepo: Repository<OtpRecord>,
    private readonly configService: ConfigService,
  ) {
    this.OTP_EXPIRY_MINUTES = this.configService.get<number>('jwt.otpExpiry') ?? 10;
  }

  async sendOtp(phone: string): Promise<{ message: string; expiresIn: number }> {
    // Invalidate existing OTPs for this phone
    await this.otpRepo.update({ phone, isUsed: false }, { isUsed: true });

    const code = generateOtp(6);
    const expiresAt = addMinutes(new Date(), this.OTP_EXPIRY_MINUTES);

    await this.otpRepo.save(
      this.otpRepo.create({ phone, code, expiresAt }),
    );

    // In production: send via Twilio/AWS SNS
    if (process.env.NODE_ENV === 'development') {
      this.logger.log(`[DEV] OTP for ${phone}: ${code}`);
    } else {
      await this.sendViaSms(phone, code);
    }

    return {
      message: 'OTP sent successfully',
      expiresIn: this.OTP_EXPIRY_MINUTES * 60,
    };
  }

  async verifyOtp(phone: string, code: string): Promise<boolean> {
    const record = await this.otpRepo.findOne({
      where: {
        phone,
        isUsed: false,
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });

    if (!record) {
      throw new NotFoundException('OTP not found or expired. Please request a new one.');
    }

    if (record.attempts >= this.MAX_ATTEMPTS) {
      record.isUsed = true;
      await this.otpRepo.save(record);
      throw new BadRequestException('Too many failed attempts. Please request a new OTP.');
    }

    if (record.code !== code) {
      record.attempts += 1;
      await this.otpRepo.save(record);
      throw new BadRequestException(
        `Invalid OTP. ${this.MAX_ATTEMPTS - record.attempts} attempts remaining.`,
      );
    }

    record.isUsed = true;
    await this.otpRepo.save(record);
    return true;
  }

  private async sendViaSms(phone: string, code: string): Promise<void> {
    try {
      const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
      const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
      const fromPhone = this.configService.get<string>('TWILIO_PHONE_NUMBER');

      if (!accountSid || !authToken) {
        this.logger.warn('Twilio credentials not configured');
        return;
      }

      const twilio = require('twilio')(accountSid, authToken);
      await twilio.messages.create({
        body: `Your SahayaSetu OTP is: ${code}. Valid for ${this.OTP_EXPIRY_MINUTES} minutes. Do not share this code.`,
        from: fromPhone,
        to: phone,
      });
    } catch (error) {
      this.logger.error(`Failed to send OTP SMS: ${error.message}`);
      throw new BadRequestException('Failed to send OTP. Please try again.');
    }
  }
}
