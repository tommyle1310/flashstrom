// filepath: /e:/Afinalproject/backend/flashstrom-backend/src/drivers/drivers.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { DriversService } from './drivers.service';
import { UpdateDriverDto } from './dto/update-driver.dto';

@WebSocketGateway()
export class DriversGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly driversService: DriversService) {}

  @SubscribeMessage('updateDriver')
  async handleUpdateDriver(@MessageBody() updateDriverDto: UpdateDriverDto) {
    const driver = await this.driversService.update(
      updateDriverDto._id,
      updateDriverDto,
    );
    this.server.emit('driverUpdated', driver);
    return driver;
  }
}
