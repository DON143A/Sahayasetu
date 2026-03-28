import {
  Injectable, ConflictException, UnauthorizedException,
  NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { OtpService } from '../otp/otp.service';
import { TokenService } from '../tokens/token.service';
import {
  RegisterDto, LoginDto, VerifyOtpDto, SendOtpDto,
  RefreshTokenDto, UpdateProfileDto, UpdateFcmTokenDto,
} from './dto/auth.dto';
import { AuthTokens, UserRole, UserStatus } from '@sahayasetu/types';
import { hashPassword, comparePassword } from '@sahayasetu/utils';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly otpService: OtpService,
    private readonly tokenService: TokenService,
  ) {}

  // ── OTP Flow ──────────────────────────────────────────────────────────────

  async sendOtp(dto: SendOtpDto) {
    return this.otpService.sendOtp(dto.phone);
  }

  async loginWithOtp(
    dto: VerifyOtpDto,
    userAgent?: string,
    ip?: string,
  ): Promise<{ tokens: AuthTokens; user: Partial<User>; isNewUser: boolean }> {
    await this.otpService.verifyOtp(dto.phone, dto.code);

    let user = await this.userRepo.findOne({ where: { phone: dto.phone } });
    let isNewUser = false;

    if (!user) {
      // Auto-register on first login
      user = this.userRepo.create({
        phone: dto.phone,
        name: 'New User',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        isPhoneVerified: true,
      });
      await this.userRepo.save(user);
      isNewUser = true;
      this.logger.log(`New user registered via OTP: ${dto.phone}`);
    } else {
      user.isPhoneVerified = true;
      user.lastLoginAt = new Date();
      await this.userRepo.save(user);
    }

    const tokens = await this.tokenService.issueTokens(user, userAgent, ip);
    return { tokens, user: this.sanitizeUser(user), isNewUser };
  }

  // ── Password Flow ─────────────────────────────────────────────────────────

  async register(
    dto: RegisterDto,
    userAgent?: string,
    ip?: string,
  ): Promise<{ tokens: AuthTokens; user: Partial<User> }> {
    const existing = await this.userRepo.findOne({
      where: { phone: dto.phone },
    });
    if (existing) throw new ConflictException('Phone number already registered');

    if (dto.email) {
      const emailExists = await this.userRepo.findOne({
        where: { email: dto.email },
      });
      if (emailExists) throw new ConflictException('Email already registered');
    }

    const passwordHash = dto.password
      ? await hashPassword(dto.password)
      : undefined;

    const user = this.userRepo.create({
      name: dto.name,
      phone: dto.phone,
      email: dto.email,
      passwordHash,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
    });
    await this.userRepo.save(user);

    const tokens = await this.tokenService.issueTokens(user, userAgent, ip);
    return { tokens, user: this.sanitizeUser(user) };
  }

  async login(
    dto: LoginDto,
    userAgent?: string,
    ip?: string,
  ): Promise<{ tokens: AuthTokens; user: Partial<User> }> {
    const user = await this.userRepo.findOne({
      where: { phone: dto.phone },
      select: [
        'id', 'name', 'phone', 'email', 'role', 'status',
        'avatar', 'passwordHash', 'isPhoneVerified',
      ],
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (user.status !== UserStatus.ACTIVE)
      throw new UnauthorizedException('Account is suspended');
    if (!user.passwordHash)
      throw new BadRequestException('Please login using OTP');

    const isMatch = await comparePassword(dto.password, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    user.lastLoginAt = new Date();
    await this.userRepo.save(user);

    const tokens = await this.tokenService.issueTokens(user, userAgent, ip);
    return { tokens, user: this.sanitizeUser(user) };
  }

  async refresh(dto: RefreshTokenDto, userAgent?: string): Promise<AuthTokens> {
    return this.tokenService.refreshTokens(dto.refreshToken, userAgent);
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await this.tokenService.revokeAllUserTokens(userId);
    }
  }

  // ── Profile ───────────────────────────────────────────────────────────────

  async getProfile(userId: string): Promise<Partial<User>> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return this.sanitizeUser(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<Partial<User>> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.email && dto.email !== user.email) {
      const existing = await this.userRepo.findOne({
        where: { email: dto.email },
      });
      if (existing) throw new ConflictException('Email already in use');
    }

    Object.assign(user, dto);
    await this.userRepo.save(user);
    return this.sanitizeUser(user);
  }

  async updateFcmToken(userId: string, dto: UpdateFcmTokenDto): Promise<void> {
    const update = dto.platform === 'ios'
      ? { apnsToken: dto.fcmToken }
      : { fcmToken: dto.fcmToken };
    await this.userRepo.update(userId, update);
  }

  // ── Admin ─────────────────────────────────────────────────────────────────

  async getAllUsers(role?: UserRole): Promise<Partial<User>[]> {
    const where = role ? { role } : {};
    const users = await this.userRepo.find({ where, order: { createdAt: 'DESC' } });
    return users.map(this.sanitizeUser);
  }

  async suspendUser(userId: string): Promise<void> {
    await this.userRepo.update(userId, { status: UserStatus.SUSPENDED });
    await this.tokenService.revokeAllUserTokens(userId);
  }

  private sanitizeUser(user: User): Partial<User> {
    const { passwordHash, ...safe } = user as User & { passwordHash?: string };
    return safe;
  }
}
