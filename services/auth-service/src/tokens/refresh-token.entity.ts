import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from '../users/entities/user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  token: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.refreshTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ default: false })
  isRevoked: boolean;

  @Column()
  expiresAt: Date;

  @Column({ nullable: true })
  userAgent?: string;

  @Column({ nullable: true })
  ipAddress?: string;

  @CreateDateColumn()
  createdAt: Date;
}
