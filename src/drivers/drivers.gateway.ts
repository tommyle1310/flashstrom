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
import {
  Order,
  OrderStatus
  // OrderTrackingInfo
} from 'src/orders/entities/order.entity';
import { DataSource, Not } from 'typeorm'; // Loại bỏ import IsolationLevel
import { DriverProgressStage } from 'src/driver_progress_stages/entities/driver_progress_stage.entity';
import { Driver } from './entities/driver.entity';
// import { createResponse } from 'src/utils/createResponse';
import { AddressBookRepository } from 'src/address_book/address_book.repository';
import { DriversRepository } from './drivers.repository';
import { StageDto } from 'src/driver_progress_stages/dto/create-driver-progress-stage.dto';
// import { SemaphoreService } from 'src/semaphor/semaphore.service';

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
  private notificationLock = new Map<string, boolean>();
  private activeConnections = new Map<string, Socket>();
  private dpsCreationLocks = new Set<string>();
  private requestQueue: Map<string, Promise<void>> = new Map();
  private processingOrders: Set<string> = new Set(); //
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
    return {
      event: 'incomingOrder',
      data: order,
      message: 'Order received successfully'
    };
  }

  handleConnection(client: Socket) {
    const driverId = client.handshake.query.driverId as string;
    if (driverId) {
      this.cleanupDriverConnections(driverId);
    }
    this.activeConnections.set(client.id, client);
  }

  private cleanupDriverConnections(driverId: string) {
    for (const [id, socket] of this.activeConnections.entries()) {
      if (socket.handshake.query.driverId === driverId) {
        socket.disconnect();
        this.activeConnections.delete(id);
      }
    }
    this.processingOrders.clear();
    this.dpsCreationLocks.clear();
    this.notificationLock.clear();
  }

  handleDisconnect(client: Socket) {
    console.log(`Driver disconnected: ${client.id}`);
    const driverId = client.handshake.query.driverId as string;
    this.activeConnections.delete(client.id);
    if (driverId) {
      this.processingOrders.delete(`${driverId}_*`);
      this.dpsCreationLocks.delete(driverId);
    }
  }

  @SubscribeMessage('joinRoomDriver')
  handleJoinRoom(client: Socket, data: any) {
    const driverId =
      typeof data === 'string' ? data : data?.channel || data?._id || data;

    try {
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

  @SubscribeMessage('updateDriver')
  async handleUpdateDriver(@MessageBody() updateDriverDto: UpdateDriverDto) {
    const driver = await this.driverService.update(
      updateDriverDto.id,
      updateDriverDto
    );
    this.server.emit('driverUpdated', driver);
    return driver;
  }

  @SubscribeMessage('newOrderForDriver')
  async handleNewOrder(@MessageBody() order: any) {
    const driverId = order.driver_id;
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

      await this.server
        .to(`driver_${driverId}`)
        .emit('incomingOrderForDriver', {
          event: 'incomingOrder',
          data: orderAssignment,
          message: 'Order received successfully'
        });

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
  async handleDriverAcceptOrder(
    @MessageBody() data: { driverId: string; orderId: string }
  ) {
    const { driverId, orderId } = data;
    const lockKey = `${driverId}_${orderId}`;
    console.log(`Driver ${driverId} accepting order ${orderId}`);

    // Kiểm tra xem order đã được xử lý chưa
    if (this.processingOrders.has(lockKey)) {
      console.log(
        `Order ${orderId} already being processed by driver ${driverId}`
      );
      return { success: false, message: 'Order is already being processed' };
    }

    this.processingOrders.add(lockKey);

    try {
      const result = await this.dataSource.transaction(
        async transactionalEntityManager => {
          // Lock order để tránh race condition
          const order = await transactionalEntityManager
            .createQueryBuilder(Order, 'order')
            .setLock('pessimistic_write')
            .where('order.id = :id', { id: orderId })
            .getOne();
          if (!order) {
            throw new WsException('Order not found');
          }
          console.log(`Order locked: ${order.id}`);

          // Kiểm tra xem order đã có driver chưa
          if (order.driver_id) {
            throw new WsException('Order is already assigned to a driver');
          }

          // Kiểm tra xem order đã được gán vào DPS nào chưa
          const existingOrderDPS = await transactionalEntityManager
            .createQueryBuilder()
            .select('dpo')
            .from('driver_progress_orders', 'dpo')
            .where('dpo.order_id = :orderId', { orderId })
            .getRawOne();
          if (existingOrderDPS) {
            throw new WsException(
              `Order ${orderId} is already assigned to DPS ${existingOrderDPS.driver_progress_id}`
            );
          }
          console.log(`No existing DPS found for order ${orderId}`);

          // Fetch driver và quan hệ current_orders
          const driver = await transactionalEntityManager
            .getRepository(Driver)
            .findOne({
              where: { id: driverId },
              relations: ['current_orders']
            });
          if (!driver) {
            throw new WsException('Driver not found');
          }
          console.log(`Driver fetched: ${driver.id}`);

          // Kiểm tra số lượng current_orders (tối đa 3)
          const currentOrderCount = driver.current_orders?.length || 0;
          if (currentOrderCount >= 3) {
            throw new WsException(
              'Driver has reached the maximum limit of 3 active orders'
            );
          }
          console.log(
            `Driver ${driverId} currently has ${currentOrderCount} orders`
          );

          // Kiểm tra DPS active của driver
          const existingDPS = await transactionalEntityManager
            .getRepository(DriverProgressStage)
            .findOne({
              where: {
                driver_id: driverId,
                current_state: Not('delivery_complete')
              },
              relations: ['orders']
            });

          let dps;
          if (!existingDPS) {
            dps = await this.driverProgressStageService.create(
              {
                driver_id: driverId,
                orders: [order],
                current_state: 'driver_ready_order_1' // Thêm hậu tố _order_1
              },
              transactionalEntityManager
            );
            console.log(`New DPS created: ${dps.data.id}`);
          } else {
            dps = await this.driverProgressStageService.addOrderToExistingDPS(
              existingDPS.id,
              order,
              transactionalEntityManager
            );
            console.log(`Order added to existing DPS: ${dps.data.id}`);
          }

          // Cập nhật order với driver_id và status
          order.driver_id = driverId;
          order.status = OrderStatus.IN_PROGRESS;
          await transactionalEntityManager.save(Order, order);
          console.log(`Order ${orderId} updated with driver ${driverId}`);

          // Cập nhật current_orders của driver
          driver.current_orders = driver.current_orders || [];
          if (!driver.current_orders.some(o => o.id === orderId)) {
            driver.current_orders.push(order);
          }
          await transactionalEntityManager.save(Driver, driver);
          console.log(
            `Added order ${orderId} to driver ${driverId} current_orders`
          );

          // Thông báo
          this.notifyPartiesOnce(order);

          return { success: true, order, dps: dps.data };
        }
      );

      return result;
    } catch (error) {
      console.error('Error in handleDriverAcceptOrder:', error);
      return {
        success: false,
        message: error.message || 'Internal server error'
      };
    } finally {
      this.processingOrders.delete(lockKey);
      console.log(`Processing lock released for ${lockKey}`);
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
    @MessageBody() data: { stageId: string; orderId?: string }
  ) {
    try {
      console.log('🚀 Starting handleDriverProgressUpdate with data:', data);

      const result = await this.dataSource.transaction(
        async transactionalEntityManager => {
          console.log('🔍 Fetching DPS with stageId:', data.stageId);
          const dps = await transactionalEntityManager
            .getRepository(DriverProgressStage)
            .findOne({
              where: { id: data.stageId },
              relations: ['orders']
            });

          if (!dps) {
            console.log('❌ DPS not found for stageId:', data.stageId);
            return { success: false, message: 'Stage not found' };
          }
          console.log(
            '✅ DPS found:',
            dps.id,
            'with orders:',
            dps.orders?.length
          );

          if (!dps.orders || dps.orders.length === 0) {
            console.log('❌ No orders associated with DPS:', dps.id);
            return {
              success: false,
              message: 'No orders associated with this stage'
            };
          }

          const timestamp = Math.floor(Date.now() / 1000);
          console.log('⏰ Current timestamp:', timestamp);

          const stageOrder = [
            'driver_ready',
            'waiting_for_pickup',
            'restaurant_pickup',
            'en_route_to_customer',
            'delivery_complete'
          ];
          console.log('📋 Stage order:', stageOrder);

          // Tìm order tiếp theo chưa hoàn thành nếu không có orderId cụ thể
          let targetOrderId = data.orderId;
          if (!targetOrderId) {
            const incompleteOrder = dps.orders.find((order, index) => {
              const orderSuffix = `order_${index + 1}`;
              const finalState = `delivery_complete_${orderSuffix}`;
              const finalStage = dps.stages.find(s => s.state === finalState);
              return finalStage && finalStage.status !== 'completed';
            });
            targetOrderId = incompleteOrder
              ? incompleteOrder.id
              : dps.orders[0].id;
          }
          console.log('🎯 Target orderId:', targetOrderId);

          let updatedStages = [...dps.stages];
          let allCompleted = true;

          for (const [index, order] of dps.orders.entries()) {
            const orderIndex = index + 1;
            const orderSuffix = `order_${orderIndex}`;
            console.log(
              '🔖 Processing order:',
              order.id,
              'suffix:',
              orderSuffix
            );

            // Tìm stage hiện tại đang in_progress
            let currentStageIndex = stageOrder.findIndex(baseState => {
              const state = `${baseState}_${orderSuffix}`;
              const stage = updatedStages.find(s => s.state === state);
              return stage && stage.status === 'in_progress';
            });

            if (currentStageIndex === -1) {
              console.log(
                '⚠️ No in-progress stage found for order:',
                order.id,
                'checking last completed...'
              );
              currentStageIndex = -1;
              for (let i = stageOrder.length - 1; i >= 0; i--) {
                const state = `${stageOrder[i]}_${orderSuffix}`;
                const stage = updatedStages.find(s => s.state === state);
                if (stage && stage.status === 'completed') {
                  currentStageIndex = i;
                  break;
                }
              }
            }

            // Xử lý order nếu nó là targetOrderId
            if (order.id === targetOrderId) {
              if (currentStageIndex >= 0) {
                // Nếu có stage đang in_progress, hoàn thành nó
                const currentState = `${stageOrder[currentStageIndex]}_${orderSuffix}`;
                const nextStateBase =
                  currentStageIndex < stageOrder.length - 1
                    ? stageOrder[currentStageIndex + 1]
                    : null;
                const nextState = nextStateBase
                  ? `${nextStateBase}_${orderSuffix}`
                  : null;

                console.log(
                  '➡️ Processing stage:',
                  currentState,
                  'to',
                  nextState || 'completed'
                );

                updatedStages = updatedStages.map((stage): StageDto => {
                  if (
                    stage.state === currentState &&
                    stage.status === 'in_progress'
                  ) {
                    console.log('✅ Completing stage:', stage.state);
                    return {
                      ...stage,
                      status: 'completed',
                      duration: timestamp - stage.timestamp
                    };
                  }
                  if (
                    nextState &&
                    stage.state === nextState &&
                    stage.status === 'pending'
                  ) {
                    console.log('✅ Starting next stage:', stage.state);
                    return {
                      ...stage,
                      status: 'in_progress',
                      timestamp
                    };
                  }
                  return stage;
                });

                // Cập nhật trạng thái đơn hàng
                if (stageOrder[currentStageIndex] === 'restaurant_pickup') {
                  console.log(
                    '🍽️ Updating order status to RESTAURANT_PICKUP for order:',
                    order.id
                  );
                  const updateResult =
                    await this.ordersService.updateOrderStatus(
                      order.id,
                      OrderStatus.RESTAURANT_PICKUP,
                      transactionalEntityManager
                    );
                  console.log('✅ Order status update result:', updateResult);
                } else if (
                  stageOrder[currentStageIndex] === 'delivery_complete'
                ) {
                  console.log(
                    '🗑️ Removing order from driver_current_orders...'
                  );
                  await transactionalEntityManager
                    .createQueryBuilder()
                    .delete()
                    .from('driver_current_orders')
                    .where('driver_id = :driverId', { driverId: dps.driver_id })
                    .andWhere('order_id = :orderId', { orderId: order.id })
                    .execute();

                  console.log(
                    '📦 Updating order status to DELIVERED for order:',
                    order.id
                  );
                  const updateResult =
                    await this.ordersService.updateOrderStatus(
                      order.id,
                      OrderStatus.DELIVERED,
                      transactionalEntityManager
                    );
                  console.log('✅ Order status update result:', updateResult);
                }
              } else if (currentStageIndex < stageOrder.length - 1) {
                // Nếu không có stage in_progress nhưng order chưa hoàn thành, bắt đầu stage đầu tiên
                allCompleted = false;
                const nextState = `driver_ready_${orderSuffix}`;
                console.log('➡️ Starting first stage:', nextState);

                updatedStages = updatedStages.map((stage): StageDto => {
                  if (stage.state === nextState && stage.status === 'pending') {
                    console.log('✅ Starting next stage:', stage.state);
                    return {
                      ...stage,
                      status: 'in_progress',
                      timestamp
                    };
                  }
                  return stage;
                });
              }
            }

            // Kiểm tra xem order có hoàn thành không
            const finalState = `delivery_complete_${orderSuffix}`;
            const finalStage = updatedStages.find(s => s.state === finalState);
            if (!finalStage || finalStage.status !== 'completed') {
              allCompleted = false;
            }
          }

          // Nếu tất cả các stage hiện tại đã hoàn thành, bắt đầu order tiếp theo
          if (!allCompleted) {
            const nextIncompleteOrder = dps.orders.find((order, index) => {
              const orderSuffix = `order_${index + 1}`;
              const finalState = `delivery_complete_${orderSuffix}`;
              const finalStage = updatedStages.find(
                s => s.state === finalState
              );
              return finalStage && finalStage.status !== 'completed';
            });

            if (
              nextIncompleteOrder &&
              nextIncompleteOrder.id !== targetOrderId
            ) {
              const nextOrderIndex =
                dps.orders.findIndex(o => o.id === nextIncompleteOrder.id) + 1;
              const nextOrderSuffix = `order_${nextOrderIndex}`;
              const nextDriverReadyState = `driver_ready_${nextOrderSuffix}`;
              updatedStages = updatedStages.map((stage): StageDto => {
                if (
                  stage.state === nextDriverReadyState &&
                  stage.status === 'pending'
                ) {
                  console.log(
                    '✅ Starting driver_ready for next order:',
                    stage.state
                  );
                  return {
                    ...stage,
                    status: 'in_progress',
                    timestamp
                  };
                }
                return stage;
              });
              targetOrderId = nextIncompleteOrder.id; // Cập nhật targetOrderId
            }
          }

          // Tìm stage đang in_progress để cập nhật current_state
          const inProgressStage = updatedStages.find(
            stage => stage.status === 'in_progress'
          );
          let newCurrentState: string;
          let newPreviousState: string | null = dps.current_state;
          let newNextState: string | null = null;

          if (inProgressStage) {
            newCurrentState = inProgressStage.state;
            const currentIndex = stageOrder.findIndex(base =>
              inProgressStage.state.startsWith(base)
            );
            newNextState =
              currentIndex < stageOrder.length - 1
                ? `${stageOrder[currentIndex + 1]}_${inProgressStage.state.split('_order_')[1]}`
                : null;
          } else {
            const lastCompletedDelivery = updatedStages
              .filter(
                stage =>
                  stage.state.startsWith('delivery_complete_') &&
                  stage.status === 'completed'
              )
              .sort((a, b) => b.timestamp - a.timestamp)[0];
            if (lastCompletedDelivery) {
              newCurrentState = lastCompletedDelivery.state;
              newPreviousState = dps.current_state;
              newNextState = null;
            } else {
              newCurrentState = dps.current_state;
            }
          }

          console.log('🔖 New current_state:', newCurrentState);
          console.log('🔖 New previous_state:', newPreviousState);
          console.log('🔖 New next_state:', newNextState);

          // Cập nhật DPS với các trường đồng bộ
          console.log('💾 Updating DPS with new stages and states...');
          const updateResult =
            await this.driverProgressStageService.updateStage(
              data.stageId,
              {
                current_state: newCurrentState,
                previous_state: newPreviousState,
                next_state: newNextState,
                stages: updatedStages
              },
              transactionalEntityManager
            );
          console.log('✅ DPS update result:', updateResult);

          // Lấy thông tin đơn hàng đã cập nhật
          const updatedOrder = await this.ordersService.findOne(
            targetOrderId,
            transactionalEntityManager
          );
          console.log('📋 Updated order:', updatedOrder?.data);

          if (updatedOrder?.data) {
            console.log('📢 Notifying parties...');
            await this.notifyPartiesOnce(updatedOrder.data);
            console.log(
              `Notified parties about progress update for order ${updatedOrder.data.id}`
            );
          }

          console.log('🎉 HandleDriverProgressUpdate completed successfully');
          return { success: true, stage: updateResult.data };
        }
      );

      return result;
    } catch (error) {
      console.error('❌ Error in handleDriverProgressUpdate:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

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
    return {
      event: 'listenUpdateOrderTracking',
      data: order,
      message: `listenUpdateOrderTracking ${order}`
    };
  }
}
