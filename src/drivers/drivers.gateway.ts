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
import { FWalletsRepository } from 'src/fwallets/fwallets.repository';
import { TransactionService } from 'src/transactions/transactions.service';
import { FLASHFOOD_FINANCE } from 'src/utils/constants';
import { createAdapter } from '@socket.io/redis-adapter';
import { RedisService } from 'src/redis/redis.service';
import { Logger } from '@nestjs/common';
import { UserRepository } from 'src/users/users.repository';
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
            setTimeout(connectRedis, 2000);
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
    // Set max listeners to prevent memory leak
    this.server.setMaxListeners(50); // Reduced to a reasonable limit
    this.registerEventListeners();
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
      console.log('⚡️ Client connected to driver namespace: ID:', client.id);
      const driverData = await this.validateToken(client);
      if (!driverData) {
        console.log(
          '[DriversGateway] Invalid token, disconnecting:',
          client.id
        );
        client.disconnect(true);
        return false;
      }

      const driverId = driverData.id;
      console.log(
        `[DriversGateway] Driver ${driverId} attempting connection:`,
        client.id
      );

      // Lock for connection handling
      const lockKey = `lock:driver:connect:${driverId}`;
      const maxRetries = 8; // Increased for better contention handling
      const baseRetryDelay = 1500; // Increased base delay
      const lockTTL = 15000; // Increased TTL to 15 seconds

      let lockAcquired = false;
      let retryCount = 0;

      while (!lockAcquired && retryCount < maxRetries) {
        lockAcquired = await this.redisService.setNx(
          lockKey,
          client.id,
          lockTTL
        );
        if (!lockAcquired) {
          const existingId = await this.redisService.get(lockKey);
          if (existingId && existingId !== client.id) {
            const existingSocket = this.activeConnections.get(existingId);
            if (existingSocket?.connected) {
              console.log(
                `[DriversGateway] Existing connection for driver ${driverId} with socket ${existingId}, waiting`
              );
              // Add jitter to retry delay
              const jitter = Math.random() * 100;
              await new Promise(resolve =>
                setTimeout(resolve, baseRetryDelay + jitter)
              );
              retryCount++;
              console.log(
                `[DriversGateway] Retrying lock for driver ${driverId} (${retryCount}/${maxRetries})`
              );
              continue;
            }
            console.log(
              `[DriversGateway] Clearing stale lock for driver ${driverId}`
            );
            await this.redisService.del(lockKey); // Clear stale lock
          }
          retryCount++;
          const jitter = Math.random() * 100;
          console.log(
            `[DriversGateway] Retrying lock for driver ${driverId} (${retryCount}/${maxRetries})`
          );
          await new Promise(resolve =>
            setTimeout(resolve, baseRetryDelay + jitter)
          );
        }
      }

      if (!lockAcquired) {
        console.error(
          `[DriversGateway] Failed to acquire lock for driver ${driverId} after ${maxRetries} retries, disconnecting ${client.id}`
        );
        client.emit('connection_rejected', {
          reason: 'Too many connection attempts'
        });
        client.disconnect(true);
        return false;
      }

      try {
        // Check existing clients
        const clients = await this.server
          .in(`driver_${driverId}`)
          .fetchSockets();
        if (clients.length > 0) {
          console.log(
            `[DriversGateway] Existing clients in room driver_${driverId}, cleaning up`
          );
          await this.cleanupDriverConnections(driverId, client.id);
        }

        // Join room
        await client.join(`driver_${driverId}`);
        console.log(`Driver auto-joined driver_${driverId}`);

        // Update socket set
        let socketSet = this.driverSockets.get(driverId);
        if (!socketSet) {
          socketSet = new Set();
          this.driverSockets.set(driverId, socketSet);
        }
        socketSet.add(client.id);
        console.log(
          `[DriversGateway] Updated socket set for driver ${driverId}:`,
          socketSet
        );

        // Store active connection
        this.activeConnections.set(client.id, client);

        // Limit disconnect listeners to prevent memory leak
        client.setMaxListeners(10);

        // Log clients
        const updatedClients = await this.server
          .in(`driver_${driverId}`)
          .fetchSockets();
        console.log(
          `[DriversGateway] Clients in room driver_${driverId}:`,
          updatedClients.length
        );

        // Emit connected event
        client.emit('connected', { driverId, status: 'connected' });
        return true;
      } finally {
        await this.redisService.del(lockKey);
      }
    } catch (error: any) {
      console.error('[DriversGateway] Connection error:', error.message);
      client.emit('connection_error', { reason: error.message });
      client.disconnect(true);
      return false;
    }
  }

  // Replace cleanupDriverConnections
  async cleanupDriverConnections(driverId: string, newSocketId: string) {
    console.log(
      `[DriversGateway] Cleaning up connections for driver ${driverId}`
    );
    const socketSet = this.driverSockets.get(driverId) || new Set();
    const existingSockets = await this.server
      .in(`driver_${driverId}`)
      .fetchSockets();

    for (const socket of existingSockets) {
      if (socket.id !== newSocketId) {
        const activeSocket = this.activeConnections.get(socket.id);
        if (activeSocket?.connected) {
          console.log(
            `[DriversGateway] Disconnecting old socket ${socket.id} for driver ${driverId}`
          );
          activeSocket.emit('force_disconnect', {
            reason: 'New connection established'
          });
          await new Promise(resolve => setTimeout(resolve, 500)); // Increased delay for event delivery
          activeSocket.leave(`driver_${driverId}`);
          activeSocket.disconnect(true);
          this.activeConnections.delete(socket.id);
          socketSet.delete(socket.id);
        }
      }
    }

    if (socketSet.size === 0) {
      this.driverSockets.delete(driverId);
    }
    console.log(
      `[DriversGateway] Updated socket set for driver ${driverId}:`,
      socketSet
    );

    this.notificationLock.delete(`notify_${driverId}`);
    this.processingOrders.forEach(lock => {
      if (lock.startsWith(`${driverId}_`)) {
        this.processingOrders.delete(lock);
      }
    });
    this.dpsCreationLocks.delete(driverId);
  }

  // Update handleDisconnect
  handleDisconnect(client: Socket) {
    console.log(`[DriversGateway] Driver disconnected: ${client.id}`);
    const driverId = Array.from(this.driverSockets.entries()).find(
      ([_, sockets]) => sockets.has(client.id)
    )?.[0];

    this.activeConnections.delete(client.id);

    if (driverId) {
      const socketSet = this.driverSockets.get(driverId);
      if (socketSet) {
        socketSet.delete(client.id);
        if (socketSet.size === 0) {
          this.driverSockets.delete(driverId);
        }
        console.log(
          `[DriversGateway] Updated socket set for driver ${driverId}:`,
          socketSet
        );
      }
      client.leave(`driver_${driverId}`);
      // Remove only specific listeners to prevent leaks
      client.removeAllListeners('updateDriverProgress');
      client.removeAllListeners('driverAcceptOrder');
      client.removeAllListeners('newOrderForDriver');

      this.processingOrders.forEach(lock => {
        if (lock.startsWith(`${driverId}_`)) {
          this.processingOrders.delete(lock);
        }
      });
      this.notificationLock.delete(`notify_${driverId}`);
      this.dpsCreationLocks.delete(driverId);
    }
  }

  // Replace deduplicateEvent
  private async deduplicateEvent(
    stageId: string,
    timeoutMs: number = 5000
  ): Promise<boolean> {
    const lockKey = `lock:dps:${stageId}`;
    const isLocked = await this.redisService.setNx(
      lockKey,
      'locked',
      Math.ceil(timeoutMs / 1000)
    );
    console.log(
      `[DriversGateway] Deduplicate event for stage ${stageId}: ${isLocked ? 'Locked' : 'Skipped'}`
    );
    return !!isLocked;
  }

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

  async notifyPartiesOnce(order: Order) {
    try {
      if (!order || !order.id) {
        console.error('[DriversGateway] Invalid order in notifyPartiesOnce');
        return;
      }

      const lockKey = `notify_${order.id}`;
      if (this.notificationLock.get(lockKey)) {
        console.log(
          `[DriversGateway] Notification for order ${order.id} already in progress, skipping`
        );
        return;
      }

      this.notificationLock.set(lockKey, true);

      try {
        // Fetch order without optimistic locking
        const orderData = await this.dataSource.getRepository(Order).findOne({
          where: { id: order.id },
          relations: [
            'restaurant',
            'driver',
            'customer',
            'restaurantAddress',
            'customerAddress'
          ]
        });

        if (!orderData) {
          console.error(
            `[DriversGateway] Order ${order.id} not found in notifyPartiesOnce`
          );
          return;
        }

        const { restaurant, driver, customer } = orderData;

        if (driver?.id && this.server) {
          const driverRoom = `driver_${driver.id}`;
          const driverClients = await this.server.in(driverRoom).fetchSockets();
          console.log(
            `[DriversGateway] Notifying driver ${driver.id}, clients in room: ${driverClients.length}`
          );
          await this.server.to(driverRoom).emit('orderStatusUpdated', {
            orderId: order.id,
            status: orderData.status,
            tracking_info: orderData.tracking_info
          });
        }

        if (restaurant?.id && this.server) {
          const restaurantRoom = `restaurant_${restaurant.id}`;
          const restaurantClients = await this.server
            .in(restaurantRoom)
            .fetchSockets();
          console.log(
            `[DriversGateway] Notifying restaurant ${restaurant.id}, clients in room: ${restaurantClients.length}`
          );
          await this.server.to(restaurantRoom).emit('orderStatusUpdated', {
            orderId: order.id,
            status: orderData.status,
            tracking_info: orderData.tracking_info
          });
        }

        if (customer?.id && this.server) {
          const customerRoom = `customer_${customer.id}`;
          const customerClients = await this.server
            .in(customerRoom)
            .fetchSockets();
          console.log(
            `[DriversGateway] Notifying customer ${customer.id}, clients in room: ${customerClients.length}`
          );
          await this.server.to(customerRoom).emit('orderStatusUpdated', {
            orderId: order.id,
            status: orderData.status,
            tracking_info: orderData.tracking_info
          });
        }
      } finally {
        this.notificationLock.delete(lockKey);
      }
    } catch (err: any) {
      console.error('[DriversGateway] Error in notifyPartiesOnce:', err);
    }
  }

  @SubscribeMessage('updateDriverProgress')
  async handleDriverProgressUpdate(
    @MessageBody() data: { stageId: string; orderId?: string }
  ) {
    logger.log('Received updateDriverProgress event:', {
      stageId: data.stageId,
      orderId: data.orderId
    });

    try {
      // Deduplicate events
      const isUnique = await this.deduplicateEvent(data.stageId);
      if (!isUnique) {
        logger.warn(
          `[DriversGateway] Duplicate updateDriverProgress event for stage ${data.stageId}, skipping`
        );
        return { success: false, message: 'Duplicate event' };
      }

      const maxRetries = 3;
      let attempt = 0;

      while (attempt < maxRetries) {
        try {
          return await this.dataSource.transaction(
            async transactionalEntityManager => {
              logger.log('Starting transaction for driver progress update', {
                stageId: data.stageId
              });

              // Fetch DPS
              const dps = await transactionalEntityManager
                .getRepository(DriverProgressStage)
                .findOne({
                  where: { id: data.stageId },
                  relations: ['orders']
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

              // Validate driver_id
              if (!dps.driver_id) {
                logger.error(
                  `[DriversGateway] No driver_id found for stage ${data.stageId}`
                );
                return { success: false, message: 'Invalid driver_id' };
              }

              // Load order relations
              for (const order of dps.orders) {
                const loadedOrder = await transactionalEntityManager
                  .getRepository(Order)
                  .findOne({
                    where: { id: order.id },
                    relations: [
                      'restaurant',
                      'driver',
                      'customer',
                      'restaurantAddress',
                      'customerAddress'
                    ]
                  });
                if (loadedOrder) {
                  order.restaurant = loadedOrder.restaurant;
                  order.driver = loadedOrder.driver;
                  order.customer = loadedOrder.customer;
                  order.restaurantAddress = loadedOrder.restaurantAddress;
                  order.customerAddress = loadedOrder.customerAddress;
                }
              }

              logger.log('Found driver progress stage:', {
                id: dps.id,
                driverId: dps.driver_id,
                ordersCount: dps.orders.length
              });

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
                  const finalStage = dps.stages.find(
                    s => s.state === finalState
                  );
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

                // Handle first emission: check for pending driver_ready stage
                if (currentStageIndex === -1 && order.id === targetOrderId) {
                  const driverReadyState = `driver_ready_${orderSuffix}`;
                  const driverReadyStage = updatedStages.find(
                    s => s.state === driverReadyState
                  );
                  if (
                    driverReadyStage &&
                    driverReadyStage.status === 'pending'
                  ) {
                    currentStageIndex = 0; // Start at driver_ready
                    logger.log(
                      `[First Emission] Setting initial stage to driver_ready for order ${order.id}`
                    );
                  } else {
                    // Fallback to last completed stage
                    for (let i = stageOrder.length - 1; i >= 0; i--) {
                      const state = `${stageOrder[i]}_${orderSuffix}`;
                      const stage = updatedStages.find(s => s.state === state);
                      if (stage && stage.status === 'completed') {
                        currentStageIndex = i;
                        break;
                      }
                    }
                  }
                }

                if (order.id === targetOrderId && currentStageIndex >= 0) {
                  const currentState = `${stageOrder[currentStageIndex]}_${orderSuffix}`;
                  const nextStateBase =
                    currentStageIndex < stageOrder.length - 1
                      ? stageOrder[currentStageIndex + 1]
                      : null;
                  const nextState = nextStateBase
                    ? `${nextStateBase}_${orderSuffix}`
                    : null;

                  if (nextStateBase === 'delivery_complete') {
                    await this.handleDeliveryCompletion(
                      order,
                      dps,
                      transactionalEntityManager
                    );
                  }

                  updatedStages = updatedStages.map((stage): StageDto => {
                    if (stage.state === currentState) {
                      const actualTime =
                        stage.status === 'in_progress'
                          ? timestamp - stage.timestamp
                          : 0;
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
                      return { ...stage, status: 'in_progress', timestamp };
                    }
                    return stage;
                  });

                  // Update Order with next stage's status
                  if (nextStateBase && nextStateBase in stageToStatusMap) {
                    const newStatus = stageToStatusMap[nextStateBase];
                    const newTrackingInfo = stageToTrackingMap[nextStateBase];

                    logger.log(`Preparing to update order ${order.id}`, {
                      newStatus,
                      newTrackingInfo,
                      currentStage: currentState,
                      nextStage: nextState
                    });

                    const updateResult =
                      await transactionalEntityManager.update(
                        Order,
                        { id: order.id },
                        {
                          status: newStatus,
                          tracking_info: newTrackingInfo,
                          updated_at: timestamp
                        }
                      );

                    logger.log(`Order update result for ${order.id}`, {
                      affectedRows: updateResult.affected
                    });

                    if (updateResult.affected === 0) {
                      logger.error(
                        `Failed to update order ${order.id}: No rows affected`
                      );
                    }
                  } else if (!nextStateBase) {
                    logger.log(
                      `No next stage for order ${order.id}, skipping Order update`,
                      {
                        currentStage: currentState
                      }
                    );
                  }
                }

                const finalState = `delivery_complete_${orderSuffix}`;
                const finalStage = updatedStages.find(
                  s => s.state === finalState
                );
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
                    dps.orders.findIndex(o => o.id === nextIncompleteOrder.id) +
                    1;
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

                  logger.log(
                    `Updating next incomplete order ${targetOrderId} to driver_ready`,
                    {
                      newStatus,
                      newTrackingInfo
                    }
                  );

                  const updateResult = await transactionalEntityManager.update(
                    Order,
                    { id: targetOrderId },
                    {
                      status: newStatus,
                      tracking_info: newTrackingInfo,
                      updated_at: timestamp
                    }
                  );

                  logger.log(
                    `Next incomplete order update result for ${targetOrderId}`,
                    {
                      affectedRows: updateResult.affected
                    }
                  );
                }
              }

              const inProgressStage = updatedStages.find(
                stage => stage.status === 'in_progress'
              );
              const currentState = inProgressStage
                ? inProgressStage.state
                : dps.current_state;
              const previousState = dps.current_state;
              let nextState: string | null = null;

              if (inProgressStage) {
                const currentIndex = stageOrder.findIndex(base =>
                  inProgressStage.state.startsWith(base)
                );
                nextState =
                  currentIndex < stageOrder.length - 1
                    ? `${stageOrder[currentIndex + 1]}_${inProgressStage.state.split('_order_')[1]}`
                    : null;
              }

              dps.current_state = currentState;
              dps.previous_state = previousState;
              dps.next_state = nextState;

              const allDeliveryCompleteStages = updatedStages.filter(stage =>
                stage.state.startsWith('delivery_complete_')
              );
              const isAllCompleted = allDeliveryCompleteStages.every(
                stage => stage.status === 'completed'
              );

              if (isAllCompleted) {
                dps.current_state =
                  allDeliveryCompleteStages[
                    allDeliveryCompleteStages.length - 1
                  ].state;
                dps.next_state = null;
              }

              const updateResult =
                await this.driverProgressStageService.updateStage(
                  data.stageId,
                  {
                    current_state: dps.current_state,
                    previous_state: dps.previous_state,
                    next_state: dps.next_state,
                    stages: updatedStages,
                    orders: dps.orders,
                    estimated_time_remaining: Number(
                      dps.estimated_time_remaining || 0
                    ),
                    actual_time_spent: Number(dps.actual_time_spent || 0),
                    total_distance_travelled: Number(
                      Number(dps.total_distance_travelled || 0).toFixed(4)
                    ),
                    total_tips: Number(Number(dps.total_tips || 0).toFixed(2)),
                    total_earns: Number(
                      Number(dps.total_earns || 0).toFixed(2)
                    ),
                    transactions_processed: dps.transactions_processed || false
                  },
                  transactionalEntityManager
                );

              logToFile('Successfully updated DPS', {
                dpsId: data.stageId,
                total_earns: parseFloat(
                  Number(dps.total_earns || 0).toFixed(2)
                ),
                total_tips: parseFloat(Number(dps.total_tips || 0).toFixed(2)),
                total_distance: parseFloat(
                  Number(dps.total_distance_travelled || 0).toFixed(4)
                )
              });

              if (updateResult.EC !== 0 || !updateResult.data) {
                throw new Error(updateResult?.EM || 'Failed to update DPS');
              }

              if (this.server) {
                const driverRoom = `driver_${dps.driver_id}`;
                logger.log(
                  `Emitting driverStagesUpdated event to driver: ${dps.driver_id}`
                );
                const clients = await this.server.in(driverRoom).fetchSockets();
                logger.log(
                  `[DriversGateway] Clients in room ${driverRoom}: ${clients.length}`
                );
                if (clients.length === 0) {
                  logger.warn(
                    `[DriversGateway] No clients in room ${driverRoom}, event may not be delivered`
                  );
                }
                await this.server
                  .to(driverRoom)
                  .emit('driverStagesUpdated', updateResult.data);
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

              if (updatedOrder) {
                logger.log(
                  `Notifying parties for updated order ${updatedOrder.id}`,
                  {
                    status: updatedOrder.status,
                    tracking_info: updatedOrder.tracking_info
                  }
                );
                await this.notifyPartiesOnce(updatedOrder);
              }

              return { success: true, stage: updateResult.data };
            }
          );
        } catch (error: any) {
          if (
            error.message.includes('deadlock detected') &&
            attempt < maxRetries - 1
          ) {
            attempt++;
            logger.warn(
              `Deadlock detected, retrying (${attempt}/${maxRetries})`
            );
            await new Promise(resolve => setTimeout(resolve, 100 * attempt));
            continue;
          }
          logger.error('Error in handleDriverProgressUpdate:', error);
          throw error;
        } finally {
          await this.redisService.del(`lock:dps:${data.stageId}`);
        }
      }
      throw new Error('Max retries reached for handleDriverProgressUpdate');
    } catch (error: any) {
      logger.error('Error in handleDriverProgressUpdate:', error);
      return { success: false, message: error.message };
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
            .leftJoinAndSelect('dps.orders', 'orders')
            .where('dps.driver_id = :driverId', { driverId })
            .orderBy('dps.created_at', 'DESC')
            .getOne();

          let shouldCreateNewDPS = true;
          if (existingDPS) {
            // Check if there are any orders still in progress (not DELIVERED)
            const hasActiveOrders = existingDPS.orders?.some(
              order => order.status !== OrderStatus.DELIVERED
            );

            // If we have any active orders, we should add to this DPS
            shouldCreateNewDPS = !hasActiveOrders;

            // Log DPS status for debugging
            logToFile('DPS Status Check', {
              dpsId: existingDPS.id,
              hasActiveOrders,
              shouldCreateNewDPS,
              orderStatuses: existingDPS.orders?.map(o => ({
                id: o.id,
                status: o.status
              }))
            });
          }

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

          // Fix: Ensure proper number formatting for totalEarns
          const totalEarns = Number(driver_wage) + Number(totalTips);

          let dps: DriverProgressStage;
          if (shouldCreateNewDPS) {
            console.log(
              `[DriversGateway] Creating new DPS for driver ${driverId} - all existing orders are delivered`
            );
            const dpsResponse = await this.driverProgressStageService.create(
              {
                driver_id: driverId,
                orders: [orderWithRelations],
                current_state: 'driver_ready_order_1',
                estimated_time_remaining: estimatedTime,
                total_distance_travelled: Number(distance.toFixed(4)),
                total_tips: Number(totalTips),
                total_earns: Number(totalEarns.toFixed(2)) // Fix: Format to 2 decimal places
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
              `[DriversGateway] Adding order to existing DPS ${existingDPS.id} - has active orders`
            );

            // Check if order already exists in DPS
            if (existingDPS.orders?.some(o => o.id === orderId)) {
              throw new WsException('Order already exists in DPS');
            }

            // Add order to existing DPS
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

            // Update DPS totals
            dps.total_distance_travelled = Number(
              (Number(dps.total_distance_travelled || 0) + distance).toFixed(4)
            );
            dps.estimated_time_remaining =
              (dps.estimated_time_remaining || 0) + estimatedTime;
            dps.total_tips = Number(
              (Number(dps.total_tips || 0) + Number(totalTips)).toFixed(2)
            );
            dps.total_earns = Number(
              (Number(dps.total_earns || 0) + Number(totalEarns)).toFixed(2)
            );

            // Update stages with correct details
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

            // Update DPS state
            const orderIndex = dps.orders.length;
            const orderSuffix = `order_${orderIndex}`;
            const nextState = `driver_ready_${orderSuffix}`;

            dps.current_state = nextState;
            dps.previous_state = dps.current_state;
            dps.next_state = `waiting_for_pickup_${orderSuffix}`;

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

          // Notify customer about order acceptance
          this.eventEmitter.emit('listenUpdateOrderTracking', {
            orderId: orderWithRelations.id,
            status: orderWithRelations.status,
            tracking_info: orderWithRelations.tracking_info,
            updated_at: orderWithRelations.updated_at,
            customer_id: orderWithRelations.customer_id,
            driver_id: orderWithRelations.driver_id,
            restaurant_id: orderWithRelations.restaurant_id,
            restaurant_avatar: orderWithRelations.restaurant?.avatar || null,
            driver_avatar: driverWithRelations.avatar || null,
            restaurantAddress: orderWithRelations.restaurantAddress,
            customerAddress: orderWithRelations.customerAddress,
            driverDetails: {
              id: driverWithRelations.id,
              first_name: driverWithRelations.first_name || 'N/A',
              last_name: driverWithRelations.last_name || 'N/A',
              avatar: driverWithRelations.avatar,
              rating: driverWithRelations.rating || { average_rating: '4.8' },
              vehicle: driverWithRelations.vehicle || {
                color: 'N/A',
                model: 'N/A',
                license_plate: 'N/A'
              }
            }
          });

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
  private async handleDeliveryCompletion(
    order: Order,
    dps: DriverProgressStage,
    transactionalEntityManager: EntityManager
  ): Promise<void> {
    logToFile('Starting handleDeliveryCompletion', {
      orderId: order.id,
      dpsId: dps.id
    });

    const timestamp = Math.floor(Date.now() / 1000);

    // Update order status without optimistic locking
    await transactionalEntityManager.update(
      Order,
      { id: order.id },
      {
        status: OrderStatus.DELIVERED,
        tracking_info: OrderTrackingInfo.DELIVERED,
        updated_at: timestamp
      }
    );

    logToFile('[CRITICAL FIX] Updated order status to DELIVERED', {
      orderId: order.id,
      status: OrderStatus.DELIVERED
    });

    // Fetch driver
    const driver = await transactionalEntityManager
      .getRepository(Driver)
      .findOne({
        where: { id: order.driver_id },
        relations: ['current_orders']
      });

    if (!driver) {
      throw new Error(`Driver ${order.driver_id} not found`);
    }

    // Remove order from driver's current_orders
    await transactionalEntityManager
      .createQueryBuilder()
      .delete()
      .from('driver_current_orders')
      .where('driver_id = :driverId AND order_id = :orderId', {
        driverId: driver.id,
        orderId: order.id
      })
      .execute();

    logToFile('Removed order from driver_current_orders', {
      driverId: driver.id,
      orderId: order.id
    });

    // Calculate distance
    let distance = order.distance || 0;
    if (order.customerAddress?.location && order.restaurantAddress?.location) {
      const cLoc = order.customerAddress.location;
      const rLoc = order.restaurantAddress.location;
      distance = this.calculateDistance(cLoc.lat, cLoc.lng, rLoc.lat, rLoc.lng);
    }

    // Update order distance
    await transactionalEntityManager.update(
      Order,
      { id: order.id },
      { distance, updated_at: timestamp }
    );

    // Update DPS total distance
    dps.total_distance_travelled = Number(
      (Number(dps.total_distance_travelled || 0) + Number(distance)).toFixed(4)
    );
    await transactionalEntityManager.save(DriverProgressStage, dps);

    logToFile('Updated DPS total distance', {
      dpsId: dps.id,
      totalDistance: dps.total_distance_travelled
    });

    // Process transaction with Redis lock
    const lockKey = `order_transaction:${order.id}`;
    const lockAcquired = await this.redisService.setNx(lockKey, 'locked', 3000);

    try {
      if (!lockAcquired) {
        logToFile('Failed to acquire lock for transaction', {
          orderId: order.id
        });
        return;
      }

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

      const driverWallet = await this.fWalletsRepository.findByUserId(
        driver.user_id,
        transactionalEntityManager
      );
      if (!driverWallet) {
        throw new Error(`Wallet not found for driver ${driver.id}`);
      }

      let financeWallet = await this.fWalletsRepository.findById(
        FLASHFOOD_FINANCE.id,
        transactionalEntityManager
      );
      if (!financeWallet) {
        throw new Error('Finance wallet not found');
      }

      let transactionResponse;
      let attempt = 0;
      while (attempt < 3) {
        transactionResponse = await this.transactionsService.create(
          {
            user_id: driver.user_id,
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
        if (transactionResponse.EM?.includes('Wallet version mismatch')) {
          financeWallet = await this.fWalletsRepository.findById(
            FLASHFOOD_FINANCE.id,
            transactionalEntityManager
          );
          attempt++;
          continue;
        }
        throw new Error(transactionResponse.EM || 'Transaction failed');
      }

      this.redisService.del(`fwallet:${driver.user_id}`);
      this.redisService.del(
        `orders:restaurant:${order.restaurant_id}:page:1:limit:50`
      );

      if (order.customer_id) {
        await this.redisService.del(`orders:customer:${order.customer_id}`);
      }

      logToFile('Created transaction', {
        orderId: order.id,
        transactionId: transactionResponse.data.id,
        amount: transactionResponse.data.amount
      });
    } finally {
      if (lockAcquired) {
        await this.redisService.del(lockKey);
      }
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
      order_items: order.order_items,
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
}
