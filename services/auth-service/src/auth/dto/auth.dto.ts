import {
  IsString, IsPhoneNumber, IsEmail, IsOptional,
  IsEnum, MinLength, MaxLength, Length, IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@sahayasetu/types';

export class SendOtpDto {
  @ApiProperty({ example: '+919876543210' })
  @IsPhoneNumber()
  phone: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '+919876543210' })
  @IsPhoneNumber()
  phone: string;

  @ApiProperty({ example: '123456' })
  @Length(6, 6)
  @IsString()
  code: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'Arjun Kumar' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: '+919876543210' })
  @IsPhoneNumber()
  phone: string;

  @ApiPropertyOptional({ example: 'arjun@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'SecurePass@123' })
  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string;
}

export class LoginDto {
  @ApiProperty({ example: '+919876543210' })
  @IsPhoneNumber()
  phone: string;

  @ApiProperty({ example: 'SecurePass@123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Arjun Kumar' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'arjun@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class UpdateFcmTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fcmToken: string;

  @ApiPropertyOptional({ enum: ['android', 'ios'] })
  @IsString()
  @IsOptional()
  platform?: 'android' | 'ios';
}

export class AdminCreateUserDto extends RegisterDto {
  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;
}
