import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway()
export class BidsGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('bid')
  handleBid(@MessageBody() data: any): void {
    console.log({ socket: data });

    this.server.emit('bid', data);
  }
}
