import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

@Entity('chat_messages')
@Index(['requestId', 'createdAt'])
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  requestId: string;

  @Column()
  senderId: string;

  @Column({ length: 20 })
  senderRole: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ nullable: true })
  mediaUrl?: string;

  @CreateDateColumn()
  createdAt: Date;
}
