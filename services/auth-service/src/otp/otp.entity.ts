import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

@Entity('otp_records')
export class OtpRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ length: 20 })
  phone: string;

  @Column({ length: 6 })
  code: string;

  @Column({ default: false })
  isUsed: boolean;

  @Column()
  expiresAt: Date;

  @Column({ default: 0 })
  attempts: number;

  @CreateDateColumn()
  createdAt: Date;
}
