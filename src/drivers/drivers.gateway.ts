import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { DriversService } from './drivers.service';
import { UpdateDriverDto } from './dto/update-driver.dto';

@WebSocketGateway()
export class DriversGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly driversService: DriversService) {}

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
    const driver = await this.driversService.update(
      updateDriverDto._id,
      updateDriverDto,
    );
    this.server.emit('driverUpdated', driver);
    return driver;
  }

  // Handle incoming order notification for drivers
  @SubscribeMessage('newOrderForDriver')
  async handleNewOrder(@MessageBody() order: any) {
    const driverId = await order.driver_id; // Assuming order has driver_id

    // Notify the specific driver about the new order
    this.server.to(driverId).emit('incomingOrderForDriver', order);
    console.log(
      'Emitted incomingOrderForDriver event to driver:',
      driverId,
      order,
    );

    return order;
  }
}
