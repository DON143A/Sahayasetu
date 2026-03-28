import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index, OneToMany,
} from 'typeorm';
import { UserRole, UserStatus } from '@sahayasetu/types';
import { Exclude } from 'class-transformer';
import { RefreshToken } from '../../tokens/refresh-token.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Index({ unique: true, where: '"email" IS NOT NULL' })
  @Column({ nullable: true, length: 255 })
  email?: string;

  @Index({ unique: true })
  @Column({ length: 20 })
  phone: string;

  @Exclude()
  @Column({ nullable: true, select: false })
  passwordHash?: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ nullable: true })
  avatar?: string;

  @Column({ nullable: true })
  fcmToken?: string;

  @Column({ nullable: true })
  apnsToken?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ default: false })
  isPhoneVerified: boolean;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ nullable: true })
  lastLoginAt?: Date;

  @OneToMany(() => RefreshToken, (token) => token.user, { cascade: true })
  refreshTokens: RefreshToken[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
