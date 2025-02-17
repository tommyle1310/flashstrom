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

@WebSocketGateway({ namespace: 'driver' })
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
    private readonly ordersService: OrdersService
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
  handleJoinRoom(client: Socket, driverId: string) {
    client.join(driverId);
    console.log(`Driver joined room: ${driverId}`);
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
      console.log(
        'Received order assignment for driver:',
        driverId,
        orderAssignment
      );
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
      // Update order with driver and status
      const updatedOrder = await this.ordersService.update(data.orderId, {
        driver_id: data.driverId,
        status: 'IN_PROGRESS',
        tracking_info: 'PREPARING'
      });

      if (updatedOrder.EC === 0) {
        const order = updatedOrder.data;

        // Update driver's current orders and calculate active points
        const updatedDriver = await this.driverService.addOrderToDriver(
          data.driverId,
          order._id as string,
          data.restaurantLocation
        );

        if (updatedDriver.EC === 0) {
          // Notify all parties about the order update
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

  private notifyAllParties(order: any) {
    // Notify restaurant
    this.server
      .to(`restaurant_${order.restaurant_id}`)
      .emit('orderStatusUpdated', order);

    // Notify customer
    this.server
      .to(`customer_${order.customer_id}`)
      .emit('orderStatusUpdated', order);

    // Notify driver
    this.server
      .to(`driver_${order.driver_id}`)
      .emit('orderStatusUpdated', order);
  }
}
