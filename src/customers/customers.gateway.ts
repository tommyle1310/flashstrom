import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CustomersService } from './customers.service';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { OnEvent } from '@nestjs/event-emitter';

@WebSocketGateway({
  namespace: 'customer',
  cors: {
    origin: ['*', process.env.FULL_BACKEND_URL],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket']
})
export class CustomersGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly customersService: CustomersService) {}

  handleConnection(client: Socket) {
    // console.log('⚡️ Client connected to customer namespace:', client.id);
  }
  @SubscribeMessage('joinRoomCustomer')
  handleJoinRoom(client: Socket, data: any) {
    const customerId =
      typeof data === 'string' ? data : data?.channel || data?._id || data;

    try {
      client.join(`customer_${customerId}`);
      console.log(`customer_${customerId} joined`);

      return {
        event: 'joinRoomCustomer',
        data: `Joined customer_${customerId}`
      };
    } catch (error) {
      console.error('❌ Error joining room:', error);
      return {
        event: 'error',
        data: 'Failed to join room'
      };
    }
  }

  @OnEvent('orderTrackingUpdate')
  async handleOrderTrackingUpdate(@MessageBody() order: any) {
    console.log('Received orderTrackingUpdate in customer event:', order);
    // Return the response that will be visible in Postman
    return {
      event: 'orderTrackingUpdate',
      data: order,
      message: `orderTrackingUpdate: ${order}`
    };
  }
  @OnEvent('listenUpdateOrderTracking')
  async handleListenUpdateOrderTracking(@MessageBody() order: any) {
    console.log(
      'Received listenUpdateOrderTracking in customer event to',
      `customer_${order.customer_id}`
    );
    await this.server
      .to(`customer_${order.customer_id}`)
      .emit('orderTrackingUpdate', {
        event: 'orderTrackingUpdate',
        data: order,
        message: 'Order received successfully'
      });
    // Return the response that will be visible in Postman
    return {
      event: 'listenUpdateOrderTracking',
      data: order,
      message: `listenUpdateOrderTracking ${order}`
    };
  }
}
