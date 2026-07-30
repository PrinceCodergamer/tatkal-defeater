import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';
import { AdmissionService } from './admission.service';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/queue',
})
export class AdmissionGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly admissionService: AdmissionService,
  ) {}

  async handleConnection(client: Socket) {
    const tokenId = client.handshake.query.tokenId as string;
    if (!tokenId) {
      client.emit('error', 'No token provided');
      client.disconnect();
      return;
    }
    client.data.tokenId = tokenId;
  }

  handleDisconnect(_client: Socket) {}

  @SubscribeMessage('subscribe:position')
  async handlePositionSubscribe(client: Socket) {
    const tokenId = client.data.tokenId;

    // Send position updates every 500ms
    const interval = setInterval(async () => {
      const status = await this.admissionService.getQueueStatus(tokenId);

      client.emit('queue:update', {
        position: status.position,
        totalWaiting: status.totalWaiting,
        status: status.status,
      });

      // If admitted, clear interval and notify
      if (status.status === 'ADMITTED') {
        clearInterval(interval);
        client.emit('queue:admitted', {
          message: 'You are now admitted to book!',
        });
      }
    }, 500);

    client.on('disconnect', () => clearInterval(interval));
  }
}
