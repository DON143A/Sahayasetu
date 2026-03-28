import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect,
  MessageBody, ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SocketEvent } from '@sahayasetu/types';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/requests',
})
export class RequestEventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RequestEventsGateway.name);
  private connectedClients = new Map<string, string>(); // socketId -> userId

  afterInit(server: Server) {
    this.logger.log('WebSocket gateway initialized');
  }

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      this.connectedClients.set(client.id, userId);
      client.join(`user:${userId}`);
      this.logger.log(`Client connected: ${client.id} (user: ${userId})`);
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ── Subscribe to request room ──────────────────────────────────────────────

  @SubscribeMessage('join:request')
  handleJoinRequest(
    @MessageBody() data: { requestId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`request:${data.requestId}`);
    return { event: 'joined', data: { room: `request:${data.requestId}` } };
  }

  @SubscribeMessage('leave:request')
  handleLeaveRequest(
    @MessageBody() data: { requestId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`request:${data.requestId}`);
  }

  // Agent live location broadcast
  @SubscribeMessage('agent:location')
  handleAgentLocation(
    @MessageBody() data: { requestId: string; latitude: number; longitude: number },
    @ConnectedSocket() client: Socket,
  ) {
    this.server.to(`request:${data.requestId}`).emit(SocketEvent.AGENT_LOCATION, {
      latitude: data.latitude,
      longitude: data.longitude,
      timestamp: new Date(),
    });
  }

  // ── Domain event listeners ────────────────────────────────────────────────

  @OnEvent('request.created')
  handleRequestCreated(request: any) {
    // Notify admins
    this.server.emit(SocketEvent.REQUEST_CREATED, {
      id: request.id,
      requestNumber: request.requestNumber,
      priority: request.priority,
      category: request.category,
    });
  }

  @OnEvent('request.statusChanged')
  handleStatusChanged({ request, fromStatus }: any) {
    // Notify request participants
    this.server
      .to(`request:${request.id}`)
      .to(`user:${request.userId}`)
      .emit(SocketEvent.REQUEST_UPDATED, {
        id: request.id,
        status: request.status,
        fromStatus,
        updatedAt: request.updatedAt,
      });
  }

  @OnEvent('request.assigned')
  handleRequestAssigned({ request, agentId }: any) {
    // Notify the assigned agent
    this.server.to(`user:${agentId}`).emit(SocketEvent.REQUEST_ASSIGNED, {
      id: request.id,
      requestNumber: request.requestNumber,
      location: request.location,
      priority: request.priority,
    });
    // Notify the user
    this.server.to(`user:${request.userId}`).emit(SocketEvent.REQUEST_UPDATED, {
      id: request.id,
      status: request.status,
    });
  }
}
