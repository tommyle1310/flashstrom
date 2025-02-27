import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WsException
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
// import { UpdateDriverProgressStageDto } from 'src/driver_progress_stages/dto/update-driver-progress-stage.dto';

// Add type for status
type StageStatus = 'pending' | 'completed' | 'in_progress' | 'failed';

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
    // You might want to add logic here to track which driver this socket belongs to
  }

  // Handle driver disconnections
  handleDisconnect(client: Socket) {
    console.log(`Driver disconnected: ${client.id}`);
    // Clean up socket tracking
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

  // @SubscribeMessage('assignOrderToDriver')
  // async handleReceiveOrderAssignment(@MessageBody() order: any) {
  //   const driverId = order.driver_id; // Removed the 'await' as it's not needed here

  //   console.log(
  //     'Received assignOrderToDriver event for driver:',
  //     driverId,
  //     order
  //   );

  //   return order;
  // }

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
    try {
      const { orderId, driverId } = data;
      const order = await this.ordersService.findOne(orderId);
      if (!order.data) {
        return { success: false, message: 'Order not found' };
      }

      // Check if driver already has an active DPS
      const existingDPS =
        await this.driverProgressStageService.getActiveStageByDriver(driverId);
      if (existingDPS.data) {
        return {
          success: false,
          message: 'Driver already has an active delivery'
        };
      }

      // Update driver and order status
      const updatedDriver = await this.driverService.updateDriverOrder(
        driverId,
        orderId
      );
      if (updatedDriver.EC === 0) {
        const updatedOrder = await this.ordersService.updateOrderStatus(
          orderId,
          OrderStatus.IN_PROGRESS
        );

        if (updatedOrder.EC === 0) {
          // Create initial progress stage (only once)
          const newStages = [
            'driver_ready',
            'waiting_for_pickup',
            'restaurant_pickup',
            'en_route_to_customer',
            'delivery_complete'
          ].map(state => ({
            state,
            status: state === 'driver_ready' ? 'in_progress' : 'pending',
            timestamp: Math.floor(Date.now() / 1000),
            duration: 0,
            details: {
              location: null,
              estimated_time: null,
              actual_time: null,
              notes: null,
              tip: null,
              weather: null
            }
          }));

          const createResult = await this.driverProgressStageService.create({
            driver_id: data.driverId,
            order_ids: [order.data.id],
            current_state: 'driver_ready',
            stages: newStages as any
          });

          if (createResult.EC !== 0) {
            console.error('Failed to create stage:', createResult);
            return {
              success: false,
              message: 'Failed to create driver progress stage'
            };
          }

          this.notifyAllParties(order.data);
          return {
            success: true,
            order: order.data,
            driver: updatedDriver.data
          };
        }
      }
      return { success: false, message: 'Failed to update order or driver' };
    } catch (error) {
      console.error('Error in handleDriverAcceptOrder:', error);
      return { success: false, message: 'Internal server error' };
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
  async handleDriverProgressUpdate(
    @MessageBody()
    data: {
      stageId: string;
    }
  ) {
    try {
      const stageOrder = [
        'driver_ready',
        'waiting_for_pickup',
        'restaurant_pickup',
        'en_route_to_customer',
        'delivery_complete'
      ];

      // Get the current progress stage
      const currentStage = await this.driverProgressStageService.findById(
        data.stageId
      );
      if (!currentStage.data) {
        return { success: false, message: 'Stage not found' };
      }

      // Find the current in-progress stage
      const currentInProgressStage = currentStage.data.stages.find(
        stage => stage.status === 'in_progress'
      );

      if (!currentInProgressStage) {
        return { success: false, message: 'No in-progress stage found' };
      }

      // Update only the statuses in the existing stages array
      const updatedStages = currentStage.data.stages.map(stage => {
        if (stage === currentInProgressStage) {
          return {
            ...currentInProgressStage,
            status: 'completed' as StageStatus,
            duration:
              (new Date().getTime() -
                new Date(currentInProgressStage.timestamp).getTime()) /
              1000
          };
        }
        if (
          stage.state ===
          stageOrder[stageOrder.indexOf(currentInProgressStage.state) + 1]
        ) {
          return {
            ...stage,
            status: 'in_progress' as StageStatus,
            timestamp: Math.floor(Date.now() / 1000)
          };
        }
        return stage;
      });

      // Update the existing stage document
      const result = await this.driverProgressStageService.updateStage(
        data.stageId,
        {
          current_state: stageOrder[
            stageOrder.indexOf(currentInProgressStage.state) + 1
          ] as any,
          stages: updatedStages
        }
      );

      if (result.EC === 0) {
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
