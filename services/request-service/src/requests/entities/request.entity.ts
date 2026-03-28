import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index, OneToMany,
} from 'typeorm';
import {
  RequestStatus, RequestPriority, RequestCategory, GpsLocation,
} from '@sahayasetu/types';
import { RequestLog } from './request-log.entity';

@Entity('help_requests')
@Index(['status', 'priority'])
@Index(['userId'])
@Index(['assignedAgentId'])
export class HelpRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 30 })
  requestNumber: string;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: RequestCategory, default: RequestCategory.OTHER })
  category: RequestCategory;

  @Column({ type: 'enum', enum: RequestPriority, default: RequestPriority.MEDIUM })
  priority: RequestPriority;

  @Column({ type: 'enum', enum: RequestStatus, default: RequestStatus.PENDING })
  status: RequestStatus;

  @Column({ type: 'jsonb' })
  location: GpsLocation;

  @Column({ nullable: true, length: 500 })
  address?: string;

  @Index()
  @Column()
  userId: string;

  @Column({ nullable: true })
  assignedAgentId?: string;

  @Column({ type: 'text', array: true, default: [] })
  mediaIds: string[];

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  rating?: number;

  @Column({ type: 'text', nullable: true })
  ratingComment?: string;

  @Column({ type: 'text', nullable: true })
  rejectionReason?: string;

  @Column({ nullable: true })
  completedAt?: Date;

  @Column({ nullable: true })
  assignedAt?: Date;

  @OneToMany(() => RequestLog, (log) => log.request, { cascade: true })
  logs: RequestLog[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
