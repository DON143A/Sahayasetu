import {
  Controller, Post, Get, Patch, Body, Req, UseGuards,
  HttpCode, HttpStatus, Delete, Param, Query,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiBearerAuth, ApiResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import {
  SendOtpDto, VerifyOtpDto, RegisterDto, LoginDto,
  RefreshTokenDto, UpdateProfileDto, UpdateFcmTokenDto,
} from './dto/auth.dto';
import { JwtAuthGuard, RolesGuard, Roles } from './guards/auth.guard';
import { UserRole } from '@sahayasetu/types';
import { Request } from 'express';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── OTP ───────────────────────────────────────────────────────────────────

  @Post('otp/send')
  @Throttle({ short: { limit: 1, ttl: 60000 } })
  @ApiOperation({ summary: 'Send OTP to phone number' })
  @HttpCode(HttpStatus.OK)
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  @Post('otp/verify')
  @Throttle({ short: { limit: 5, ttl: 300000 } })
  @ApiOperation({ summary: 'Verify OTP and login / auto-register' })
  @HttpCode(HttpStatus.OK)
  loginWithOtp(@Body() dto: VerifyOtpDto, @Req() req: Request) {
    return this.authService.loginWithOtp(
      dto,
      req.headers['user-agent'],
      req.ip,
    );
  }

  // ── Password ──────────────────────────────────────────────────────────────

  @Post('register')
  @ApiOperation({ summary: 'Register with name, phone and password' })
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto, req.headers['user-agent'], req.ip);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with phone and password' })
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, req.headers['user-agent'], req.ip);
  }

  // ── Token ─────────────────────────────────────────────────────────────────

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.authService.refresh(dto, req.headers['user-agent']);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Req() req: any) {
    return this.authService.logout(req.user.id);
  }

  // ── Profile ───────────────────────────────────────────────────────────────

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  getMe(@Req() req: any) {
    return this.authService.getProfile(req.user.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update profile' })
  updateMe(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.id, dto);
  }

  @Patch('me/fcm-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  updateFcmToken(@Req() req: any, @Body() dto: UpdateFcmTokenDto) {
    return this.authService.updateFcmToken(req.user.id, dto);
  }

  // ── Admin ─────────────────────────────────────────────────────────────────

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all users (admin)' })
  getAllUsers(@Query('role') role?: UserRole) {
    return this.authService.getAllUsers(role);
  }

  @Patch('users/:id/suspend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  suspendUser(@Param('id') id: string) {
    return this.authService.suspendUser(id);
  }
}
