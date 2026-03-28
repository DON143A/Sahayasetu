import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { OtpService } from '../otp/otp.service';
import { TokenService } from '../tokens/token.service';
import { User } from '../users/entities/user.entity';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { UserRole, UserStatus } from '@sahayasetu/types';

const mockUser: Partial<User> = {
  id: 'test-uuid-1',
  name: 'Test User',
  phone: '+919876543210',
  role: UserRole.USER,
  status: UserStatus.ACTIVE,
  isPhoneVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: jest.Mocked<Repository<User>>;
  let otpService: jest.Mocked<OtpService>;
  let tokenService: jest.Mocked<TokenService>;

  beforeEach(async () => {
    const mockUserRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      find: jest.fn(),
    };

    const mockOtpService = {
      sendOtp: jest.fn(),
      verifyOtp: jest.fn(),
    };

    const mockTokenService = {
      issueTokens: jest.fn(),
      revokeAllUserTokens: jest.fn(),
      refreshTokens: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: OtpService, useValue: mockOtpService },
        { provide: TokenService, useValue: mockTokenService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepo = module.get(getRepositoryToken(User));
    otpService = module.get(OtpService);
    tokenService = module.get(TokenService);
  });

  // ── sendOtp ───────────────────────────────────────────────────────────────

  describe('sendOtp', () => {
    it('should delegate to OtpService', async () => {
      otpService.sendOtp.mockResolvedValue({ message: 'OTP sent', expiresIn: 600 });
      const result = await service.sendOtp({ phone: '+919876543210' });
      expect(otpService.sendOtp).toHaveBeenCalledWith('+919876543210');
      expect(result.message).toBe('OTP sent');
    });
  });

  // ── loginWithOtp ──────────────────────────────────────────────────────────

  describe('loginWithOtp', () => {
    it('should return tokens for existing user', async () => {
      otpService.verifyOtp.mockResolvedValue(true);
      userRepo.findOne.mockResolvedValue(mockUser as User);
      userRepo.save.mockResolvedValue(mockUser as User);
      tokenService.issueTokens.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
      });

      const result = await service.loginWithOtp({
        phone: '+919876543210',
        code: '123456',
      });

      expect(otpService.verifyOtp).toHaveBeenCalledWith('+919876543210', '123456');
      expect(result.isNewUser).toBe(false);
      expect(result.tokens.accessToken).toBe('access-token');
    });

    it('should auto-register new users on first OTP login', async () => {
      otpService.verifyOtp.mockResolvedValue(true);
      userRepo.findOne.mockResolvedValue(null);
      userRepo.create.mockReturnValue(mockUser as User);
      userRepo.save.mockResolvedValue(mockUser as User);
      tokenService.issueTokens.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
      });

      const result = await service.loginWithOtp({
        phone: '+919876543210',
        code: '123456',
      });

      expect(result.isNewUser).toBe(true);
    });
  });

  // ── register ──────────────────────────────────────────────────────────────

  describe('register', () => {
    it('should throw ConflictException if phone already exists', async () => {
      userRepo.findOne.mockResolvedValue(mockUser as User);

      await expect(
        service.register({
          name: 'Test',
          phone: '+919876543210',
          password: 'Password@123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create user and return tokens', async () => {
      userRepo.findOne.mockResolvedValue(null);
      userRepo.create.mockReturnValue(mockUser as User);
      userRepo.save.mockResolvedValue(mockUser as User);
      tokenService.issueTokens.mockResolvedValue({
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresIn: 900,
      });

      const result = await service.register({
        name: 'New User',
        phone: '+919876543210',
        password: 'Password@123',
      });

      expect(userRepo.save).toHaveBeenCalled();
      expect(result.tokens.accessToken).toBe('token');
    });
  });

  // ── login ─────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('should throw UnauthorizedException for invalid credentials', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.login({ phone: '+919876543210', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── suspendUser ───────────────────────────────────────────────────────────

  describe('suspendUser', () => {
    it('should update user status and revoke tokens', async () => {
      userRepo.update = jest.fn().mockResolvedValue({ affected: 1 });
      tokenService.revokeAllUserTokens.mockResolvedValue(undefined);

      await service.suspendUser('test-uuid-1');

      expect(userRepo.update).toHaveBeenCalledWith('test-uuid-1', {
        status: UserStatus.SUSPENDED,
      });
      expect(tokenService.revokeAllUserTokens).toHaveBeenCalledWith('test-uuid-1');
    });
  });
});
