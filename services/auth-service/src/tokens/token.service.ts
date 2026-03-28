import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtPayload, AuthTokens } from '@sahayasetu/types';
import { RefreshToken } from './refresh-token.entity';
import { User } from '../users/entities/user.entity';
import { addMinutes } from '@sahayasetu/utils';
import * as crypto from 'crypto';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly tokenRepo: Repository<RefreshToken>,
  ) {}

  async issueTokens(
    user: User,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      phone: user.phone,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('jwt.accessExpiry'),
    });

    const refreshToken = crypto.randomBytes(64).toString('hex');
    const expiresIn = 7 * 24 * 60; // 7 days in minutes

    const tokenRecord = this.tokenRepo.create({
      token: refreshToken,
      userId: user.id,
      expiresAt: addMinutes(new Date(), expiresIn),
      userAgent,
      ipAddress,
    });

    await this.tokenRepo.save(tokenRecord);

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  async refreshTokens(
    refreshToken: string,
    userAgent?: string,
  ): Promise<AuthTokens> {
    const record = await this.tokenRepo.findOne({
      where: { token: refreshToken, isRevoked: false },
      relations: ['user'],
    });

    if (!record) throw new UnauthorizedException('Invalid refresh token');
    if (record.expiresAt < new Date()) {
      await this.tokenRepo.update(record.id, { isRevoked: true });
      throw new UnauthorizedException('Refresh token expired');
    }

    // Revoke old token (rotation)
    await this.tokenRepo.update(record.id, { isRevoked: true });

    return this.issueTokens(record.user, userAgent);
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.tokenRepo.update({ userId, isRevoked: false }, { isRevoked: true });
  }

  async cleanExpiredTokens(): Promise<void> {
    const result = await this.tokenRepo.delete({
      expiresAt: LessThan(new Date()),
    });
    this.logger.log(`Cleaned ${result.affected} expired tokens`);
  }
}
