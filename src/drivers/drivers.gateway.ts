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
import { evaluate } from 'mathjs';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { DriversService } from './drivers.service';
import { RestaurantsService } from 'src/restaurants/restaurants.service';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { OrdersService } from 'src/orders/orders.service';
import { DriverProgressStagesService } from 'src/driver_progress_stages/driver_progress_stages.service';
import {
  Order,
  OrderStatus,
  OrderTrackingInfo
} from 'src/orders/entities/order.entity';
import { DataSource } from 'typeorm';
import { DriverProgressStage } from 'src/driver_progress_stages/entities/driver_progress_stage.entity';
import { Driver } from './entities/driver.entity';
import { AddressBookRepository } from 'src/address_book/address_book.repository';
import { DriversRepository } from './drivers.repository';
import { StageDto } from 'src/driver_progress_stages/dto/create-driver-progress-stage.dto';
import { JwtService } from '@nestjs/jwt';
import { DriverStatsService } from 'src/driver_stats_records/driver_stats_records.service';
import { FinanceRulesService } from 'src/finance_rules/finance_rules.service';
import { CreateTransactionDto } from 'src/transactions/dto/create-transaction.dto';
import { FWalletsRepository } from 'src/fwallets/fwallets.repository';
import { TransactionService } from 'src/transactions/transactions.service';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { FLASHFOOD_FINANCE_neon_test_branch } from 'src/utils/constants';
import { createAdapter } from '@socket.io/redis-adapter';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
@WebSocketGateway({
  namespace: 'driver',
  cors: {
    origin: ['*', process.env.FULL_BACKEND_URL],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket'],
  pingTimeout: 180000,
  pingInterval: 30000,
  maxHttpBufferSize: 1e6,
  logger: {
    error: (msg, context) =>
      console.error(`[Socket.IO Error] ${context}: ${msg}`),
    warn: (msg, context) => console.warn(`[Socket.IO Warn] ${context}: ${msg}`),
    info: (msg, context) => console.info(`[Socket.IO Info] ${context}: ${msg}`),
    debug: (msg, context) =>
      console.debug(`[Socket.IO Debug] ${context}: ${msg}`)
  }
})
export class DriversGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  private server: Server;
  private driverSockets: Map<string, Set<string>> = new Map();
  private notificationLock = new Map<string, boolean>();
  private activeConnections = new Map<string, Socket>();
  private dpsCreationLocks = new Set<string>();
  private processingOrders: Set<string> = new Set();
  private processedEvents = new Map<string, number>();
  private isListenerRegistered = false;
  private redisClient: any;

  constructor(
    @Inject('SOCKET_SERVER') private socketServer: any,
    @Inject(forwardRef(() => RestaurantsService))
    private readonly restaurantsService: RestaurantsService,
    @Inject(forwardRef(() => DriversService))
    private readonly driverService: DriversService,
    private readonly driverRepository: DriversRepository,
    private readonly driverStatsService: DriverStatsService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
    private readonly financeRulesService: FinanceRulesService,
    private readonly fWalletsRepository: FWalletsRepository,
    private readonly transactionsService: TransactionService,
    private readonly driverProgressStageService: DriverProgressStagesService,
    private readonly dataSource: DataSource,
    private readonly addressBookRepository: AddressBookRepository,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService
  ) {
    console.log(
      '[DriversGateway] Constructor called, instance ID:',
      Math.random()
    );
    this.redisClient = this.redisService.getClient();
  }

  afterInit() {
    console.log('[DriversGateway] Initialized');
    if (!this.server) {
      console.error(
        '[DriversGateway] WebSocket server is null after initialization'
      );
      return;
    }
    try {
      const pubClient = this.redisService.getClient();
      const subClient = pubClient.duplicate();
      let retryCount = 0;
      const maxRetries = 3;
      const connectRedis = async () => {
        try {
          if (subClient.isOpen) {
            console.log(
              '[DriversGateway] Redis subClient already open, skipping connect'
            );
          } else {
            await subClient.connect();
            console.log('[DriversGateway] Redis subClient connected');
          }
          const redisAdapter = createAdapter(pubClient, subClient);
          this.server.adapter(redisAdapter);
          console.log(
            '[DriversGateway] Socket.IO Redis adapter initialized successfully'
          );
        } catch (err: any) {
          if (retryCount < maxRetries) {
            retryCount++;
            console.warn(
              `[DriversGateway] Retrying Redis connection (${retryCount}/${maxRetries})...`
            );
            setTimeout(connectRedis, 2000); // Tăng delay
          } else {
            console.error(
              '[DriversGateway] Failed to initialize Redis adapter after retries:',
              err.message
            );
          }
        }
      };
      connectRedis();
    } catch (err: any) {
      console.error(
        '[DriversGateway] Error setting up Redis adapter:',
        err.message
      );
    }
    this.registerEventListeners();
    this.server.setMaxListeners(300); // Tăng maxListeners
  }

  private registerEventListeners() {
    if (this.isListenerRegistered) {
      console.log(
        '[DriversGateway] Event listeners already registered, skipping'
      );
      return;
    }
    this.eventEmitter.removeAllListeners('order.assignedToDriver');
    this.eventEmitter.on(
      'order.assignedToDriver',
      this.handleOrderAssignedToDriver.bind(this)
    );
    this.isListenerRegistered = true;
    console.log(
      '[DriversGateway] Registered event listener for order.assignedToDriver'
    );
  }

  async onModuleDestroy() {
    this.eventEmitter.removeListener(
      'order.assignedToDriver',
      this.handleOrderAssignedToDriver.bind(this)
    );
    this.isListenerRegistered = false;
    if (this.redisClient && this.redisClient.isOpen) {
      await this.redisClient.quit();
    }
    console.log(
      '[DriversGateway] Removed event listener and closed Redis connection'
    );
  }

  private async validateToken(client: Socket): Promise<any> {
    try {
      const authHeader = client.handshake.headers.auth as string;
      if (!authHeader?.startsWith('Bearer ')) {
        throw new WsException('Invalid token');
      }
      const token = authHeader.slice(7);
      if (!token) {
        throw new WsException('No token provided');
      }
      const decoded = await this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET
      });
      return decoded;
    } catch (error: any) {
      console.error('[DriversGateway] Token validation error:', error.message);
      throw new WsException('Token validation failed');
    }
  }

  async handleConnection(client: Socket) {
    try {
      console.log('⚡️ Client connected to driver namespace:', client.id);
      const driverData = await this.validateToken(client);
      if (!driverData) {
        console.log(
          '[DriversGateway] Invalid token, disconnecting:',
          client.id
        );
        client.disconnect(true);
        return;
      }

      const driverId = driverData.id;
      console.log(
        `[DriversGateway] Driver ${driverId} attempting connection:`,
        client.id
      );

      // Lock để tránh nhiều kết nối đồng thời
      const lockKey = `lock:driver:connect:${driverId}`;
      let lockAcquired = false;
      let retryCount = 0;
      const maxRetries = 10;
      const retryDelay = 100;
      const lockTTL = 30000;

      while (!lockAcquired && retryCount < maxRetries) {
        lockAcquired = await this.redisService.setNx(
          lockKey,
          client.id,
          lockTTL
        );
        if (!lockAcquired) {
          const existingSocketId = await this.redisService.get(lockKey);
          if (existingSocketId && existingSocketId !== client.id) {
            const existingSocket = this.activeConnections.get(existingSocketId);
            if (existingSocket && existingSocket.connected) {
              console.log(
                `[DriversGateway] Active connection exists for driver ${driverId} with socket ${existingSocketId}, disconnecting ${client.id}`
              );
              client.disconnect(true);
              return;
            }
            await this.redisService.del(lockKey);
          }
          retryCount++;
          console.log(
            `[DriversGateway] Retrying lock for driver ${driverId} (${retryCount}/${maxRetries})`
          );
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }

      if (!lockAcquired) {
        console.log(
          `[DriversGateway] Failed to acquire lock for driver ${driverId}, disconnecting ${client.id}`
        );
        client.disconnect(true);
        return;
      }

      try {
        // Kiểm tra số lượng clients trong room
        const clients = await this.server
          .in(`driver_${driverId}`)
          .fetchSockets();
        if (clients.length > 0) {
          console.warn(
            `[DriversGateway] Multiple clients detected in room driver_${driverId}, cleaning up`
          );
          await this.cleanupDriverConnections(driverId, client.id);
        }

        // Join room
        await client.join(`driver_${driverId}`);
        console.log(`Driver auto-joined driver_${driverId} via token`);

        // Update socket set
        this.driverSockets.set(driverId, new Set([client.id]));
        console.log(
          `[DriversGateway] Updated socket set for driver ${driverId}:`,
          this.driverSockets.get(driverId)
        );

        // Store active connection
        this.activeConnections.set(client.id, client);

        // Log clients in room
        const updatedClients = await this.server
          .in(`driver_${driverId}`)
          .fetchSockets();
        console.log(
          `[DriversGateway] Clients in room driver_${driverId}:`,
          updatedClients.length
        );

        // Emit connected event
        client.emit('connected', { driverId, status: 'connected' });
      } finally {
        await this.redisService.del(lockKey);
      }
    } catch (error: any) {
      console.error(
        '[DriversGateway] Error handling connection:',
        error.message
      );
      client.disconnect(true);
    }
  }

  async cleanupDriverConnections(driverId: string, newSocketId: string) {
    console.log(
      `[DriversGateway] Cleaning up connections for driver ${driverId}`
    );
    const socketIds = this.driverSockets.get(driverId) || new Set();
    const existingSockets = await this.server
      .in(`driver_${driverId}`)
      .fetchSockets();

    for (const socket of existingSockets) {
      if (socket.id !== newSocketId) {
        const activeSocket = this.activeConnections.get(socket.id);
        if (activeSocket) {
          console.log(
            `[DriversGateway] Disconnecting old socket ${socket.id} for driver ${driverId}`
          );
          activeSocket.removeAllListeners();
          activeSocket.leave(`driver_${driverId}`);
          activeSocket.disconnect(true);
          this.activeConnections.delete(socket.id);
        }
      }
    }

    for (const socketId of socketIds) {
      if (socketId !== newSocketId) {
        this.activeConnections.delete(socketId);
      }
    }
    this.driverSockets.delete(driverId);
    console.log(`[DriversGateway] Removed socket set for driver ${driverId}`);

    this.notificationLock.delete(`notify_${driverId}`);
    this.processingOrders.forEach(lock => {
      if (lock.startsWith(`${driverId}_`)) {
        this.processingOrders.delete(lock);
      }
    });
    this.dpsCreationLocks.delete(driverId);
  }

  handleDisconnect(client: Socket) {
    console.log(`[DriversGateway] Driver disconnected: ${client.id}`);
    const driverId = Array.from(this.driverSockets.keys()).find(key => {
      const socketSet = this.driverSockets.get(key);
      return socketSet && socketSet.has(client.id);
    });

    this.activeConnections.delete(client.id);

    if (driverId) {
      const socketSet = this.driverSockets.get(driverId);
      if (socketSet) {
        socketSet.delete(client.id);
        if (socketSet.size === 0) {
          this.driverSockets.delete(driverId);
        }
      }
      client.leave(`driver_${driverId}`);
      client.removeAllListeners();
      for (const lock of this.processingOrders) {
        if (lock.startsWith(`${driverId}_`)) {
          this.processingOrders.delete(lock);
        }
      }
    }
  }

  // Giữ nguyên các phương thức khác

  // Giữ nguyên các phương thức khác

  // @SubscribeMessage('updateDriver')
  // async handleUpdateDriver(@MessageBody() updateDriverDto: UpdateDriverDto) {
  //   const driver = await this.driverService.update(
  //     updateDriverDto.id,
  //     updateDriverDto
  //   );
  //   if (this.server) {
  //     this.server.emit('driverUpdated', driver);
  //     console.log('[DriversGateway] Emitted driverUpdated:', driver.id);
  //   } else {
  //     console.error(
  //       '[DriversGateway] WebSocket server is null, cannot emit driverUpdated'
  //     );
  //   }
  //   return driver;
  // }

  @SubscribeMessage('newOrderForDriver')
  async handleNewOrder(@MessageBody() order: any) {
    const driverId = order.driver_id;
    if (this.server) {
      this.server.to(driverId).emit('incomingOrder', order);
      console.log(
        '[DriversGateway] Emitted incomingOrder to driver:',
        driverId
      );
    } else {
      console.error(
        '[DriversGateway] WebSocket server is null, cannot emit incomingOrder'
      );
    }
    return order;
  }

  public async notifyPartiesOnce(order: Order) {
    const notifyKey = `notify_${order.id}`;
    const redisLockKey = `lock:notify:${order.id}`;

    try {
      const isLocked = await this.redisClient.set(redisLockKey, 'locked', {
        NX: true,
        EX: 10
      });
      if (!isLocked) {
        console.log(
          `[DriversGateway] Notification for order ${order.id} already in progress, skipping`
        );
        return;
      }

      this.notificationLock.set(notifyKey, true);

      let driver = order.driver;
      if (!driver && order.driver_id) {
        console.warn(
          `[DriversGateway] order.driver is null, fetching driver with id: ${order.driver_id}`
        );
        driver = await this.dataSource.getRepository(Driver).findOne({
          where: { id: order.driver_id },
          relations: ['vehicle', 'rating']
        });
        if (!driver) {
          console.error(`[DriversGateway] Driver ${order.driver_id} not found`);
        }
      }

      // Include complete order status information
      const trackingUpdate = {
        orderId: order.id,
        status: order.status,
        tracking_info: order.tracking_info,
        updated_at: order.updated_at,
        customer_id: order.customer_id,
        driver_id: order.driver_id,
        restaurant_id: order.restaurant_id,
        restaurant_avatar: order.restaurant?.avatar || null,
        driver_avatar: driver?.avatar || order.driver?.avatar || null,
        order_details: {
          id: order.id,
          status: order.status,
          tracking_info: order.tracking_info,
          total_amount: order.total_amount,
          payment_method: order.payment_method,
          created_at: order.created_at,
          updated_at: order.updated_at,
          distance: order.distance,
          driver_tips: order.driver_tips,
          driver_wage: order.driver_wage,
          order_items: order.order_items,
          delivery_fee: order.delivery_fee,
          service_fee: order.service_fee,
          customer_note: order.customer_note,
          restaurant_note: order.restaurant_note
        },
        restaurantAddress: order.restaurantAddress || {
          id: '',
          street: 'N/A',
          city: '',
          nationality: '',
          is_default: false,
          created_at: 0,
          updated_at: 0,
          postal_code: 0,
          location: { lat: 0, lng: 0 },
          title: ''
        },
        customerAddress: order.customerAddress || {
          id: '',
          street: 'N/A',
          city: '',
          nationality: '',
          is_default: false,
          created_at: 0,
          updated_at: 0,
          postal_code: 0,
          location: { lat: 0, lng: 0 },
          title: ''
        },
        driverDetails: driver
          ? {
              id: driver.id,
              first_name: driver.first_name || 'N/A',
              last_name: driver.last_name || 'N/A',
              avatar: driver.avatar,
              rating: driver.rating || { average_rating: '4.8' },
              vehicle: driver.vehicle || {
                color: 'N/A',
                model: 'N/A',
                license_plate: 'N/A'
              }
            }
          : order.driver_id
            ? {
                id: order.driver_id,
                first_name: 'N/A',
                last_name: 'N/A',
                avatar: order.driver?.avatar || null,
                rating: { average_rating: '4.8' },
                vehicle: {
                  color: 'N/A',
                  model: 'N/A',
                  license_plate: 'N/A'
                }
              }
            : null,
        customerFullAddress: order.customerAddress
          ? `${order.customerAddress.street}, ${order.customerAddress.city}, ${order.customerAddress.nationality}`
          : 'N/A',
        restaurantFullAddress: order.restaurantAddress
          ? `${order.restaurantAddress.street}, ${order.restaurantAddress.city}, ${order.restaurantAddress.nationality}`
          : 'N/A'
      };

      console.log(
        '[DriversGateway] notifyPartiesOnce - trackingUpdate:',
        trackingUpdate
      );

      // Emit complete order status update
      this.eventEmitter.emit('listenUpdateOrderTracking', trackingUpdate);
      console.log(
        `[DriversGateway] Emitted complete order status update for order ${order.id}`
      );
    } catch (err) {
      console.error('[DriversGateway] Error in notifyPartiesOnce:', err);
    } finally {
      this.notificationLock.delete(notifyKey);
      await this.redisClient
        .del(redisLockKey)
        .catch(err => console.error('[Redis] Error releasing lock:', err));
    }
  }

  @SubscribeMessage('updateDriverProgress')
  async handleDriverProgressUpdate(
    @MessageBody() data: { stageId: string; orderId?: string }
  ) {
    try {
      const result = await this.dataSource.transaction(
        async transactionalEntityManager => {
          const dps = await transactionalEntityManager
            .getRepository(DriverProgressStage)
            .findOne({
              where: { id: data.stageId },
              relations: [
                'orders',
                'orders.restaurant',
                'orders.driver',
                'orders.customer',
                'orders.restaurantAddress',
                'orders.customerAddress'
              ]
            });
          if (!dps || !dps.orders || dps.orders.length === 0) {
            return {
              success: false,
              message: !dps
                ? 'Stage not found'
                : 'No orders associated with this stage'
            };
          }

          const oldStagesString = JSON.stringify(dps.stages);
          const oldCurrentState = dps.current_state;
          const oldPreviousState = dps.previous_state;
          const oldNextState = dps.next_state;

          const timestamp = Math.floor(Date.now() / 1000);
          const stageOrder = [
            'driver_ready',
            'waiting_for_pickup',
            'restaurant_pickup',
            'en_route_to_customer',
            'delivery_complete'
          ];
          const stageToStatusMap = {
            driver_ready: OrderStatus.DISPATCHED,
            waiting_for_pickup: OrderStatus.READY_FOR_PICKUP,
            restaurant_pickup: OrderStatus.RESTAURANT_PICKUP,
            en_route_to_customer: OrderStatus.EN_ROUTE,
            delivery_complete: OrderStatus.DELIVERED
          };
          const stageToTrackingMap = {
            driver_ready: OrderTrackingInfo.DISPATCHED,
            waiting_for_pickup: OrderTrackingInfo.PREPARING,
            restaurant_pickup: OrderTrackingInfo.RESTAURANT_PICKUP,
            en_route_to_customer: OrderTrackingInfo.EN_ROUTE,
            delivery_complete: OrderTrackingInfo.DELIVERED
          };

          let targetOrderId =
            data.orderId ||
            dps.orders.find((order, index) => {
              const orderSuffix = `order_${index + 1}`;
              const finalState = `delivery_complete_${orderSuffix}`;
              const finalStage = dps.stages.find(s => s.state === finalState);
              return finalStage && finalStage.status !== 'completed';
            })?.id ||
            dps.orders[0].id;

          let updatedStages = [...dps.stages];
          let allCompleted = true;

          for (const [index, order] of dps.orders.entries()) {
            const orderIndex = index + 1;
            const orderSuffix = `order_${orderIndex}`;
            let currentStageIndex = stageOrder.findIndex(baseState => {
              const state = `${baseState}_${orderSuffix}`;
              const stage = updatedStages.find(s => s.state === state);
              return stage && stage.status === 'in_progress';
            });

            if (currentStageIndex === -1) {
              for (let i = stageOrder.length - 1; i >= 0; i--) {
                const state = `${stageOrder[i]}_${orderSuffix}`;
                const stage = updatedStages.find(s => s.state === state);
                if (stage && stage.status === 'completed') {
                  currentStageIndex = i;
                  break;
                }
              }
            }

            if (order.id === targetOrderId) {
              if (currentStageIndex >= 0) {
                const currentState = `${stageOrder[currentStageIndex]}_${orderSuffix}`;
                const nextStateBase =
                  currentStageIndex < stageOrder.length - 1
                    ? stageOrder[currentStageIndex + 1]
                    : null;
                const nextState = nextStateBase
                  ? `${nextStateBase}_${orderSuffix}`
                  : null;

                updatedStages = updatedStages.map((stage): StageDto => {
                  if (
                    stage.state === currentState &&
                    stage.status === 'in_progress'
                  ) {
                    const actualTime = timestamp - stage.timestamp;
                    dps.actual_time_spent =
                      (dps.actual_time_spent || 0) + actualTime;
                    stage.details.actual_time = actualTime;
                    return {
                      ...stage,
                      status: 'completed',
                      duration: actualTime
                    };
                  }
                  if (nextState && stage.state === nextState) {
                    const estimatedTime = this.calculateEstimatedTime(
                      order.distance || 0
                    );
                    dps.estimated_time_remaining =
                      (dps.estimated_time_remaining || 0) -
                      (stage.details?.estimated_time || 0) +
                      estimatedTime;
                    stage.details.estimated_time = estimatedTime;

                    if (nextStateBase === 'delivery_complete') {
                      return {
                        ...stage,
                        status: 'completed',
                        timestamp,
                        duration: 0
                      };
                    } else if (stage.status === 'pending') {
                      return { ...stage, status: 'in_progress', timestamp };
                    }
                  }
                  return stage;
                });

                if (nextStateBase && nextStateBase in stageToStatusMap) {
                  const newStatus = stageToStatusMap[nextStateBase];
                  const newTrackingInfo = stageToTrackingMap[nextStateBase];
                  await transactionalEntityManager.update(
                    Order,
                    { id: order.id },
                    {
                      status: newStatus,
                      tracking_info: newTrackingInfo,
                      updated_at: Math.floor(Date.now() / 1000)
                    }
                  );

                  if (nextStateBase === 'delivery_complete') {
                    // Update order payment status for COD orders
                    if (order.payment_method === 'COD') {
                      await this.ordersService.updateOrderPaymentStatus(
                        order.id,
                        'PAID',
                        transactionalEntityManager
                      );
                    }

                    dps.total_tips =
                      (dps.total_tips || 0) + (order.driver_tips || 0);
                    dps.total_distance_travelled =
                      Number(dps.total_distance_travelled || 0) +
                      Number(order.distance || 0);

                    await transactionalEntityManager
                      .createQueryBuilder()
                      .delete()
                      .from('driver_current_orders')
                      .where('driver_id = :driverId', {
                        driverId: dps.driver_id
                      })
                      .andWhere('order_id = :orderId', { orderId: order.id })
                      .execute();
                  }
                }
              } else if (currentStageIndex < stageOrder.length - 1) {
                allCompleted = false;
                const nextState = `driver_ready_${orderSuffix}`;
                updatedStages = updatedStages.map((stage): StageDto => {
                  if (stage.state === nextState && stage.status === 'pending') {
                    const estimatedTime = this.calculateEstimatedTime(
                      order.distance || 0
                    );
                    dps.estimated_time_remaining =
                      (dps.estimated_time_remaining || 0) + estimatedTime;
                    stage.details.estimated_time = estimatedTime;
                    return { ...stage, status: 'in_progress', timestamp };
                  }
                  return stage;
                });

                const newStatus = stageToStatusMap['driver_ready'];
                const newTrackingInfo = stageToTrackingMap['driver_ready'];
                await transactionalEntityManager.update(
                  Order,
                  { id: order.id },
                  {
                    status: newStatus,
                    tracking_info: newTrackingInfo,
                    updated_at: Math.floor(Date.now() / 1000)
                  }
                );
              }
            }

            const finalState = `delivery_complete_${orderSuffix}`;
            const finalStage = updatedStages.find(s => s.state === finalState);
            if (!finalStage || finalStage.status !== 'completed')
              allCompleted = false;
          }

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
                  const estimatedTime = this.calculateEstimatedTime(
                    nextIncompleteOrder.distance || 0
                  );
                  dps.estimated_time_remaining =
                    (dps.estimated_time_remaining || 0) + estimatedTime;
                  stage.details.estimated_time = estimatedTime;
                  return { ...stage, status: 'in_progress', timestamp };
                }
                return stage;
              });
              targetOrderId = nextIncompleteOrder.id;

              const newStatus = stageToStatusMap['driver_ready'];
              const newTrackingInfo = stageToTrackingMap['driver_ready'];
              await transactionalEntityManager.update(
                Order,
                { id: targetOrderId },
                {
                  status: newStatus,
                  tracking_info: newTrackingInfo,
                  updated_at: Math.floor(Date.now() / 1000)
                }
              );
            }
          }

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
            newCurrentState = lastCompletedDelivery
              ? lastCompletedDelivery.state
              : dps.current_state;
            newPreviousState = lastCompletedDelivery
              ? dps.current_state
              : newPreviousState;
            newNextState = lastCompletedDelivery ? null : newNextState;
          }

          const allDeliveryCompleteStages = updatedStages.filter(stage =>
            stage.state.startsWith('delivery_complete_')
          );
          const allDeliveryCompleteDone = allDeliveryCompleteStages.every(
            stage => stage.status === 'completed'
          );

          const updateResult =
            await this.driverProgressStageService.updateStage(
              data.stageId,
              {
                current_state: newCurrentState,
                previous_state: newPreviousState,
                next_state: newNextState,
                stages: updatedStages,
                orders: dps.orders,
                estimated_time_remaining: dps.estimated_time_remaining,
                actual_time_spent: dps.actual_time_spent,
                total_distance_travelled: Number(
                  Number(dps.total_distance_travelled || 0).toFixed(4)
                ),
                total_tips: dps.total_tips,
                total_earns: dps.total_earns,
                transactions_processed:
                  dps.transactions_processed ||
                  (allDeliveryCompleteDone ? false : undefined)
              },
              transactionalEntityManager
            );

          if (
            allDeliveryCompleteDone &&
            allDeliveryCompleteStages.length > 0 &&
            !updateResult.data.transactions_processed
          ) {
            const driver = await transactionalEntityManager
              .getRepository(Driver)
              .findOne({ where: { id: dps.driver_id } });
            if (!driver) throw new Error(`Driver ${dps.driver_id} not found`);

            const driverWallet = await this.fWalletsRepository.findByUserId(
              driver.user_id,
              transactionalEntityManager
            );
            if (!driverWallet)
              throw new Error(`Wallet not found for driver ${dps.driver_id}`);

            for (const order of dps.orders) {
              if (order.payment_method === 'COD') {
                const restaurant = await transactionalEntityManager
                  .getRepository(Restaurant)
                  .findOne({ where: { id: order.restaurant_id } });
                if (!restaurant)
                  throw new Error(
                    `Restaurant ${order.restaurant_id} not found`
                  );

                const restaurantWallet =
                  await this.fWalletsRepository.findByUserId(
                    restaurant.owner_id,
                    transactionalEntityManager
                  );
                if (!restaurantWallet)
                  throw new Error(
                    `Wallet not found for restaurant ${order.restaurant_id}`
                  );

                const codTransactionDto: CreateTransactionDto = {
                  user_id: driver.user_id,
                  fwallet_id: driverWallet.id,
                  transaction_type: 'WITHDRAW',
                  amount: order.total_amount,
                  balance_after: 0,
                  version: 0,
                  status: 'PENDING',
                  source: 'FWALLET',
                  destination: restaurantWallet.id,
                  destination_type: 'FWALLET'
                };

                const codTransactionResponse =
                  await this.transactionsService.create(
                    codTransactionDto,
                    transactionalEntityManager
                  );
                if (codTransactionResponse.EC !== 0) {
                  throw new Error(
                    `COD Transaction failed: ${codTransactionResponse.EM}`
                  );
                }
                console.log(
                  '[DriversGateway] COD transaction from driver to restaurant succeeded:',
                  codTransactionResponse.data
                );

                // Update order payment status after successful transaction
                await this.ordersService.updateOrderPaymentStatus(
                  order.id,
                  'PAID',
                  transactionalEntityManager
                );
              }
            }

            console.log(
              '[DriversGateway] check total earns',
              dps.total_earns,
              'check driver wallet',
              driverWallet.id
            );

            if (dps.total_earns > 0) {
              console.log(
                '[DriversGateway] Processing earnings transaction for driver',
                driver.id,
                'amount:',
                dps.total_earns
              );

              let flashfoodWallet = await this.fWalletsRepository.findByUserId(
                FLASHFOOD_FINANCE_neon_test_branch.user_id,
                transactionalEntityManager
              );

              if (!flashfoodWallet) {
                console.log(
                  '[DriversGateway] FlashFood finance wallet not found, creating it'
                );
                flashfoodWallet = await this.fWalletsRepository.create(
                  {
                    user_id: FLASHFOOD_FINANCE_neon_test_branch.user_id,
                    balance: 1000000, // Initial balance for FlashFood finance wallet
                    email: FLASHFOOD_FINANCE_neon_test_branch.email,
                    password: 'dummy', // This is a system wallet, no need for real password
                    first_name: 'FlashFood',
                    last_name: 'Finance'
                  },
                  transactionalEntityManager
                );
                console.log(
                  '[DriversGateway] Created FlashFood finance wallet:',
                  flashfoodWallet.id
                );
              }

              const earningsTransactionDto: CreateTransactionDto = {
                user_id: driver.user_id,
                fwallet_id: flashfoodWallet.id,
                transaction_type: 'PURCHASE',
                amount: dps.total_earns,
                balance_after:
                  parseFloat(flashfoodWallet.balance.toString()) -
                  dps.total_earns,
                status: 'PENDING',
                version: 0,
                source: 'FWALLET',
                destination: driverWallet.id,
                destination_type: 'FWALLET'
              };

              console.log(
                '[DriversGateway] Creating earnings transaction:',
                earningsTransactionDto
              );

              const earningsTransactionResponse =
                await this.transactionsService.create(
                  earningsTransactionDto,
                  transactionalEntityManager
                );
              if (earningsTransactionResponse.EC !== 0) {
                throw new Error(
                  `Earnings Transaction failed: ${earningsTransactionResponse.EM}`
                );
              }
              console.log(
                '[DriversGateway] Earnings transaction for driver succeeded:',
                earningsTransactionResponse.data
              );

              dps.transactions_processed = true;
              await transactionalEntityManager.save(DriverProgressStage, dps);
            }
          }

          const newStagesString = JSON.stringify(updateResult.data.stages);
          const hasChanges =
            oldStagesString !== newStagesString ||
            oldCurrentState !== updateResult.data.current_state ||
            oldPreviousState !== updateResult.data.previous_state ||
            oldNextState !== updateResult.data.next_state;
          const allStagesCompleted = updateResult.data.stages.every(
            stage => stage.status === 'completed'
          );

          if (updateResult.EC === 0 && hasChanges) {
            if (this.server) {
              await this.server
                .to(`driver_${dps.driver_id}`)
                .emit('driverStagesUpdated', updateResult.data);
              console.log(
                '[DriversGateway] Emitted driverStagesUpdated:',
                updateResult.data
              );
            } else {
              console.error(
                '[DriversGateway] WebSocket server is null, cannot emit driverStagesUpdated'
              );
            }
          } else {
            console.log(
              '[DriversGateway] Skipped emitting driverStagesUpdated:',
              {
                reason: !hasChanges ? 'No changes detected' : 'Update failed',
                oldStagesString,
                newStagesString,
                oldCurrentState,
                newCurrentState: updateResult.data.current_state,
                allStagesCompleted
              }
            );
          }

          const updatedOrder = await transactionalEntityManager
            .getRepository(Order)
            .findOne({
              where: { id: targetOrderId },
              relations: [
                'restaurant',
                'driver',
                'customer',
                'restaurantAddress',
                'customerAddress'
              ]
            });

          if (!updatedOrder) {
            console.error(
              `[DriversGateway] Order ${targetOrderId} not found after update`
            );
            return { success: false, message: 'Order not found' };
          }

          if (!updatedOrder.driver && updatedOrder.driver_id) {
            console.warn(
              `[DriversGateway] updatedOrder.driver is null, fetching driver with id: ${updatedOrder.driver_id}`
            );
            updatedOrder.driver = await transactionalEntityManager
              .getRepository(Driver)
              .findOne({ where: { id: updatedOrder.driver_id } });
            if (!updatedOrder.driver) {
              console.error(
                `[DriversGateway] Driver ${updatedOrder.driver_id} not found`
              );
            }
          }

          console.log(
            '[DriversGateway] handleDriverProgressUpdate - updatedOrder.driver:',
            updatedOrder.driver
          );
          await this.notifyPartiesOnce(updatedOrder);

          return { success: true, stage: updateResult.data };
        }
      );
      return result;
    } catch (error: any) {
      console.error(
        '[DriversGateway] Error in handleDriverProgressUpdate:',
        error
      );
      return { success: false, message: 'Internal server error' };
    }
  }

  @SubscribeMessage('driverAcceptOrder')
  async handleDriverAcceptOrder(
    @MessageBody() data: { driverId: string; orderId: string }
  ) {
    console.log('[DriversGateway] Raw data received:', data);
    const { driverId, orderId } = data;

    if (!driverId || !driverId.startsWith('FF_DRI_')) {
      console.error(`[DriversGateway] Invalid driverId: ${driverId}`);
      return { success: false, message: 'Invalid driverId' };
    }
    if (!orderId || !orderId.startsWith('FF_ORDER_')) {
      console.error(`[DriversGateway] Invalid orderId: ${orderId}`);
      return { success: false, message: 'Invalid orderId' };
    }

    const lockKey = `${driverId}_${orderId}`;
    console.log(
      `[DriversGateway] Driver ${driverId} accepting order ${orderId}`
    );

    if (this.processingOrders.has(lockKey)) {
      console.log(
        `[DriversGateway] Order ${orderId} already being processed by driver ${driverId}`
      );
      return { success: false, message: 'Order is already being processed' };
    }

    this.processingOrders.add(lockKey);

    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        type TransactionResult = {
          success: boolean;
          order: Order;
          dps: DriverProgressStage;
        };

        const result = await Promise.race<TransactionResult | Error>([
          this.dataSource.transaction(
            'SERIALIZABLE',
            async transactionalEntityManager => {
              console.log(
                '[DriversGateway] Starting transaction for order:',
                orderId
              );

              const order = await transactionalEntityManager
                .getRepository(Order)
                .createQueryBuilder('order')
                .setLock('pessimistic_write')
                .where('order.id = :orderId', { orderId })
                .getOne();

              if (!order) {
                console.error(
                  `[DriversGateway] Order not found in DB for orderId: ${orderId}`
                );
                throw new WsException('Order not found');
              }

              const orderWithRelations = await transactionalEntityManager
                .getRepository(Order)
                .findOne({
                  where: { id: orderId },
                  relations: [
                    'customerAddress',
                    'restaurantAddress',
                    'customer',
                    'customer.address',
                    'restaurant',
                    'restaurant.address',
                    'driver'
                  ]
                });

              if (!orderWithRelations) throw new WsException('Order not found');

              const driver = await transactionalEntityManager
                .getRepository(Driver)
                .findOne({ where: { id: driverId } });

              if (!driver) throw new WsException('Driver not found');

              const driverWithRelations = await transactionalEntityManager
                .getRepository(Driver)
                .findOne({
                  where: { id: driverId },
                  relations: ['current_orders']
                });

              if (!driverWithRelations)
                throw new WsException('Driver not found');

              const existingDPS = await transactionalEntityManager
                .getRepository(DriverProgressStage)
                .createQueryBuilder('dps')
                .where('dps.driver_id = :driverId', { driverId })
                .andWhere('dps.current_state NOT LIKE :completedState', {
                  completedState: 'delivery_complete_%'
                })
                .getOne();

              let dps: DriverProgressStage;
              const timestamp = Math.floor(Date.now() / 1000);

              const rawDistance = orderWithRelations.distance || 0;
              const distance =
                typeof rawDistance === 'string'
                  ? parseFloat(rawDistance)
                  : Number(rawDistance);
              if (isNaN(distance)) {
                console.warn(
                  `[DriversGateway] Invalid distance value for order ${orderId}: ${rawDistance}`
                );
                throw new WsException('Invalid distance value in order');
              }

              const estimatedTime = this.calculateEstimatedTime(distance);
              const totalTips = orderWithRelations.driver_tips || 0;

              const latestFinanceRuleResponse =
                await this.financeRulesService.findOneLatest();
              const { EC, EM, data } = latestFinanceRuleResponse;
              console.log('[DriversGateway] check finance rule data:', data);

              if (EC !== 0) throw new WsException(EM);

              let driver_wage: number;
              if (distance >= 0 && distance <= 1) {
                driver_wage = Number(data.driver_fixed_wage['0-1km']);
              } else if (distance > 1 && distance <= 2) {
                driver_wage = Number(data.driver_fixed_wage['1-2km']);
              } else if (distance > 2 && distance <= 3) {
                driver_wage = Number(data.driver_fixed_wage['2-3km']);
              } else if (distance > 4 && distance <= 5) {
                driver_wage = Number(data.driver_fixed_wage['4-5km']);
              } else if (distance > 5) {
                const formula = data.driver_fixed_wage['>5km'];
                try {
                  driver_wage = evaluate(
                    formula.replace('km', distance.toString())
                  );
                  console.log(
                    '[DriversGateway] Calculated driver wage:',
                    driver_wage
                  );
                } catch (error: any) {
                  console.error(
                    '[DriversGateway] Error evaluating wage formula:',
                    error
                  );
                  throw new WsException('Invalid wage formula');
                }
              } else {
                console.warn(
                  `[DriversGateway] Invalid distance range for order ${orderId}: ${distance}`
                );
                throw new WsException('Invalid distance value');
              }
              console.log('[DriversGateway] check driver wage:', driver_wage);

              const totalEarns = driver_wage;
              console.log('[DriversGateway] check total earns:', totalEarns);

              if (!existingDPS) {
                console.log(
                  `[DriversGateway] No existing DPS found for driver ${driverId}, creating new one`
                );
                const dpsResponse =
                  await this.driverProgressStageService.create(
                    {
                      driver_id: driverId,
                      orders: [orderWithRelations],
                      current_state: 'driver_ready_order_1',
                      estimated_time_remaining: estimatedTime,
                      total_distance_travelled: Number(distance.toFixed(4)),
                      total_tips: totalTips,
                      total_earns: totalEarns
                    },
                    transactionalEntityManager
                  );
                if (dpsResponse.EC !== 0 || !dpsResponse.data)
                  throw new WsException(`Failed to create new DPS`);
                dps = dpsResponse.data;

                dps.stages = dps.stages.map(stage => {
                  const details = this.getStageDetails(
                    stage.state,
                    orderWithRelations,
                    driverWithRelations,
                    estimatedTime,
                    totalTips
                  );
                  return { ...stage, details };
                });
                console.log('[DriversGateway] Saving new DPS');
                await transactionalEntityManager.save(DriverProgressStage, dps);
                console.log(
                  `[DriversGateway] Created DPS with total_earns=${dps.total_earns}`
                );
              } else {
                console.log(
                  `[DriversGateway] Existing DPS found for driver ${driverId}, adding order`
                );
                const dpsResponse =
                  await this.driverProgressStageService.addOrderToExistingDPS(
                    existingDPS.id,
                    orderWithRelations,
                    transactionalEntityManager
                  );
                if (dpsResponse.EC !== 0 || !dpsResponse.data)
                  throw new WsException(`Failed to add order to existing DPS`);
                dps = dpsResponse.data;

                const orderAlreadyInDPS = dps.orders?.some(
                  o => o.id === orderId
                );
                if (!orderAlreadyInDPS) {
                  dps.total_distance_travelled =
                    (dps.total_distance_travelled || 0) +
                    Number(distance.toFixed(4));
                  dps.estimated_time_remaining =
                    (dps.estimated_time_remaining || 0) + estimatedTime;
                  dps.total_tips =
                    Number(dps.total_tips || 0) + Number(totalTips);
                  dps.total_earns =
                    Number(dps.total_earns || 0) + Number(totalEarns);
                } else {
                  console.log(
                    `[DriversGateway] Order ${orderId} already in DPS, skipping earnings update`
                  );
                }

                dps.stages = dps.stages.map(stage => {
                  const details = this.getStageDetails(
                    stage.state,
                    orderWithRelations,
                    driverWithRelations,
                    estimatedTime,
                    totalTips
                  );
                  return { ...stage, details };
                });
                console.log('[DriversGateway] Saving updated DPS');
                await transactionalEntityManager.save(DriverProgressStage, dps);
                console.log(
                  `[DriversGateway] Updated DPS with total_earns=${dps.total_earns}`
                );
              }

              orderWithRelations.driver_id = driverId;
              orderWithRelations.driver_wage = driver_wage;
              orderWithRelations.status = OrderStatus.DISPATCHED;
              orderWithRelations.tracking_info = OrderTrackingInfo.DISPATCHED;
              orderWithRelations.updated_at = timestamp;
              console.log(
                '[DriversGateway] Saving order with driver_id:',
                driverId,
                'driver_wage:',
                driver_wage
              );
              await transactionalEntityManager.save(Order, orderWithRelations);

              driverWithRelations.current_orders =
                driverWithRelations.current_orders || [];
              if (
                !driverWithRelations.current_orders.some(o => o.id === orderId)
              ) {
                driverWithRelations.current_orders.push(orderWithRelations);
              }
              console.log('[DriversGateway] Saving driver');
              await transactionalEntityManager.save(
                Driver,
                driverWithRelations
              );

              const updatedOrder = await transactionalEntityManager
                .getRepository(Order)
                .findOne({
                  where: { id: orderId },
                  relations: [
                    'customerAddress',
                    'restaurantAddress',
                    'customer',
                    'customer.address',
                    'restaurant',
                    'restaurant.address',
                    'driver'
                  ]
                });

              if (!updatedOrder)
                throw new WsException('Order not found after update');

              console.log(
                '[DriversGateway] Transaction completed, updatedOrder:',
                {
                  id: updatedOrder.id,
                  driver_id: updatedOrder.driver_id,
                  driver_wage: updatedOrder.driver_wage,
                  status: updatedOrder.status
                }
              );
              return { success: true, order: updatedOrder, dps };
            }
          ),
          new Promise<Error>((_, reject) =>
            setTimeout(
              () => reject(new Error('Transaction timeout after 30s')),
              30000
            )
          )
        ]);

        if (result instanceof Error) throw result;

        console.log('[DriversGateway] Updating stats');
        await this.driverStatsService.updateStatsForDriver(driverId, 'daily');

        console.log('[DriversGateway] Notifying parties');
        await this.notifyPartiesOnce(result.order);

        console.log('[DriversGateway] Emitting stages updated');
        const maxEmitRetries = 3;
        for (let i = 0; i < maxEmitRetries; i++) {
          try {
            if (this.server) {
              await this.server
                .to(`driver_${driverId}`)
                .emit('driverStagesUpdated', result.dps);
              console.log(
                '[DriversGateway] Emitted driverStagesUpdated to driver:',
                driverId
              );
              break;
            } else {
              console.error(
                '[DriversGateway] WebSocket server is null, cannot emit driverStagesUpdated'
              );
              break;
            }
          } catch (emitError) {
            console.warn(
              `[DriversGateway] Emit failed, retry ${i + 1}/${maxEmitRetries}:`,
              emitError
            );
            if (i === maxEmitRetries - 1)
              console.error('[DriversGateway] Emit failed after retries');
            await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
          }
        }

        return result;
      } catch (error: any) {
        if (error.code === '40001' && attempt < maxRetries - 1) {
          attempt++;
          console.log(
            `[DriversGateway] Retry attempt ${attempt} for driver ${driverId} due to serialization failure`
          );
          await new Promise(resolve => setTimeout(resolve, 100 * attempt));
          continue;
        }
        console.error(
          '[DriversGateway] Error in handleDriverAcceptOrder:',
          error
        );
        return {
          success: false,
          message: error.message || 'Internal server error'
        };
      } finally {
        this.processingOrders.delete(lockKey);
        console.log(`[DriversGateway] Processing lock released for ${lockKey}`);
      }
    }
  }

  private calculateEstimatedTime(distance: number): number {
    return (distance / 30) * 60;
  }

  private getStageDetails(
    state: string,
    order: Order,
    driver: Driver,
    estimatedTime: number,
    tip: number
  ): any {
    const baseDetails = {
      estimated_time: estimatedTime,
      actual_time: 0,
      notes: '',
      tip: state.includes('delivery_complete') ? tip : 0
    };

    if (
      state.startsWith('waiting_for_pickup_') ||
      state.startsWith('restaurant_pickup_')
    ) {
      return {
        ...baseDetails,
        location: order.restaurantAddress?.location,
        restaurantDetails: order.restaurant
          ? {
              id: order.restaurant.id,
              restaurant_name: order.restaurant.restaurant_name,
              address: order.restaurant.address,
              avatar: order.restaurant.avatar,
              contact_phone: order.restaurant.contact_phone
            }
          : undefined
      };
    } else if (
      state.startsWith('en_route_to_customer_') ||
      state.startsWith('delivery_complete_')
    ) {
      return {
        ...baseDetails,
        location: order.customerAddress?.location,
        customerDetails: order.customer
          ? {
              id: order.customer.id,
              first_name: order.customer.first_name,
              last_name: order.customer.last_name,
              address: order.customer.address,
              avatar: order.customer.avatar
            }
          : undefined
      };
    } else if (state.startsWith('driver_ready_')) {
      return {
        ...baseDetails,
        location: driver.current_location
      };
    }
    return baseDetails;
  }

  @OnEvent('order.assignedToDriver')
  async handleOrderAssignedToDriver(orderAssignment: any) {
    try {
      const driverId = orderAssignment.driverListenerId;
      if (!driverId) throw new WsException('Driver ID is required');

      const order = await this.ordersService.findOne(orderAssignment.id);

      if (!order?.data) throw new WsException('Order not found');

      const driverNotificationData = this.prepareDriverNotificationData(
        order.data
      );

      const clients = await this.server.in(`driver_${driverId}`).fetchSockets();
      console.log(
        `[DriversGateway] Emitting to room driver_${driverId}, clients: ${clients.length}`
      );

      await this.server
        .to(`driver_${driverId}`)
        .emit('incomingOrderForDriver', {
          event: 'incomingOrderForDriver',
          data: {
            ...driverNotificationData,
            driver_wage: orderAssignment.driver_wage,
            driver_earn: orderAssignment.driver_wage
          },
          message: 'Order received successfully'
        });

      console.log(
        `[DriversGateway] Emitted incomingOrderForDriver to driver ${driverId}`
      );

      return { event: 'orderAssigned', data: { success: true } };
    } catch (error: any) {
      console.error(
        '[DriversGateway] Error handling order.assignedToDriver:',
        error
      );
      throw new WsException(
        error instanceof WsException ? error.message : 'Internal server error'
      );
    }
  }

  private prepareDriverNotificationData(order: any) {
    return {
      orderId: order.id,
      customer_id: order.customer_id,
      restaurant_id: order.restaurant_id,
      driver_id: order.driver_id,
      status: order.status,
      tracking_info: order.tracking_info,
      updated_at: order.updated_at,
      restaurantAddress: order.restaurantAddress,
      customerAddress: order.customerAddress,
      restaurant: order.restaurant
        ? { id: order.restaurant.id, name: order.restaurant.name }
        : null,
      customer: order.customer
        ? { id: order.customer.id, name: order.customer.name }
        : null,
      driver: order.driver
        ? {
            id: order.driver.id,
            name: order.driver.name,
            avatar: order.driver.avatar
          }
        : null
    };
  }

  private prepareAddressData(address: any) {
    return (
      address || {
        id: '',
        street: 'N/A',
        city: '',
        nationality: '',
        is_default: false,
        created_at: 0,
        updated_at: 0,
        postal_code: 0,
        location: { lat: 0, lon: 0 },
        title: ''
      }
    );
  }

  private prepareDriverDetails(driver: any) {
    if (!driver) return null;

    return {
      id: driver.id,
      first_name: driver.first_name || 'N/A',
      last_name: driver.last_name || 'N/A',
      avatar: driver.avatar,
      rating: driver.rating || { average_rating: '4.8' },
      vehicle: driver.vehicle || {
        color: 'N/A',
        model: 'N/A',
        license_plate: 'N/A'
      }
    };
  }

  private formatFullAddress(address: any) {
    if (!address) return 'N/A';
    return `${address.street}, ${address.city}, ${address.nationality}`;
  }
}
