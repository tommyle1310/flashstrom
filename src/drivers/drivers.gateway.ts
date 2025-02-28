import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WsException
  // ConnectedSocket
} from '@nestjs/websockets';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { DriversService } from './drivers.service';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { RestaurantsService } from 'src/restaurants/restaurants.service';
import { forwardRef, Inject } from '@nestjs/common';
import { OrdersService } from 'src/orders/orders.service';
import { DriverProgressStagesService } from 'src/driver_progress_stages/driver_progress_stages.service';
import { OrderStatus } from 'src/orders/entities/order.entity';
import { DataSource } from 'typeorm';
import { Not } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
// import { UpdateDriverProgressStageDto } from 'src/driver_progress_stages/dto/update-driver-progress-stage.dto';

// Add type for status
// type StageStatus = 'pending' | 'completed' | 'in_progress' | 'failed';

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

  private driverSockets: Map<string, Set<string>> = new Map();
  private processingOrders: Map<string, boolean> = new Map();
  private notificationLock = new Map<string, boolean>();
  private activeConnections = new Map<string, Socket>();
  private dpsCreationLocks = new Set<string>(); // New lock for DPS creation

  constructor(
    private readonly restaurantsService: RestaurantsService,
    @Inject(forwardRef(() => DriversService))
    private readonly driverService: DriversService,
    private eventEmitter: EventEmitter2,
    private readonly ordersService: OrdersService,
    private readonly driverProgressStageService: DriverProgressStagesService,
    private readonly dataSource: DataSource
  ) {}

  afterInit() {
    console.log('Driver Gateway initialized');
    // this.server.on('assignOrderToDriver', orderAssignment => {
    //   console.log(
    //     'Received global event for assignOrderToDriver:',
    //     orderAssignment
    //   );
    //   const driverId = orderAssignment.driver_id;
    //   if (driverId) {
    //     this.server
    //       .to(`driver_${driverId}`)
    //       .emit('incomingOrderForDriver', orderAssignment);
    //     console.log(
    //       'Forwarded order assignment to driver:',
    //       driverId,
    //       orderAssignment
    //     );
    //   }
    // });
  }

  @OnEvent('incomingOrderForDriver')
  async handleIncomingOrderForDriver(@MessageBody() order: any) {
    console.log('Received incomingOrderForDriver event:', order);

    // Return the response that will be visible in Postman
    return {
      event: 'incomingOrder',
      data: order,
      message: 'Order received successfully'
    };
  }

  // Handle new driver connections
  handleConnection(client: Socket) {
    console.log(`Driver connected: ${client.id}`);
    const driverId = client.handshake.query.driverId as string;

    if (driverId) {
      // Remove any existing connections for this driver
      for (const [id, socket] of this.activeConnections.entries()) {
        if (socket.handshake.query.driverId === driverId) {
          socket.disconnect();
          this.activeConnections.delete(id);
          this.processingOrders.delete(`${driverId}_*`);
          this.dpsCreationLocks.delete(driverId);
        }
      }
    }

    this.activeConnections.set(client.id, client);
  }

  // Handle driver disconnections
  handleDisconnect(client: Socket) {
    console.log(`Driver disconnected: ${client.id}`);
    const driverId = client.handshake.query.driverId as string;
    this.activeConnections.delete(client.id);
    if (driverId) {
      this.processingOrders.delete(`${driverId}_*`);
      this.dpsCreationLocks.delete(driverId);
    }
  }

  // Handle joining a specific room for the driver
  @SubscribeMessage('joinRoomDriver')
  handleJoinRoom(client: Socket, data: any) {
    const driverId =
      typeof data === 'string' ? data : data?.channel || data?._id || data;

    try {
      // Track this socket for this driver
      if (!this.driverSockets.has(driverId)) {
        this.driverSockets.set(driverId, new Set());
      }
      this.driverSockets.get(driverId)?.add(client.id);

      client.join(`driver_${driverId}`);
      console.log(`Driver ${driverId} joined room with socket ${client.id}`);

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
      updateDriverDto.id,
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

  @OnEvent('order.assignedToDriver')
  async handleOrderAssignedToDriver(orderAssignment: any) {
    try {
      console.log('Received order.assignedToDriver event:', orderAssignment);
      const driverId = orderAssignment.driver_id;

      if (!driverId) {
        throw new WsException('Driver ID is required');
      }

      // Emit only once to the driver's room
      const emitted = await this.server
        .to(`driver_${driverId}`)
        .emit('incomingOrderForDriver', {
          event: 'incomingOrder',
          data: orderAssignment,
          message: 'Order received successfully'
        });

      console.log(`Emitted to driver ${driverId}:`, emitted);

      // Return immediately after emission
      return {
        event: 'orderAssigned',
        data: { success: true }
      };
    } catch (error) {
      console.error('Error handling order.assignedToDriver:', error);
      if (error instanceof WsException) {
        throw error;
      }
      throw new WsException('Internal server error');
    }
  }

  @SubscribeMessage('driverAcceptOrder')
  async handleDriverAcceptOrder(@MessageBody() data: any) {
    const { driverId, orderId } = data;
    const lockKey = `${driverId}_${orderId}`;

    if (this.processingOrders.get(lockKey)) {
      return { success: false, message: 'Order is already being processed' };
    }

    try {
      this.processingOrders.set(lockKey, true);
      const timestamp = Math.floor(Date.now() / 1000);

      // First check if driver already has an active DPS
      const existingDPS = await this.dataSource
        .getRepository('DriverProgressStage')
        .findOne({
          where: {
            driver_id: driverId,
            current_state: Not('delivery_complete')
          }
        });

      if (existingDPS) {
        return {
          success: false,
          message: 'Driver already has an active delivery'
        };
      }

      // Create single DPS with proper ID
      const dps = await this.dataSource.transaction(async manager => {
        // Create DPS with proper ID
        const newDPS = manager.create('DriverProgressStage', {
          id: `FF_DPS_${uuidv4()}`,
          driver_id: driverId,
          order_ids: [orderId],
          current_state: 'driver_ready',
          stages: [
            {
              state: 'driver_ready',
              status: 'in_progress',
              timestamp,
              duration: 0,
              details: {}
            },
            {
              state: 'waiting_for_pickup',
              status: 'pending',
              timestamp,
              duration: 0,
              details: {}
            },
            {
              state: 'restaurant_pickup',
              status: 'pending',
              timestamp,
              duration: 0,
              details: {}
            },
            {
              state: 'en_route_to_customer',
              status: 'pending',
              timestamp,
              duration: 0,
              details: {}
            },
            {
              state: 'delivery_complete',
              status: 'pending',
              timestamp,
              duration: 0,
              details: {}
            }
          ],
          events: [],
          created_at: timestamp,
          updated_at: timestamp
        });

        const savedDPS = await manager.save('DriverProgressStage', newDPS);

        // Update order and driver in the same transaction
        await Promise.all([
          manager.update(
            'orders',
            { id: orderId },
            { status: OrderStatus.IN_PROGRESS, updated_at: timestamp }
          ),
          manager.update(
            'drivers',
            { id: driverId },
            { current_order_id: [orderId], updated_at: timestamp }
          )
        ]);

        return savedDPS;
      });

      // Get updated data for response
      const [updatedOrder, updatedDriver] = await Promise.all([
        this.ordersService.findOne(orderId),
        this.driverService.findDriverById(driverId)
      ]);

      // Notify parties
      if (updatedOrder.data) {
        await this.notifyPartiesOnce(updatedOrder.data);
      }

      return {
        success: true,
        order: updatedOrder.data,
        driver: updatedDriver.data,
        dps
      };
    } catch (error) {
      console.error('Error in handleDriverAcceptOrder:', error);
      return { success: false, message: 'Failed to process order acceptance' };
    } finally {
      this.processingOrders.delete(lockKey);
    }
  }

  private getLocationForState(
    state: string,
    locations: {
      driverLocation: { lat: number; lng: number };
      restaurantLocation: { lat: number; lng: number };
      customerLocation: any;
    }
  ) {
    if (state === 'driver_ready') {
      console.log('check locations.driverLocation', locations.driverLocation);
      return locations.driverLocation;
    } else if (
      state === 'waiting_for_pickup' ||
      state === 'restaurant_pickup'
    ) {
      return locations.restaurantLocation;
    } else if (
      state === 'en_route_to_customer' ||
      state === 'delivery_complete'
    ) {
      return locations.customerLocation;
    }
    return null;
  }

  @SubscribeMessage('updateDriverProgress')
  async handleDriverProgressUpdate(@MessageBody() data: { stageId: string }) {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const stageOrder = [
        'driver_ready',
        'waiting_for_pickup',
        'restaurant_pickup',
        'en_route_to_customer',
        'delivery_complete'
      ];

      // Get existing DPS
      const dps = await this.dataSource
        .getRepository('DriverProgressStage')
        .findOne({
          where: { id: data.stageId }
        });

      if (!dps) {
        return { success: false, message: 'Stage not found' };
      }

      const currentStage = dps.stages.find(s => s.status === 'in_progress');
      if (!currentStage) {
        return { success: false, message: 'No in-progress stage found' };
      }

      const nextState = stageOrder[stageOrder.indexOf(currentStage.state) + 1];
      if (!nextState) {
        return { success: false, message: 'Already at final stage' };
      }

      // Update stages
      const updatedStages = dps.stages.map(stage => {
        if (stage.state === currentStage.state) {
          return {
            ...stage,
            status: 'completed',
            duration: timestamp - stage.timestamp
          };
        }
        if (stage.state === nextState) {
          return { ...stage, status: 'in_progress', timestamp };
        }
        return stage;
      });

      // Update DPS
      await this.dataSource.getRepository('DriverProgressStage').update(
        { id: data.stageId },
        {
          current_state: nextState,
          stages: updatedStages,
          updated_at: timestamp
        }
      );

      // If completed, update driver and order
      if (nextState === 'delivery_complete') {
        await Promise.all([
          this.dataSource
            .getRepository('drivers')
            .update(
              { id: dps.driver_id },
              { current_order_id: [], updated_at: timestamp }
            ),
          this.dataSource
            .getRepository('orders')
            .update(
              { id: dps.order_ids[0] },
              { status: OrderStatus.DELIVERED, updated_at: timestamp }
            )
        ]);
      }

      const updatedDPS = await this.dataSource
        .getRepository('DriverProgressStage')
        .findOne({
          where: { id: data.stageId }
        });

      return { success: true, stage: updatedDPS };
    } catch (error) {
      console.error('Error in handleDriverProgressUpdate:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  private async notifyPartiesOnce(order: any) {
    const notifyKey = `notify_${order.id}`;

    if (this.notificationLock.get(notifyKey)) {
      return;
    }

    try {
      this.notificationLock.set(notifyKey, true);

      const restaurantRoom = `restaurant_${order.restaurant_id}`;
      const customerRoom = `customer_${order.customer_id}`;
      const driverRoom = `driver_${order.driver_id}`;

      await Promise.all([
        this.server.to(restaurantRoom).emit('orderStatusUpdated', order),
        this.server.to(customerRoom).emit('orderStatusUpdated', order),
        this.server.to(driverRoom).emit('orderStatusUpdated', order)
      ]);
    } finally {
      this.notificationLock.delete(notifyKey);
    }
  }
}
