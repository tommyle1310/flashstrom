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
import { DataSource, EntityManager } from 'typeorm';
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
// import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { FLASHFOOD_FINANCE_neon_test_branch } from 'src/utils/constants';
import { createAdapter } from '@socket.io/redis-adapter';
import { RedisService } from 'src/redis/redis.service';
import { Logger } from '@nestjs/common';
import { UserRepository } from 'src/users/users.repository';
import * as bcrypt from 'bcryptjs';
import { Enum_UserType } from 'src/types/Payload';
import { Transaction } from 'src/transactions/entities/transaction.entity';
import * as fs from 'fs';
import * as path from 'path';

const logger = new Logger('DriversGateway');

// Setup file logging
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logFile = path.join(logDir, 'driver_gateway.log');

function logToFile(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}\n`;
  fs.appendFileSync(logFile, logMessage);
}

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
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => UserRepository))
    private readonly userRepository: UserRepository
  ) {
    logger.log('DriversGateway constructor called');
    logger.log('Checking injected dependencies:');
    logger.log(
      '- driverProgressStageRepository:',
      !!this.driverProgressStageService
    );
    logger.log(
      '- driverProgressStageService:',
      !!this.driverProgressStageService
    );
    logger.log('- transactionsService:', !!this.transactionsService);
    logger.log('- ordersService:', !!this.ordersService);
    logger.log('- fWalletsRepository:', !!this.fWalletsRepository);
    logger.log('- server:', !!this.server);
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
    logger.log('Received updateDriverProgress event:', data);
    try {
      const result = await this.dataSource.transaction(
        async transactionalEntityManager => {
          logger.log('Starting transaction for driver progress update');

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
            logger.warn('Stage or orders not found:', {
              stageId: data.stageId,
              dpsExists: !!dps,
              ordersExist: dps?.orders?.length > 0
            });
            return {
              success: false,
              message: !dps
                ? 'Stage not found'
                : 'No orders associated with this stage'
            };
          }
          logger.log('Found driver progress stage:', {
            id: dps.id,
            ordersCount: dps.orders.length
          });

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

                // If this is a delivery completion, process it first
                if (nextStateBase === 'delivery_complete') {
                  try {
                    await this.handleDeliveryCompletion(
                      order,
                      dps,
                      transactionalEntityManager
                    );
                  } catch (error) {
                    logger.error('Error completing delivery:', error);
                    throw error;
                  }
                }

                // Update stages
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

                // Update order status based on next state
                if (nextStateBase && nextStateBase in stageToStatusMap) {
                  const newStatus = stageToStatusMap[nextStateBase];
                  const newTrackingInfo = stageToTrackingMap[nextStateBase];

                  logger.log(
                    `Updating order ${order.id} status from ${order.status} to ${newStatus}`
                  );

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
            // Check if any order in this DPS already has a per-order transaction
            let anyOrderHasTransaction = false;
            for (const order of dps.orders) {
              const existingTx = await transactionalEntityManager
                .getRepository(Transaction)
                .findOne({
                  where: {
                    source: 'FWALLET',
                    destination_type: 'FWALLET',
                    reference_order_id: order.id,
                    transaction_type: 'PURCHASE'
                  }
                });
              if (existingTx) {
                anyOrderHasTransaction = true;
                break;
              }
            }
            if (!anyOrderHasTransaction) {
              logger.log(
                'Processing driver earnings for completed deliveries (DPS-level, no per-order tx exists)'
              );
              const driver = await transactionalEntityManager
                .getRepository(Driver)
                .findOne({ where: { id: dps.driver_id } });
              if (!driver) {
                logger.error(`Driver ${dps.driver_id} not found`);
                throw new Error(`Driver ${dps.driver_id} not found`);
              }
              const driverWallet = await this.fWalletsRepository.findByUserId(
                driver.user_id,
                transactionalEntityManager
              );
              if (!driverWallet) {
                logger.error(`Wallet not found for driver ${dps.driver_id}`);
                throw new Error(`Wallet not found for driver ${dps.driver_id}`);
              }
              let flashfoodWallet = await this.fWalletsRepository.findById(
                FLASHFOOD_FINANCE_neon_test_branch.id,
                transactionalEntityManager
              );
              if (!flashfoodWallet) {
                let flashfoodUser = await this.userRepository.findById(
                  FLASHFOOD_FINANCE_neon_test_branch.user_id
                );
                if (!flashfoodUser) {
                  flashfoodUser = await this.userRepository.create({
                    id: FLASHFOOD_FINANCE_neon_test_branch.user_id,
                    email: FLASHFOOD_FINANCE_neon_test_branch.email,
                    password: await bcrypt.hash('flashfood123', 10),
                    first_name: 'FlashFood',
                    last_name: 'Finance',
                    user_type: [Enum_UserType.F_WALLET],
                    is_verified: true
                  });
                }
                flashfoodWallet = await this.fWalletsRepository.create(
                  {
                    user_id: flashfoodUser.id,
                    balance: 1000000,
                    email: flashfoodUser.email,
                    password: 'dummy',
                    first_name: flashfoodUser.first_name,
                    last_name: flashfoodUser.last_name
                  },
                  transactionalEntityManager
                );
              }
              const earningsTransactionDto: CreateTransactionDto = {
                user_id: driver.user_id,
                fwallet_id: flashfoodWallet.id,
                transaction_type: 'PURCHASE',
                amount: dps.total_earns,
                balance_after:
                  Number(flashfoodWallet.balance) - dps.total_earns,
                status: 'PENDING',
                version: flashfoodWallet.version || 0,
                source: 'FWALLET',
                destination: driverWallet.id,
                destination_type: 'FWALLET'
              };
              const earningsTransactionResponse =
                await this.transactionsService.create(
                  earningsTransactionDto,
                  transactionalEntityManager
                );
              if (earningsTransactionResponse.EC !== 0) {
                logger.error(
                  'Driver earnings transaction failed:',
                  earningsTransactionResponse
                );
                throw new Error(
                  `Earnings transaction failed: ${earningsTransactionResponse.EM}`
                );
              }
              logger.log(
                'Driver earnings transaction created successfully:',
                earningsTransactionResponse.data
              );
              dps.transactions_processed = true;
              await transactionalEntityManager.save(DriverProgressStage, dps);
              logger.log(
                'Updated driver progress stage transactions_processed flag'
              );
            } else {
              logger.log(
                'Skipped DPS-level transaction: at least one per-order transaction exists'
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
              logger.log('Emitting driverStagesUpdated event');
              await this.server
                .to(`driver_${dps.driver_id}`)
                .emit('driverStagesUpdated', updateResult.data);
              logger.log('Successfully emitted driverStagesUpdated event');
            } else {
              logger.error(
                'WebSocket server is null, cannot emit driverStagesUpdated'
              );
            }
          } else {
            logger.log('Skipped emitting driverStagesUpdated:', {
              reason: !hasChanges ? 'No changes detected' : 'Update failed',
              oldStagesString,
              newStagesString,
              oldCurrentState,
              newCurrentState: updateResult.data.current_state,
              allStagesCompleted
            });
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
      logger.error('Error in handleDriverProgressUpdate:', error);
      throw error;
    }
  }

  @SubscribeMessage('driverAcceptOrder')
  async handleDriverAcceptOrder(
    @MessageBody() data: { driverId: string; orderId: string }
  ) {
    console.log('[DriversGateway] Raw data received:', data);
    const { driverId, orderId } = data;

    // Add lock to prevent duplicate processing
    const lockKey = `driver_accept_order:${orderId}:${driverId}`;
    const lockAcquired = await this.redisService.setNx(
      lockKey,
      'locked',
      30000
    );
    if (!lockAcquired) {
      console.log('[DriversGateway] Order already being processed:', lockKey);
      return { success: false, message: 'Order already being processed' };
    }

    try {
      const result = await this.dataSource.transaction(
        async transactionalEntityManager => {
          console.log(
            '[DriversGateway] Starting transaction for driver accept order'
          );

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
                'restaurant.address'
              ]
            });

          if (!orderWithRelations) {
            throw new WsException('Order not found');
          }

          const driverWithRelations = await transactionalEntityManager
            .getRepository(Driver)
            .findOne({
              where: { id: driverId },
              relations: ['current_orders']
            });

          if (!driverWithRelations) {
            throw new WsException('Driver not found');
          }

          // Get restaurant and customer locations with proper validation
          const restaurantLocation =
            orderWithRelations.restaurantAddress?.location;
          const customerLocation = orderWithRelations.customerAddress?.location;

          // Validate location data
          if (!restaurantLocation || !customerLocation) {
            console.error('Missing location data:', {
              restaurant: restaurantLocation,
              customer: customerLocation
            });
            throw new WsException('Missing location data');
          }

          // Ensure location data has proper format
          const restaurantLat = Number(restaurantLocation.lat);
          const restaurantLng = Number(restaurantLocation.lng);
          const customerLat = Number(customerLocation.lat);
          const customerLng = Number(customerLocation.lng);

          if (
            isNaN(restaurantLat) ||
            isNaN(restaurantLng) ||
            isNaN(customerLat) ||
            isNaN(customerLng)
          ) {
            console.error('Invalid location coordinates:', {
              restaurant: { lat: restaurantLat, lng: restaurantLng },
              customer: { lat: customerLat, lng: customerLng }
            });
            throw new WsException('Invalid location coordinates');
          }

          // Calculate distance between restaurant and customer
          const distance = this.calculateDistance(
            restaurantLat,
            restaurantLng,
            customerLat,
            customerLng
          );

          console.log('[DriversGateway] Calculated distance:', distance);

          // Update order with calculated distance
          orderWithRelations.distance = distance;

          // Check for existing DPS with a lock
          const existingDPS = await transactionalEntityManager
            .getRepository(DriverProgressStage)
            .createQueryBuilder('dps')
            .where('dps.driver_id = :driverId', { driverId })
            .andWhere('dps.current_state NOT LIKE :completedState', {
              completedState: 'delivery_complete_%'
            })
            .getOne();

          const timestamp = Math.floor(Date.now() / 1000);
          const estimatedTime = this.calculateEstimatedTime(distance);
          const totalTips = orderWithRelations.driver_tips || 0;

          const latestFinanceRuleResponse =
            await this.financeRulesService.findOneLatest();
          const { EC, EM, data: financeRules } = latestFinanceRuleResponse;

          if (EC !== 0) throw new WsException(EM);

          // Calculate driver wage based on distance
          let driver_wage: number;
          if (distance >= 0 && distance <= 1) {
            driver_wage = Number(financeRules.driver_fixed_wage['0-1km']);
          } else if (distance > 1 && distance <= 2) {
            driver_wage = Number(financeRules.driver_fixed_wage['1-2km']);
          } else if (distance > 2 && distance <= 3) {
            driver_wage = Number(financeRules.driver_fixed_wage['2-3km']);
          } else if (distance > 4 && distance <= 5) {
            driver_wage = Number(financeRules.driver_fixed_wage['4-5km']);
          } else if (distance > 5) {
            const formula = financeRules.driver_fixed_wage['>5km'];
            try {
              driver_wage = evaluate(
                formula.replace('km', distance.toString())
              );
            } catch (error) {
              console.error('Error evaluating wage formula:', error);
              driver_wage = Number(financeRules.driver_fixed_wage['4-5km']);
            }
          } else {
            driver_wage = Number(financeRules.driver_fixed_wage['0-1km']);
          }

          const totalEarns = driver_wage + totalTips;

          let dps: DriverProgressStage;
          if (!existingDPS) {
            console.log(
              `[DriversGateway] Creating new DPS for driver ${driverId}`
            );
            const dpsResponse = await this.driverProgressStageService.create(
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

            if (dpsResponse.EC !== 0 || !dpsResponse.data) {
              throw new WsException('Failed to create DPS');
            }

            dps = dpsResponse.data;
            dps.stages = dps.stages.map(stage => ({
              ...stage,
              details: this.getStageDetails(
                stage.state,
                orderWithRelations,
                driverWithRelations,
                estimatedTime,
                totalTips
              )
            }));

            await transactionalEntityManager.save(DriverProgressStage, dps);
          } else {
            console.log(
              `[DriversGateway] Adding order to existing DPS ${existingDPS.id}`
            );
            const dpsResponse =
              await this.driverProgressStageService.addOrderToExistingDPS(
                existingDPS.id,
                orderWithRelations,
                transactionalEntityManager
              );

            if (dpsResponse.EC !== 0 || !dpsResponse.data) {
              throw new WsException('Failed to update DPS');
            }

            dps = dpsResponse.data;
            if (!dps.orders?.some(o => o.id === orderId)) {
              dps.total_distance_travelled = Number(
                (Number(dps.total_distance_travelled || 0) + distance).toFixed(
                  4
                )
              );
              dps.estimated_time_remaining =
                (dps.estimated_time_remaining || 0) + estimatedTime;
              dps.total_tips = Number(dps.total_tips || 0) + Number(totalTips);
              dps.total_earns =
                Number(dps.total_earns || 0) + Number(totalEarns);
            }

            dps.stages = dps.stages.map(stage => ({
              ...stage,
              details: this.getStageDetails(
                stage.state,
                orderWithRelations,
                driverWithRelations,
                estimatedTime,
                totalTips
              )
            }));

            await transactionalEntityManager.save(DriverProgressStage, dps);
          }

          // Update order
          orderWithRelations.driver_id = driverId;
          orderWithRelations.driver_wage = driver_wage;
          orderWithRelations.status = OrderStatus.DISPATCHED;
          orderWithRelations.tracking_info = OrderTrackingInfo.DISPATCHED;
          orderWithRelations.updated_at = timestamp;
          await transactionalEntityManager.save(Order, orderWithRelations);

          // Update driver's current orders
          if (
            !driverWithRelations.current_orders?.some(o => o.id === orderId)
          ) {
            driverWithRelations.current_orders = [
              ...(driverWithRelations.current_orders || []),
              orderWithRelations
            ];
            await transactionalEntityManager.save(Driver, driverWithRelations);
          }

          // Emit events
          this.server.to(`driver_${driverId}`).emit('driverStagesUpdated', dps);
          this.eventEmitter.emit('order.statusUpdated', {
            orderId,
            status: OrderStatus.DISPATCHED,
            driverId
          });

          return {
            success: true,
            data: { order: orderWithRelations, dps }
          };
        }
      );

      return result;
    } catch (error) {
      console.error(
        '[DriversGateway] Error in handleDriverAcceptOrder:',
        error
      );
      throw error;
    } finally {
      await this.redisService.del(lockKey);
    }
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    // Validate inputs
    if (
      !lat1 ||
      !lon1 ||
      !lat2 ||
      !lon2 ||
      isNaN(lat1) ||
      isNaN(lon1) ||
      isNaN(lat2) ||
      isNaN(lon2)
    ) {
      console.warn('Invalid coordinates:', { lat1, lon1, lat2, lon2 });
      return 0;
    }

    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return Number(distance.toFixed(4));
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
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
    const defaultAddress = {
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
    };

    if (!address) return defaultAddress;

    // Ensure location data exists and is valid
    if (
      !address.location ||
      !address.location.lat ||
      !address.location.lng ||
      isNaN(address.location.lat) ||
      isNaN(address.location.lng)
    ) {
      console.warn('Invalid location data in address:', address);
      address.location = defaultAddress.location;
    }

    return address;
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

  private async handleDeliveryCompletion(
    order: Order,
    dps: DriverProgressStage,
    transactionalEntityManager: EntityManager
  ): Promise<void> {
    logToFile('Starting handleDeliveryCompletion', {
      orderId: order.id,
      dpsId: dps.id
    });

    // Calculate accurate distance first
    const rawDistance = order.distance || 0;
    logToFile('Raw distance from order', { orderId: order.id, rawDistance });

    // Log address and location info for debugging
    const addressInfo = {
      orderId: order.id,
      customerAddress: order.customerAddress,
      restaurantAddress: order.restaurantAddress,
      customerLocation: order.customerAddress?.location,
      restaurantLocation: order.restaurantAddress?.location
    };
    logToFile('Order address info', addressInfo);

    let distance = 0;
    if (order.customerAddress?.location && order.restaurantAddress?.location) {
      const cLoc = order.customerAddress.location;
      const rLoc = order.restaurantAddress.location;
      const locationInfo = {
        customerLat: cLoc.lat,
        customerLng: cLoc.lng,
        restaurantLat: rLoc.lat,
        restaurantLng: rLoc.lng
      };
      logToFile('Calculating distance with locations', locationInfo);

      distance = this.calculateDistance(cLoc.lat, cLoc.lng, rLoc.lat, rLoc.lng);
      logToFile('Calculated distance', { distance });
    } else {
      logToFile('WARNING: Missing location data', addressInfo);
      distance = rawDistance;
    }

    // Update order with accurate distance
    order.distance = distance;
    await transactionalEntityManager.save(Order, order);
    logToFile('Updated order distance', { orderId: order.id, distance });

    // Update DPS total distance
    dps.total_distance_travelled =
      (dps.total_distance_travelled || 0) + distance;
    await transactionalEntityManager.save(DriverProgressStage, dps);
    logToFile('Updated DPS total distance', {
      dpsId: dps.id,
      totalDistance: dps.total_distance_travelled
    });

    // Create transaction with Redis lock
    const lockKey = `order_transaction:${order.id}`;
    const lockAcquired = await this.redisService.setNx(lockKey, 'locked', 5000);

    try {
      if (!lockAcquired) {
        logToFile('Failed to acquire lock for transaction', {
          orderId: order.id
        });
        return;
      }

      // Check if transaction already exists
      const existingTx = await transactionalEntityManager
        .getRepository(Transaction)
        .findOne({
          where: {
            source: 'FWALLET',
            destination_type: 'FWALLET',
            reference_order_id: order.id,
            transaction_type: 'PURCHASE'
          }
        });

      if (existingTx) {
        logToFile('Transaction already exists, skipping', {
          orderId: order.id,
          transactionId: existingTx.id
        });
        return;
      }

      // Get driver wallet
      const driverWallet = await this.fWalletsRepository.findByUserId(
        order.driver.user_id,
        transactionalEntityManager
      );
      if (!driverWallet) {
        throw new Error(`Wallet not found for driver ${order.driver.id}`);
      }

      // Get finance wallet (source)
      let financeWallet = await this.fWalletsRepository.findById(
        FLASHFOOD_FINANCE_neon_test_branch.id,
        transactionalEntityManager
      );
      if (!financeWallet) {
        throw new Error('Finance wallet not found');
      }

      // Retry up to 3 times for wallet version mismatch
      let transactionResponse;
      let attempt = 0;
      let lastError;
      while (attempt < 3) {
        transactionResponse = await this.transactionsService.create(
          {
            user_id: order.driver.user_id,
            fwallet_id: financeWallet.id,
            transaction_type: 'PURCHASE',
            amount: order.delivery_fee,
            balance_after:
              Number(financeWallet.balance) - Number(order.delivery_fee),
            version: financeWallet.version || 0,
            status: 'PENDING',
            source: 'FWALLET',
            destination_type: 'FWALLET',
            destination: driverWallet.id,
            reference_order_id: order.id
          },
          transactionalEntityManager
        );
        if (transactionResponse.EC === 0) {
          break;
        }
        if (
          transactionResponse.EM &&
          transactionResponse.EM.includes('Wallet version mismatch')
        ) {
          // Refetch finance wallet and retry
          financeWallet = await this.fWalletsRepository.findById(
            FLASHFOOD_FINANCE_neon_test_branch.id,
            transactionalEntityManager
          );
          attempt++;
          lastError = transactionResponse.EM;
          continue;
        }
        // Other error, break
        lastError = transactionResponse.EM;
        break;
      }
      if (transactionResponse.EC !== 0) {
        throw new Error(
          `Transaction failed: ${lastError || transactionResponse.EM}`
        );
      }

      logToFile('Created transaction', {
        orderId: order.id,
        transactionId: transactionResponse.data.id,
        amount: transactionResponse.data.amount
      });
    } catch (error: any) {
      logToFile('Error creating transaction', {
        orderId: order.id,
        error: error.message,
        stack: error.stack
      });
      throw error;
    } finally {
      if (lockAcquired) {
        await this.redisService.del(lockKey);
      }
    }
  }
}
