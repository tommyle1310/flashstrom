import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit
} from '@nestjs/websockets';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { DriversService } from './drivers.service';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { RestaurantsService } from 'src/restaurants/restaurants.service';
import { forwardRef, Inject } from '@nestjs/common';
import { OrdersService } from 'src/orders/orders.service';
import { DriverProgressStagesService } from 'src/driver_progress_stages/driver_progress_stages.service';
import { UpdateDriverProgressStageDto } from 'src/driver_progress_stages/dto/update-driver-progress-stage.dto';

@WebSocketGateway({
  namespace: 'driver',
  cors: {
    origin: ['*', 'localhost:1310'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket']
})
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
    private readonly ordersService: OrdersService,
    private readonly driverProgressStageService: DriverProgressStagesService
  ) {}

  afterInit() {
    console.log('Driver Gateway initialized');
    this.server.on('assignOrderToDriver', orderAssignment => {
      console.log(
        'Received global event for assignOrderToDriver:',
        orderAssignment
      );
      const driverId = orderAssignment.driver_id;
      if (driverId) {
        this.server
          .to(driverId)
          .emit('incomingOrderForDriver', orderAssignment);
        console.log(
          'Forwarded order assignment to driver:',
          driverId,
          orderAssignment
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
  @SubscribeMessage('joinRoomDriver')
  handleJoinRoom(client: Socket, data: any) {
    const driverId =
      typeof data === 'string' ? data : data?.channel || data?._id || data;

    try {
      client.join(`driver_${driverId}`);
      console.log(`driver_${driverId}`);

      return {
        event: 'joinRoomDriver',
        data: `Joined driver_${driverId}`
      };
    } catch (error) {
      console.error('❌ Error joining room:', error);
      return {
        event: 'error',
        data: 'Failed to join room'
      };
    }
  }

  // Handle updating a driver's information
  @SubscribeMessage('updateDriver')
  async handleUpdateDriver(@MessageBody() updateDriverDto: UpdateDriverDto) {
    const driver = await this.driverService.update(
      updateDriverDto._id,
      updateDriverDto
    );
    this.server.emit('driverUpdated', driver);
    return driver;
  }

  // Handle incoming order notification for drivers
  @SubscribeMessage('newOrderForDriver')
  async handleNewOrder(@MessageBody() order: any) {
    const driverId = order.driver_id; // Removed the 'await' as it's not needed here

    // Notify the specific driver about the new order
    this.server.to(driverId).emit('incomingOrder', order);
    console.log('Emitted incomingOrder event to driver:', driverId, order);

    return order;
  }

  @SubscribeMessage('assignOrderToDriver')
  async handleReceiveOrderAssignment(@MessageBody() order: any) {
    const driverId = order.driver_id; // Removed the 'await' as it's not needed here

    console.log(
      'Received assignOrderToDriver event for driver:',
      driverId,
      order
    );

    return order;
  }

  @OnEvent('order.assignedToDriver')
  handleOrderAssignedToDriver(orderAssignment: any) {
    try {
      const driverId = orderAssignment.driver_id;
      // console.log(
      //   'Received order assignment for driver:',
      //   driverId,
      //   orderAssignment
      // );
      if (driverId) {
        this.server
          .to(driverId)
          .emit('incomingOrderForDriver', orderAssignment);
      }
    } catch (error) {
      console.error(
        'Error handling order.assignedToDriver in DriversGateway:',
        error
      );
    }
  }

  @SubscribeMessage('acceptOrder')
  async handleDriverAcceptOrder(
    @MessageBody()
    data: {
      orderId: string;
      driverId: string;
      restaurantLocation: { lat: number; lng: number };
    }
  ) {
    try {
      // First update the driver assignment
      await this.ordersService.update(data.orderId, {
        driver_id: data.driverId
      });

      // Then update the status
      const updatedOrder = await this.ordersService.updateOrderStatus(
        data.orderId,
        'IN_PROGRESS'
      );
      if (updatedOrder.EC === 0) {
        const order = updatedOrder.data;
        const updatedDriver = await this.driverService.addOrderToDriver(
          data.driverId,
          order._id as string,
          data.restaurantLocation
        );

        if (updatedDriver.EC === 0) {
          console.log('🔍 Driver accepted order:', updatedDriver.data);
          this.notifyAllParties(order);
          return { success: true, order, driver: updatedDriver.data };
        }
      }
      return { success: false, message: 'Failed to update order or driver' };
    } catch (error) {
      console.error('Error in handleDriverAcceptOrder:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  @SubscribeMessage('updateDriverProgress')
  async handleDriverProgressUpdate(
    @MessageBody()
    data: {
      stageId: string;
      newState: UpdateDriverProgressStageDto;
    }
  ) {
    try {
      console.log('check what hppen', data);
      const result = await this.driverProgressStageService.updateStage(
        data.stageId,
        {
          current_state: data.newState.current_state,
          details: {
            location: data.newState.details?.location,
            notes: data.newState.details?.notes
          }
        }
      );

      if (result.EC === 0) {
        console.log('ok result', result.data);
        this.server
          .to(result.data.driver_id)
          .emit('progressUpdated', result.data);
        return { success: true, stage: result.data };
      }

      return { success: false, message: 'Failed to update progress' };
    } catch (error) {
      console.error('Error in handleDriverProgressUpdate:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  private notifyAllParties(order: any) {
    const restaurantRoom = `restaurant_${order.restaurant_id}`;
    const customerRoom = `customer_${order.customer_id}`;
    const driverRoom = `driver_${order.driver_id}`;

    console.log(`Notifying restaurant room: ${restaurantRoom}`);
    this.server.to(restaurantRoom).emit('orderStatusUpdated', order);

    console.log(`Notifying customer room: ${customerRoom}`);
    this.server.to(customerRoom).emit('orderStatusUpdated', order);

    console.log(`Notifying driver room: ${driverRoom}`);
    this.server.to(driverRoom).emit('orderStatusUpdated', order);
  }
}
