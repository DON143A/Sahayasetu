import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  MessageBody, ConnectedSocket, OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from './chat-message.entity';
import { Logger } from '@nestjs/common';
import { SocketEvent } from '@sahayasetu/types';

interface SendMessagePayload {
  requestId: string;
  content: string;
  senderId: string;
  senderRole: string;
  mediaUrl?: string;
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    @InjectRepository(ChatMessage)
    private readonly msgRepo: Repository<ChatMessage>,
  ) {}

  handleConnection(client: Socket) {
    const requestId = client.handshake.query.requestId as string;
    if (requestId) client.join(`chat:${requestId}`);
  }

  @SubscribeMessage('chat:send')
  async handleMessage(
    @MessageBody() payload: SendMessagePayload,
    @ConnectedSocket() client: Socket,
  ) {
    const message = await this.msgRepo.save(
      this.msgRepo.create({
        requestId: payload.requestId,
        senderId: payload.senderId,
        senderRole: payload.senderRole,
        content: payload.content,
        mediaUrl: payload.mediaUrl,
      }),
    );

    this.server
      .to(`chat:${payload.requestId}`)
      .emit(SocketEvent.CHAT_MESSAGE, message);

    return message;
  }

  @SubscribeMessage('chat:history')
  async getHistory(@MessageBody() data: { requestId: string; page?: number }) {
    const messages = await this.msgRepo.find({
      where: { requestId: data.requestId },
      order: { createdAt: 'ASC' },
      take: 100,
    });
    return messages;
  }
}
