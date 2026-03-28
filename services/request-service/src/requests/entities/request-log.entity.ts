import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { RequestStatus } from '@sahayasetu/types';
import { HelpRequest } from './request.entity';

@Entity('request_logs')
export class RequestLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  requestId: string;

  @ManyToOne(() => HelpRequest, (r) => r.logs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requestId' })
  request: HelpRequest;

  @Column({ length: 100 })
  action: string;

  @Column({ type: 'enum', enum: RequestStatus, nullable: true })
  fromStatus?: RequestStatus;

  @Column({ type: 'enum', enum: RequestStatus, nullable: true })
  toStatus?: RequestStatus;

  @Column()
  performedBy: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @CreateDateColumn()
  createdAt: Date;
}
