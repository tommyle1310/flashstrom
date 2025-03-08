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
import {
  Order,
  OrderStatus,
  OrderTrackingInfo
} from 'src/orders/entities/order.entity';
import { DataSource, Not } from 'typeorm';
// import { v4 as uuidv4 } from 'uuid';
import { DriverProgressStage } from 'src/driver_progress_stages/entities/driver_progress_stage.entity';
import { Driver } from './entities/driver.entity';
import { createResponse } from 'src/utils/createResponse';
import { AddressBookRepository } from 'src/address_book/address_book.repository';
import { DriversRepository } from './drivers.repository';
// import { DriverProgressStage } from 'src/driver_progress_stages/entities/driver-progress-stage.entity';

// Add type for status
// type StageStatus = 'pending' | 'completed' | 'in_progress' | 'failed';

@WebSocketGateway({
  namespace: 'driver',
  cors: {
    origin: ['*', process.env.FULL_BACKEND_URL],
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
    private readonly driverRepository: DriversRepository,
    private eventEmitter: EventEmitter2,
    private readonly ordersService: OrdersService,
    private readonly driverProgressStageService: DriverProgressStagesService,
    private readonly dataSource: DataSource,
    private readonly addressBookRepository: AddressBookRepository
  ) {}

  afterInit() {
    console.log('Driver Gateway initialized');
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
    const driverId = client.handshake.query.driverId as string;
    if (driverId) {
      // Clean up ALL existing connections and locks for this driver
      this.cleanupDriverConnections(driverId);
    }
    this.activeConnections.set(client.id, client);
  }

  private cleanupDriverConnections(driverId: string) {
    // Remove all existing connections
    for (const [id, socket] of this.activeConnections.entries()) {
      if (socket.handshake.query.driverId === driverId) {
        socket.disconnect();
        this.activeConnections.delete(id);
      }
    }
    // Clear all locks and processing states
    this.processingOrders.clear();
    this.dpsCreationLocks.clear();
    this.notificationLock.clear();
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
      console.log(`Driver joined driver_${driverId}`);

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
      const driverId = orderAssignment.driver_id;

      if (!driverId) {
        throw new WsException('Driver ID is required');
      }

      // Emit only once to the driver's room
      await this.server
        .to(`driver_${driverId}`)
        .emit('incomingOrderForDriver', {
          event: 'incomingOrder',
          data: orderAssignment,
          message: 'Order received successfully'
        });

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

    if (this.processingOrders.get(driverId)) {
      return { success: false, message: 'Order is already being processed' };
    }
    this.processingOrders.set(driverId, true);

    try {
      const result = await this.dataSource.transaction(
        async transactionalEntityManager => {
          const existingDPS = await transactionalEntityManager
            .getRepository(DriverProgressStage)
            .findOne({
              where: {
                driver_id: driverId,
                current_state: Not('delivery_complete')
              }
            });

          if (existingDPS) {
            throw new WsException('Driver already has an active delivery');
          }

          // Lấy driver trong transaction
          const driver = await transactionalEntityManager.findOne(Driver, {
            where: { id: driverId }
          });
          if (!driver) {
            console.log('Driver not found:', driverId);
            return createResponse('NotFound', null, 'Driver not found');
          }

          const order = await transactionalEntityManager.findOne(Order, {
            where: { id: orderId }
          });
          if (!order) {
            return createResponse('NotFound', null, 'Order not found');
          }

          const dps = await this.driverProgressStageService.create({
            driver_id: driverId,
            order_ids: [orderId],
            current_state: 'driver_ready'
          });

          await this.ordersService.update(orderId, {
            driver_id: driverId,
            status: OrderStatus.IN_PROGRESS
          });

          const orderWithStatus = await this.ordersService.updateOrderStatus(
            orderId,
            OrderStatus.IN_PROGRESS
          );
          console.log('check orderWithStatus', orderWithStatus);

          const restaurantLocation = await this.addressBookRepository.findById(
            orderWithStatus.data.restaurant_location
          );
          if (!restaurantLocation) {
            throw new WsException('Restaurant location not found');
          }
          console.log(
            'check paảẩm addorder to driver',
            driverId,
            orderId,
            restaurantLocation
          );

          const orderWithDistance = await this.driverService.addOrderToDriver(
            driverId,
            orderId,
            restaurantLocation.location as any
          );
          console.log('check orderWithDistance', orderWithDistance);

          return { success: true, dps: dps.data };
        }
      );

      return result;
    } catch (error) {
      console.error('Error in handleDriverAcceptOrder:', error);
      return { success: false, message: 'Internal server error' };
    } finally {
      this.processingOrders.delete(driverId);
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
      const result = await this.dataSource.transaction(
        async transactionalEntityManager => {
          // Tìm DPS với quan hệ orders
          const dps = await transactionalEntityManager
            .getRepository(DriverProgressStage)
            .findOne({
              where: { id: data.stageId },
              relations: ['orders'] // Tải quan hệ orders
            });

          if (!dps) {
            return { success: false, message: 'Stage not found' };
          }

          const timestamp = Math.floor(Date.now() / 1000);
          const stageOrder = [
            'driver_ready',
            'waiting_for_pickup',
            'restaurant_pickup',
            'en_route_to_customer',
            'delivery_complete'
          ];

          const currentStage = dps.stages.find(s => s.status === 'in_progress');
          if (!currentStage) {
            return { success: false, message: 'No in-progress stage found' };
          }

          const nextState =
            stageOrder[stageOrder.indexOf(currentStage.state) + 1];
          if (!nextState) {
            return { success: false, message: 'Already at final stage' };
          }

          // Cập nhật stages trong bộ nhớ
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

          // Cập nhật DPS
          const updateResult =
            await this.driverProgressStageService.updateStage(data.stageId, {
              current_state: nextState as any,
              stages: updatedStages as any
            });

          let updatedOrder = null;
          if (nextState === 'delivery_complete') {
            const orderId = dps.orders?.[0]?.id;
            if (!orderId) {
              console.warn(`No order found for DPS ${data.stageId}`);
              return {
                success: false,
                message: 'No order associated with this stage'
              };
            }

            // Xóa bản ghi trong bảng driver_current_orders
            await transactionalEntityManager
              .createQueryBuilder()
              .delete()
              .from('driver_current_orders')
              .where('driver_id = :driverId', { driverId: dps.driver_id })
              .andWhere('order_id = :orderId', { orderId })
              .execute();

            console.log(
              `Removed order ${orderId} from driver ${dps.driver_id}'s current_orders`
            );

            // Cập nhật trạng thái đơn hàng
            await this.ordersService.updateOrderStatus(
              orderId,
              OrderStatus.DELIVERED
            );

            // Lấy thông tin order đã cập nhật
            updatedOrder = await this.ordersService.findOne(orderId);
            if (
              updatedOrder.data.status !== OrderStatus.DELIVERED ||
              updatedOrder.data.tracking_info !== OrderTrackingInfo.DELIVERED
            ) {
              console.error(
                'Failed to update order status or tracking_info correctly:',
                updatedOrder
              );
            }
          } else {
            // Lấy order để emit thông tin cập nhật
            const orderId = dps.orders?.[0]?.id;
            if (orderId) {
              updatedOrder = await this.ordersService.findOne(orderId);
            }
          }
          console.log('check updatedOrder', updatedOrder.data, updatedOrder);
          // Emit sự kiện cho tất cả các bên liên quan
          if (updatedOrder?.data) {
            await this.notifyPartiesOnce(updatedOrder.data);
            console.log(
              `Notified parties about progress update for order ${updatedOrder.data.id}`
            );
          }

          return { success: true, stage: updateResult.data };
        }
      );

      return result;
    } catch (error) {
      console.error('Error in handleDriverProgressUpdate:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // Hàm notifyPartiesOnce (đã có, nhưng thêm emit sự kiện mới)
  private async notifyPartiesOnce(order: Order) {
    const notifyKey = `notify_${order.id}`;

    if (this.notificationLock.get(notifyKey)) {
      return;
    }

    try {
      this.notificationLock.set(notifyKey, true);

      const trackingUpdate = {
        orderId: order.id,
        status: order.status,
        tracking_info: order.tracking_info,
        updated_at: order.updated_at,
        customer_id: order.customer_id,
        driver_id: order.driver_id,
        restaurant_id: order.restaurant_id
      };

      // Chỉ giữ lại emit qua EventEmitter (vì đây là phần hoạt động)
      this.eventEmitter.emit('listenUpdateOrderTracking', trackingUpdate);
      console.log(
        `Emitted listenUpdateOrderTracking via EventEmitter for order ${order.id}`
      );
    } finally {
      this.notificationLock.delete(notifyKey);
    }
  }

  @OnEvent('orderTrackingUpdate')
  async handleOrderTrackingUpdate(@MessageBody() order: any) {
    // Return the response that will be visible in Postman
    return {
      event: 'orderTrackingUpdate',
      data: order,
      message: `orderTrackingUpdate: ${order}`
    };
  }
  @OnEvent('listenUpdateOrderTracking')
  async handleListenUpdateOrderTracking(@MessageBody() order: any) {
    await this.server
      .to(`driver_${order.driver_id}`)
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
