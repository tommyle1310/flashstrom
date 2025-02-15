import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { DriversService } from './drivers.service';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { RestaurantsService } from 'src/restaurants/restaurants.service';
import { forwardRef, Inject } from '@nestjs/common';

@WebSocketGateway()
export class DriversGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly restaurantsService: RestaurantsService,
    @Inject(forwardRef(() => DriversService))
    private readonly driverService: DriversService,
    private eventEmitter: EventEmitter2,
  ) {}

  afterInit(server: Server) {
    console.log('WebSocket Gateway initialized');

    // Set up the global listener just once
    this.server.on('assignOrderToDriver', (orderAssignment) => {
      const driverId = orderAssignment.driver_id;
      if (driverId) {
        this.server
          .to(driverId)
          .emit('incomingOrderForDriver', orderAssignment);
        console.log(
          'Forwarded order assignment to driver:',
          driverId,
          orderAssignment,
        );
      }
    });
  }

  // Handle new driver connections
  handleConnection(client: Socket) {
    console.log(`Driver connected: ${client.id}`);
  }

  // Handle driver disconnections
  handleDisconnect(client: Socket) {
    console.log(`Driver disconnected: ${client.id}`);
  }

  // Handle joining a specific room for the driver
  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, driverId: string) {
    client.join(driverId);
    console.log(`Driver ${driverId} joined room: ${driverId}`);
  }

  // Handle updating a driver's information
  @SubscribeMessage('updateDriver')
  async handleUpdateDriver(@MessageBody() updateDriverDto: UpdateDriverDto) {
    const driver = await this.driverService.update(
      updateDriverDto._id,
      updateDriverDto,
    );
    this.server.emit('driverUpdated', driver);
    return driver;
  }

  // Handle incoming order notification for drivers
  @SubscribeMessage('newOrderForDriver')
  async handleNewOrder(@MessageBody() order: any) {
    const driverId = order.driver_id; // Removed the 'await' as it's not needed here

    // Notify the specific driver about the new order
    this.server.to(driverId).emit('incomingOrderForDriver', order);
    console.log(
      'Emitted incomingOrderForDriver event to driver:',
      driverId,
      order,
    );

    return order;
  }

  @SubscribeMessage('assignOrderToDriver')
  async handleReceiveOrderAssignment(@MessageBody() order: any) {
    const driverId = order.driver_id; // Removed the 'await' as it's not needed here

    console.log(
      'Received assignOrderToDriver event for driver:',
      driverId,
      order,
    );

    return order;
  }

  @OnEvent('order.assignedToDriver')
  handleOrderAssignedToDriver(orderAssignment: any) {
    const driverId = orderAssignment.driver_id;
    if (driverId) {
      this.server.to(driverId).emit('incomingOrderForDriver', orderAssignment);
      console.log('new:', driverId, orderAssignment);
    }
  }
}
