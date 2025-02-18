// filepath: /e:/Afinalproject/backend/flashstrom-backend/src/orders/orders.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

@WebSocketGateway({
  cors: {
    origin: '*' // Or your specific frontend URL
  }
})
export class OrdersGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly ordersService: OrdersService) {}

  @SubscribeMessage('createOrder')
  async handleCreateOrder(@MessageBody() createOrderDto: CreateOrderDto) {
    const order = await this.ordersService.createOrder(createOrderDto);
    this.server.emit('orderCreated', order);
    return order;
  }
}
