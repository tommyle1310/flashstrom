"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriversGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const mathjs_1 = require("mathjs");
const event_emitter_1 = require("@nestjs/event-emitter");
const socket_io_1 = require("socket.io");
const drivers_service_1 = require("./drivers.service");
const restaurants_service_1 = require("../restaurants/restaurants.service");
const common_1 = require("@nestjs/common");
const orders_service_1 = require("../orders/orders.service");
const driver_progress_stages_service_1 = require("../driver_progress_stages/driver_progress_stages.service");
const order_entity_1 = require("../orders/entities/order.entity");
const typeorm_1 = require("typeorm");
const driver_progress_stage_entity_1 = require("../driver_progress_stages/entities/driver_progress_stage.entity");
const driver_entity_1 = require("./entities/driver.entity");
const address_book_repository_1 = require("../address_book/address_book.repository");
const drivers_repository_1 = require("./drivers.repository");
const jwt_1 = require("@nestjs/jwt");
const driver_stats_records_service_1 = require("../driver_stats_records/driver_stats_records.service");
const finance_rules_service_1 = require("../finance_rules/finance_rules.service");
const fwallets_repository_1 = require("../fwallets/fwallets.repository");
const transactions_service_1 = require("../transactions/transactions.service");
const constants_1 = require("../utils/constants");
const redis_adapter_1 = require("@socket.io/redis-adapter");
const redis_service_1 = require("../redis/redis.service");
const common_2 = require("@nestjs/common");
const users_repository_1 = require("../users/users.repository");
const transaction_entity_1 = require("../transactions/entities/transaction.entity");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const logger = new common_2.Logger('DriversGateway');
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}
const logFile = path.join(logDir, 'driver_gateway.log');
function logToFile(message, data) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}\n`;
    fs.appendFileSync(logFile, logMessage);
}
let DriversGateway = class DriversGateway {
    constructor(socketServer, restaurantsService, driverService, driverRepository, driverStatsService, eventEmitter, ordersService, financeRulesService, fWalletsRepository, transactionsService, driverProgressStageService, dataSource, addressBookRepository, jwtService, redisService, userRepository) {
        this.socketServer = socketServer;
        this.restaurantsService = restaurantsService;
        this.driverService = driverService;
        this.driverRepository = driverRepository;
        this.driverStatsService = driverStatsService;
        this.eventEmitter = eventEmitter;
        this.ordersService = ordersService;
        this.financeRulesService = financeRulesService;
        this.fWalletsRepository = fWalletsRepository;
        this.transactionsService = transactionsService;
        this.driverProgressStageService = driverProgressStageService;
        this.dataSource = dataSource;
        this.addressBookRepository = addressBookRepository;
        this.jwtService = jwtService;
        this.redisService = redisService;
        this.userRepository = userRepository;
        this.driverSockets = new Map();
        this.notificationLock = new Map();
        this.activeConnections = new Map();
        this.dpsCreationLocks = new Set();
        this.processingOrders = new Set();
        this.processedEvents = new Map();
        this.isListenerRegistered = false;
        logger.log('DriversGateway constructor called');
        logger.log('Checking injected dependencies:');
        logger.log('- driverProgressStageRepository:', !!this.driverProgressStageService);
        logger.log('- driverProgressStageService:', !!this.driverProgressStageService);
        logger.log('- transactionsService:', !!this.transactionsService);
        logger.log('- ordersService:', !!this.ordersService);
        logger.log('- fWalletsRepository:', !!this.fWalletsRepository);
        logger.log('- server:', !!this.server);
        this.redisClient = this.redisService.getClient();
    }
    afterInit() {
        console.log('[DriversGateway] Initialized');
        if (!this.server) {
            console.error('[DriversGateway] WebSocket server is null after initialization');
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
                        console.log('[DriversGateway] Redis subClient already open, skipping connect');
                    }
                    else {
                        await subClient.connect();
                        console.log('[DriversGateway] Redis subClient connected');
                    }
                    const redisAdapter = (0, redis_adapter_1.createAdapter)(pubClient, subClient);
                    this.server.adapter(redisAdapter);
                    console.log('[DriversGateway] Socket.IO Redis adapter initialized successfully');
                }
                catch (err) {
                    if (retryCount < maxRetries) {
                        retryCount++;
                        console.warn(`[DriversGateway] Retrying Redis connection (${retryCount}/${maxRetries})...`);
                        setTimeout(connectRedis, 2000);
                    }
                    else {
                        console.error('[DriversGateway] Failed to initialize Redis adapter after retries:', err.message);
                    }
                }
            };
            connectRedis();
        }
        catch (err) {
            console.error('[DriversGateway] Error setting up Redis adapter:', err.message);
        }
        this.registerEventListeners();
        this.server.setMaxListeners(300);
    }
    registerEventListeners() {
        if (this.isListenerRegistered) {
            console.log('[DriversGateway] Event listeners already registered, skipping');
            return;
        }
        this.eventEmitter.removeAllListeners('order.assignedToDriver');
        this.eventEmitter.on('order.assignedToDriver', this.handleOrderAssignedToDriver.bind(this));
        this.isListenerRegistered = true;
        console.log('[DriversGateway] Registered event listener for order.assignedToDriver');
    }
    async onModuleDestroy() {
        this.eventEmitter.removeListener('order.assignedToDriver', this.handleOrderAssignedToDriver.bind(this));
        this.isListenerRegistered = false;
        if (this.redisClient && this.redisClient.isOpen) {
            await this.redisClient.quit();
        }
        console.log('[DriversGateway] Removed event listener and closed Redis connection');
    }
    async validateToken(client) {
        try {
            const authHeader = client.handshake.headers.auth;
            if (!authHeader?.startsWith('Bearer ')) {
                throw new websockets_1.WsException('Invalid token');
            }
            const token = authHeader.slice(7);
            if (!token) {
                throw new websockets_1.WsException('No token provided');
            }
            const decoded = await this.jwtService.verify(token, {
                secret: process.env.JWT_SECRET
            });
            return decoded;
        }
        catch (error) {
            console.error('[DriversGateway] Token validation error:', error.message);
            throw new websockets_1.WsException('Token validation failed');
        }
    }
    async handleConnection(client) {
        try {
            console.log('⚡️ Client connected to driver namespace:', client.id);
            const driverData = await this.validateToken(client);
            if (!driverData) {
                console.log('[DriversGateway] Invalid token, disconnecting:', client.id);
                client.disconnect(true);
                return;
            }
            const driverId = driverData.id;
            console.log(`[DriversGateway] Driver ${driverId} attempting connection:`, client.id);
            const lockKey = `lock:driver:connect:${driverId}`;
            let lockAcquired = false;
            let retryCount = 0;
            const maxRetries = 10;
            const retryDelay = 100;
            const lockTTL = 30000;
            while (!lockAcquired && retryCount < maxRetries) {
                lockAcquired = await this.redisService.setNx(lockKey, client.id, lockTTL);
                if (!lockAcquired) {
                    const existingSocketId = await this.redisService.get(lockKey);
                    if (existingSocketId && existingSocketId !== client.id) {
                        const existingSocket = this.activeConnections.get(existingSocketId);
                        if (existingSocket && existingSocket.connected) {
                            console.log(`[DriversGateway] Active connection exists for driver ${driverId} with socket ${existingSocketId}, disconnecting ${client.id}`);
                            client.disconnect(true);
                            return;
                        }
                        await this.redisService.del(lockKey);
                    }
                    retryCount++;
                    console.log(`[DriversGateway] Retrying lock for driver ${driverId} (${retryCount}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                }
            }
            if (!lockAcquired) {
                console.log(`[DriversGateway] Failed to acquire lock for driver ${driverId}, disconnecting ${client.id}`);
                client.disconnect(true);
                return;
            }
            try {
                const clients = await this.server
                    .in(`driver_${driverId}`)
                    .fetchSockets();
                if (clients.length > 0) {
                    console.warn(`[DriversGateway] Multiple clients detected in room driver_${driverId}, cleaning up`);
                    await this.cleanupDriverConnections(driverId, client.id);
                }
                await client.join(`driver_${driverId}`);
                console.log(`Driver auto-joined driver_${driverId} via token`);
                this.driverSockets.set(driverId, new Set([client.id]));
                console.log(`[DriversGateway] Updated socket set for driver ${driverId}:`, this.driverSockets.get(driverId));
                this.activeConnections.set(client.id, client);
                const updatedClients = await this.server
                    .in(`driver_${driverId}`)
                    .fetchSockets();
                console.log(`[DriversGateway] Clients in room driver_${driverId}:`, updatedClients.length);
                client.emit('connected', { driverId, status: 'connected' });
            }
            finally {
                await this.redisService.del(lockKey);
            }
        }
        catch (error) {
            console.error('[DriversGateway] Error handling connection:', error.message);
            client.disconnect(true);
        }
    }
    async cleanupDriverConnections(driverId, newSocketId) {
        console.log(`[DriversGateway] Cleaning up connections for driver ${driverId}`);
        const socketIds = this.driverSockets.get(driverId) || new Set();
        const existingSockets = await this.server
            .in(`driver_${driverId}`)
            .fetchSockets();
        for (const socket of existingSockets) {
            if (socket.id !== newSocketId) {
                const activeSocket = this.activeConnections.get(socket.id);
                if (activeSocket) {
                    console.log(`[DriversGateway] Disconnecting old socket ${socket.id} for driver ${driverId}`);
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
    handleDisconnect(client) {
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
    async handleNewOrder(order) {
        const driverId = order.driver_id;
        if (this.server) {
            this.server.to(driverId).emit('incomingOrder', order);
            console.log('[DriversGateway] Emitted incomingOrder to driver:', driverId);
        }
        else {
            console.error('[DriversGateway] WebSocket server is null, cannot emit incomingOrder');
        }
        return order;
    }
    async notifyPartiesOnce(order) {
        const notifyKey = `notify_${order.id}`;
        const redisLockKey = `lock:notify:${order.id}`;
        try {
            const isLocked = await this.redisClient.set(redisLockKey, 'locked', {
                NX: true,
                EX: 10
            });
            if (!isLocked) {
                console.log(`[DriversGateway] Notification for order ${order.id} already in progress, skipping`);
                return;
            }
            this.notificationLock.set(notifyKey, true);
            if (order.driver_id) {
                try {
                    const dps = await this.dataSource
                        .getRepository(driver_progress_stage_entity_1.DriverProgressStage)
                        .createQueryBuilder('dps')
                        .leftJoinAndSelect('dps.orders', 'orders')
                        .where('orders.id = :orderId', { orderId: order.id })
                        .andWhere('dps.driver_id = :driverId', {
                        driverId: order.driver_id
                    })
                        .getOne();
                    if (dps &&
                        dps.current_state &&
                        dps.current_state.startsWith('delivery_complete_')) {
                        console.log(`[DELIVERY COMPLETE FIX] Order ${order.id} delivery is complete, forcing DELIVERED status`);
                        this.dataSource.getRepository(order_entity_1.Order).update({ id: order.id }, {
                            status: order_entity_1.OrderStatus.DELIVERED,
                            tracking_info: order_entity_1.OrderTrackingInfo.DELIVERED,
                            updated_at: Math.floor(Date.now() / 1000)
                        });
                        order.status = order_entity_1.OrderStatus.DELIVERED;
                        order.tracking_info = order_entity_1.OrderTrackingInfo.DELIVERED;
                        order.updated_at = Math.floor(Date.now() / 1000);
                        console.log(`[DELIVERY COMPLETE FIX] Updated order ${order.id} status to DELIVERED`);
                    }
                }
                catch (err) {
                    console.error('[DriversGateway] Error checking DPS for completed delivery:', err);
                }
            }
            let driver = order.driver;
            if (!driver && order.driver_id) {
                console.warn(`[DriversGateway] order.driver is null, fetching driver with id: ${order.driver_id}`);
                driver = await this.dataSource.getRepository(driver_entity_1.Driver).findOne({
                    where: { id: order.driver_id },
                    relations: ['vehicle', 'rating']
                });
                if (!driver) {
                    console.error(`[DriversGateway] Driver ${order.driver_id} not found`);
                }
            }
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
            console.log('[DriversGateway] notifyPartiesOnce - status check:', {
                id: order.id,
                status: order.status,
                tracking_info: order.tracking_info
            });
            this.eventEmitter.emit('listenUpdateOrderTracking', trackingUpdate);
            console.log(`[DriversGateway] Emitted complete order status update for order ${order.id}`);
        }
        catch (err) {
            console.error('[DriversGateway] Error in notifyPartiesOnce:', err);
        }
        finally {
            this.notificationLock.delete(notifyKey);
            await this.redisClient
                .del(redisLockKey)
                .catch(err => console.error('[Redis] Error releasing lock:', err));
        }
    }
    async handleDriverProgressUpdate(data) {
        logger.log('Received updateDriverProgress event:', data);
        try {
            const result = await this.dataSource.transaction(async (transactionalEntityManager) => {
                logger.log('Starting transaction for driver progress update');
                const dps = await transactionalEntityManager
                    .getRepository(driver_progress_stage_entity_1.DriverProgressStage)
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
                    driver_ready: order_entity_1.OrderStatus.DISPATCHED,
                    waiting_for_pickup: order_entity_1.OrderStatus.READY_FOR_PICKUP,
                    restaurant_pickup: order_entity_1.OrderStatus.RESTAURANT_PICKUP,
                    en_route_to_customer: order_entity_1.OrderStatus.EN_ROUTE,
                    delivery_complete: order_entity_1.OrderStatus.DELIVERED
                };
                const stageToTrackingMap = {
                    driver_ready: order_entity_1.OrderTrackingInfo.DISPATCHED,
                    waiting_for_pickup: order_entity_1.OrderTrackingInfo.PREPARING,
                    restaurant_pickup: order_entity_1.OrderTrackingInfo.RESTAURANT_PICKUP,
                    en_route_to_customer: order_entity_1.OrderTrackingInfo.EN_ROUTE,
                    delivery_complete: order_entity_1.OrderTrackingInfo.DELIVERED
                };
                let targetOrderId = data.orderId ||
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
                        const isInitialState = updatedStages.every(stage => stage.status === 'pending' ||
                            (stage.state.startsWith('driver_ready_') &&
                                stage.status === 'in_progress'));
                        if (isInitialState && order.id === targetOrderId) {
                            currentStageIndex = 0;
                        }
                        else {
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
                    if (order.id === targetOrderId) {
                        if (currentStageIndex >= 0) {
                            const currentState = `${stageOrder[currentStageIndex]}_order_${orderIndex}`;
                            const nextStateBase = currentStageIndex < stageOrder.length - 1
                                ? stageOrder[currentStageIndex + 1]
                                : null;
                            const nextState = nextStateBase
                                ? `${nextStateBase}_order_${orderIndex}`
                                : null;
                            if (nextStateBase === 'delivery_complete') {
                                try {
                                    await this.handleDeliveryCompletion(order, dps, transactionalEntityManager);
                                }
                                catch (error) {
                                    logger.error('Error completing delivery:', error);
                                    throw error;
                                }
                            }
                            updatedStages = updatedStages.map((stage) => {
                                if (stage.state === currentState) {
                                    const actualTime = stage.status === 'in_progress'
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
                                    const estimatedTime = this.calculateEstimatedTime(order.distance || 0);
                                    dps.estimated_time_remaining =
                                        (dps.estimated_time_remaining || 0) -
                                            (stage.details?.estimated_time || 0) +
                                            estimatedTime;
                                    stage.details.estimated_time = estimatedTime;
                                    if (nextStateBase === 'delivery_complete') {
                                        logger.log(`[CRITICAL FIX] Order ${order.id} has reached delivery_complete stage, forcing DELIVERED status`);
                                        transactionalEntityManager.update(order_entity_1.Order, { id: order.id }, {
                                            status: order_entity_1.OrderStatus.DELIVERED,
                                            tracking_info: order_entity_1.OrderTrackingInfo.DELIVERED,
                                            updated_at: Math.floor(Date.now() / 1000)
                                        });
                                        order.status = order_entity_1.OrderStatus.DELIVERED;
                                        order.tracking_info = order_entity_1.OrderTrackingInfo.DELIVERED;
                                        order.updated_at = Math.floor(Date.now() / 1000);
                                        return {
                                            ...stage,
                                            status: 'completed',
                                            timestamp,
                                            duration: 0
                                        };
                                    }
                                    else {
                                        return { ...stage, status: 'in_progress', timestamp };
                                    }
                                }
                                return stage;
                            });
                            const completedStage = updatedStages.find(stage => stage.status === 'completed');
                            const inProgressStage = updatedStages.find(stage => stage.status === 'in_progress');
                            const currentStateValue = inProgressStage
                                ? inProgressStage.state
                                : 'waiting_for_pickup_order_1';
                            const previousStateValue = completedStage
                                ? completedStage.state
                                : 'driver_ready_order_1';
                            let nextStateValue = null;
                            const parts = currentStateValue.split('_order_');
                            const currentBaseState = parts[0];
                            const currentIndex = stageOrder.findIndex(base => base === currentBaseState);
                            if (currentIndex >= 0 && currentIndex < stageOrder.length - 1) {
                                nextStateValue = `${stageOrder[currentIndex + 1]}_${parts[1]}`;
                            }
                            dps.current_state = currentStateValue;
                            dps.previous_state = previousStateValue;
                            dps.next_state = nextStateValue;
                            console.log('FIXING STATE VALUES:');
                            console.log(`- PREVIOUS STATE: ${dps.previous_state}`);
                            console.log(`- CURRENT STATE: ${dps.current_state}`);
                            console.log(`- NEXT STATE: ${dps.next_state}`);
                            const currentStateBase = currentStateValue.split('_order_')[0];
                            if (currentStateBase in stageToStatusMap) {
                                const newStatus = stageToStatusMap[currentStateBase];
                                const newTrackingInfo = stageToTrackingMap[currentStateBase];
                                logger.log(`Updating order ${order.id} status from ${order.status} to ${newStatus} and tracking_info from ${order.tracking_info} to ${newTrackingInfo}`);
                                order.status = newStatus;
                                order.tracking_info = newTrackingInfo;
                                order.updated_at = Math.floor(Date.now() / 1000);
                                transactionalEntityManager.update(order_entity_1.Order, { id: order.id }, {
                                    status: newStatus,
                                    tracking_info: newTrackingInfo,
                                    updated_at: Math.floor(Date.now() / 1000)
                                });
                            }
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
                        const finalStage = updatedStages.find(s => s.state === finalState);
                        return finalStage && finalStage.status !== 'completed';
                    });
                    if (nextIncompleteOrder &&
                        nextIncompleteOrder.id !== targetOrderId) {
                        const nextOrderIndex = dps.orders.findIndex(o => o.id === nextIncompleteOrder.id) + 1;
                        const nextOrderSuffix = `order_${nextOrderIndex}`;
                        const nextDriverReadyState = `driver_ready_${nextOrderSuffix}`;
                        updatedStages = updatedStages.map((stage) => {
                            if (stage.state === nextDriverReadyState &&
                                stage.status === 'pending') {
                                const estimatedTime = this.calculateEstimatedTime(nextIncompleteOrder.distance || 0);
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
                        transactionalEntityManager.update(order_entity_1.Order, { id: targetOrderId }, {
                            status: newStatus,
                            tracking_info: newTrackingInfo,
                            updated_at: Math.floor(Date.now() / 1000)
                        });
                    }
                }
                const inProgressStage = updatedStages.find(stage => stage.status === 'in_progress');
                const currentState = inProgressStage
                    ? inProgressStage.state
                    : dps.current_state;
                const previousState = dps.current_state;
                let nextState = null;
                if (inProgressStage) {
                    const currentIndex = stageOrder.findIndex(base => inProgressStage.state.startsWith(base));
                    nextState =
                        currentIndex < stageOrder.length - 1
                            ? `${stageOrder[currentIndex + 1]}_${inProgressStage.state.split('_order_')[1]}`
                            : null;
                }
                else {
                    const lastCompletedDelivery = updatedStages
                        .filter(stage => stage.state.startsWith('delivery_complete_') &&
                        stage.status === 'completed')
                        .sort((a, b) => b.timestamp - a.timestamp)[0];
                    if (lastCompletedDelivery) {
                        nextState = null;
                    }
                }
                dps.current_state = currentState;
                dps.previous_state = previousState;
                dps.next_state = nextState;
                const allDeliveryCompleteStages = updatedStages.filter(stage => stage.state.startsWith('delivery_complete_'));
                const isAllCompleted = allDeliveryCompleteStages.every(stage => stage.status === 'completed');
                if (isAllCompleted) {
                    dps.current_state =
                        allDeliveryCompleteStages[allDeliveryCompleteStages.length - 1].state;
                    dps.next_state = null;
                }
                const updateResult = await this.driverProgressStageService.updateStage(data.stageId, {
                    current_state: dps.current_state,
                    previous_state: dps.previous_state,
                    next_state: dps.next_state,
                    stages: updatedStages,
                    orders: dps.orders,
                    estimated_time_remaining: Number(dps.estimated_time_remaining || 0),
                    actual_time_spent: Number(dps.actual_time_spent || 0),
                    total_distance_travelled: Number(Number(dps.total_distance_travelled || 0).toFixed(4)),
                    total_tips: Number(Number(dps.total_tips || 0).toFixed(2)),
                    total_earns: Number(Number(dps.total_earns || 0).toFixed(2)),
                    transactions_processed: dps.transactions_processed || false
                }, transactionalEntityManager);
                logToFile('DPS values before update', {
                    dpsId: data.stageId,
                    raw_total_earns: dps.total_earns,
                    formatted_total_earns: parseFloat(Number(dps.total_earns || 0).toFixed(2)),
                    raw_total_tips: dps.total_tips,
                    formatted_total_tips: parseFloat(Number(dps.total_tips || 0).toFixed(2)),
                    raw_distance: dps.total_distance_travelled,
                    formatted_distance: parseFloat(Number(dps.total_distance_travelled || 0).toFixed(4))
                });
                if (!updateResult?.data) {
                    logToFile('Failed to update DPS', {
                        dpsId: data.stageId,
                        error: updateResult?.EM || 'Unknown error',
                        currentValues: {
                            total_earns: parseFloat(Number(dps.total_earns || 0).toFixed(2)),
                            total_tips: parseFloat(Number(dps.total_tips || 0).toFixed(2)),
                            total_distance: parseFloat(Number(dps.total_distance_travelled || 0).toFixed(4))
                        }
                    });
                    throw new Error(updateResult?.EM || 'Failed to update DPS');
                }
                logToFile('Successfully updated DPS', {
                    dpsId: data.stageId,
                    total_earns: parseFloat(Number(dps.total_earns || 0).toFixed(2)),
                    total_tips: parseFloat(Number(dps.total_tips || 0).toFixed(2)),
                    total_distance: parseFloat(Number(dps.total_distance_travelled || 0).toFixed(4))
                });
                const newStagesString = JSON.stringify(updateResult.data.stages);
                const hasChanges = oldStagesString !== newStagesString ||
                    oldCurrentState !== updateResult.data.current_state ||
                    oldPreviousState !== updateResult.data.previous_state ||
                    oldNextState !== updateResult.data.next_state;
                if (updateResult.EC === 0 && hasChanges) {
                    if (this.server) {
                        logger.log('Emitting driverStagesUpdated event');
                        await this.server
                            .to(`driver_${dps.driver_id}`)
                            .emit('driverStagesUpdated', updateResult.data);
                        logger.log('Successfully emitted driverStagesUpdated event');
                    }
                    else {
                        logger.error('WebSocket server is null, cannot emit driverStagesUpdated');
                    }
                }
                const updatedOrder = await transactionalEntityManager
                    .getRepository(order_entity_1.Order)
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
                    console.error(`[DriversGateway] Order ${targetOrderId} not found after update`);
                    return { success: false, message: 'Order not found' };
                }
                const actualCompleted = updatedStages
                    .filter(stage => stage.status === 'completed')
                    .sort((a, b) => b.timestamp - a.timestamp)[0];
                const actualInProgress = updatedStages.find(stage => stage.status === 'in_progress');
                const deliveryCompleteStages = updatedStages.filter(stage => stage.state.startsWith('delivery_complete_') &&
                    stage.status === 'completed');
                if (deliveryCompleteStages.length > 0) {
                    const completedOrderIds = deliveryCompleteStages
                        .map(stage => {
                        const parts = stage.state.split('_');
                        const orderIndex = parts[parts.length - 1];
                        const matchingOrder = dps.orders[parseInt(orderIndex) - 1];
                        return matchingOrder ? matchingOrder.id : null;
                    })
                        .filter(id => id !== null);
                    console.log(`[DELIVERY COMPLETE] Found ${completedOrderIds.length} completed orders`);
                    for (const orderId of completedOrderIds) {
                        console.log(`[DELIVERY COMPLETE] Updating order ${orderId} to DELIVERED status`);
                        transactionalEntityManager.update(order_entity_1.Order, { id: orderId }, {
                            status: order_entity_1.OrderStatus.DELIVERED,
                            tracking_info: order_entity_1.OrderTrackingInfo.DELIVERED,
                            updated_at: Math.floor(Date.now() / 1000)
                        });
                        const orderToNotify = await transactionalEntityManager
                            .getRepository(order_entity_1.Order)
                            .findOne({
                            where: { id: orderId },
                            relations: [
                                'restaurant',
                                'driver',
                                'customer',
                                'restaurantAddress',
                                'customerAddress'
                            ]
                        });
                        if (orderToNotify) {
                            console.log(`[DELIVERY COMPLETE] Notifying parties for order ${orderId}`);
                            await this.notifyPartiesOnce(orderToNotify);
                        }
                    }
                }
                if (actualInProgress && actualCompleted) {
                    const manualFix = await transactionalEntityManager.update(driver_progress_stage_entity_1.DriverProgressStage, { id: data.stageId }, {
                        current_state: actualInProgress.state,
                        previous_state: actualCompleted.state,
                        updated_at: Math.floor(Date.now() / 1000)
                    });
                    console.log(`MANUAL FIX APPLIED: ${manualFix.affected} rows`);
                    const baseState = actualInProgress.state.split('_order_')[0];
                    if (baseState in stageToStatusMap) {
                        const correctStatus = stageToStatusMap[baseState];
                        const correctTracking = stageToTrackingMap[baseState];
                        transactionalEntityManager.update(order_entity_1.Order, { id: updatedOrder.id }, {
                            status: correctStatus,
                            tracking_info: correctTracking,
                            updated_at: Math.floor(Date.now() / 1000)
                        });
                        const reloadedOrder = await transactionalEntityManager
                            .getRepository(order_entity_1.Order)
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
                        if (reloadedOrder) {
                            await this.notifyPartiesOnce(reloadedOrder);
                        }
                    }
                }
                await this.notifyPartiesOnce(updatedOrder);
                if (dps.current_state &&
                    dps.current_state.startsWith('delivery_complete_')) {
                    logger.log(`[DELIVERY COMPLETE] DPS is in delivery_complete state, ensuring order is DELIVERED`);
                    const stateNum = dps.current_state.split('_').pop();
                    const orderIndex = parseInt(stateNum) - 1;
                    const deliveredOrder = dps.orders[orderIndex];
                    if (deliveredOrder) {
                        const updatedOrderStatus = await transactionalEntityManager.findOne(order_entity_1.Order, {
                            where: { id: deliveredOrder.id }
                        });
                        if (updatedOrderStatus &&
                            updatedOrderStatus.status !== order_entity_1.OrderStatus.DELIVERED) {
                            logger.log(`[DELIVERY COMPLETE] Force updating order ${deliveredOrder.id} to DELIVERED status`);
                            transactionalEntityManager.update(order_entity_1.Order, { id: deliveredOrder.id }, {
                                status: order_entity_1.OrderStatus.DELIVERED,
                                tracking_info: order_entity_1.OrderTrackingInfo.DELIVERED,
                                updated_at: Math.floor(Date.now() / 1000)
                            });
                            const orderToNotify = await transactionalEntityManager
                                .getRepository(order_entity_1.Order)
                                .findOne({
                                where: { id: deliveredOrder.id },
                                relations: [
                                    'restaurant',
                                    'driver',
                                    'customer',
                                    'restaurantAddress',
                                    'customerAddress'
                                ]
                            });
                            if (orderToNotify) {
                                await this.notifyPartiesOnce(orderToNotify);
                            }
                        }
                    }
                }
                return { success: true, stage: updateResult.data };
            });
            return result;
        }
        catch (error) {
            logger.error('Error in handleDriverProgressUpdate:', error);
            throw error;
        }
    }
    async handleDriverAcceptOrder(data) {
        console.log('[DriversGateway] Raw data received:', data);
        const { driverId, orderId } = data;
        const lockKey = `driver_accept_order:${orderId}:${driverId}`;
        const lockAcquired = await this.redisService.setNx(lockKey, 'locked', 30000);
        if (!lockAcquired) {
            console.log('[DriversGateway] Order already being processed:', lockKey);
            return { success: false, message: 'Order already being processed' };
        }
        try {
            const result = await this.dataSource.transaction(async (transactionalEntityManager) => {
                console.log('[DriversGateway] Starting transaction for driver accept order');
                const orderWithRelations = await transactionalEntityManager
                    .getRepository(order_entity_1.Order)
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
                    throw new websockets_1.WsException('Order not found');
                }
                const driverWithRelations = await transactionalEntityManager
                    .getRepository(driver_entity_1.Driver)
                    .findOne({
                    where: { id: driverId },
                    relations: ['current_orders']
                });
                if (!driverWithRelations) {
                    throw new websockets_1.WsException('Driver not found');
                }
                const restaurantLocation = orderWithRelations.restaurantAddress?.location;
                const customerLocation = orderWithRelations.customerAddress?.location;
                if (!restaurantLocation || !customerLocation) {
                    console.error('Missing location data:', {
                        restaurant: restaurantLocation,
                        customer: customerLocation
                    });
                    throw new websockets_1.WsException('Missing location data');
                }
                const restaurantLat = Number(restaurantLocation.lat);
                const restaurantLng = Number(restaurantLocation.lng);
                const customerLat = Number(customerLocation.lat);
                const customerLng = Number(customerLocation.lng);
                if (isNaN(restaurantLat) ||
                    isNaN(restaurantLng) ||
                    isNaN(customerLat) ||
                    isNaN(customerLng)) {
                    console.error('Invalid location coordinates:', {
                        restaurant: { lat: restaurantLat, lng: restaurantLng },
                        customer: { lat: customerLat, lng: customerLng }
                    });
                    throw new websockets_1.WsException('Invalid location coordinates');
                }
                const distance = this.calculateDistance(restaurantLat, restaurantLng, customerLat, customerLng);
                console.log('[DriversGateway] Calculated distance:', distance);
                orderWithRelations.distance = distance;
                const existingDPS = await transactionalEntityManager
                    .getRepository(driver_progress_stage_entity_1.DriverProgressStage)
                    .createQueryBuilder('dps')
                    .leftJoinAndSelect('dps.orders', 'orders')
                    .where('dps.driver_id = :driverId', { driverId })
                    .orderBy('dps.created_at', 'DESC')
                    .getOne();
                let shouldCreateNewDPS = true;
                if (existingDPS) {
                    const hasActiveOrders = existingDPS.orders?.some(order => order.status !== order_entity_1.OrderStatus.DELIVERED);
                    shouldCreateNewDPS = !hasActiveOrders;
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
                const latestFinanceRuleResponse = await this.financeRulesService.findOneLatest();
                const { EC, EM, data: financeRules } = latestFinanceRuleResponse;
                if (EC !== 0)
                    throw new websockets_1.WsException(EM);
                let driver_wage;
                if (distance >= 0 && distance <= 1) {
                    driver_wage = Number(financeRules.driver_fixed_wage['0-1km']);
                }
                else if (distance > 1 && distance <= 2) {
                    driver_wage = Number(financeRules.driver_fixed_wage['1-2km']);
                }
                else if (distance > 2 && distance <= 3) {
                    driver_wage = Number(financeRules.driver_fixed_wage['2-3km']);
                }
                else if (distance > 4 && distance <= 5) {
                    driver_wage = Number(financeRules.driver_fixed_wage['4-5km']);
                }
                else if (distance > 5) {
                    const formula = financeRules.driver_fixed_wage['>5km'];
                    try {
                        driver_wage = (0, mathjs_1.evaluate)(formula.replace('km', distance.toString()));
                    }
                    catch (error) {
                        console.error('Error evaluating wage formula:', error);
                        driver_wage = Number(financeRules.driver_fixed_wage['4-5km']);
                    }
                }
                else {
                    driver_wage = Number(financeRules.driver_fixed_wage['0-1km']);
                }
                const totalEarns = Number(driver_wage) + Number(totalTips);
                let dps;
                if (shouldCreateNewDPS) {
                    console.log(`[DriversGateway] Creating new DPS for driver ${driverId} - all existing orders are delivered`);
                    const dpsResponse = await this.driverProgressStageService.create({
                        driver_id: driverId,
                        orders: [orderWithRelations],
                        current_state: 'driver_ready_order_1',
                        estimated_time_remaining: estimatedTime,
                        total_distance_travelled: Number(distance.toFixed(4)),
                        total_tips: Number(totalTips),
                        total_earns: Number(totalEarns.toFixed(2))
                    }, transactionalEntityManager);
                    if (dpsResponse.EC !== 0 || !dpsResponse.data) {
                        throw new websockets_1.WsException('Failed to create DPS');
                    }
                    dps = dpsResponse.data;
                    dps.stages = dps.stages.map(stage => ({
                        ...stage,
                        details: this.getStageDetails(stage.state, orderWithRelations, driverWithRelations, estimatedTime, totalTips)
                    }));
                    await transactionalEntityManager.save(driver_progress_stage_entity_1.DriverProgressStage, dps);
                }
                else {
                    console.log(`[DriversGateway] Adding order to existing DPS ${existingDPS.id} - has active orders`);
                    if (existingDPS.orders?.some(o => o.id === orderId)) {
                        throw new websockets_1.WsException('Order already exists in DPS');
                    }
                    const dpsResponse = await this.driverProgressStageService.addOrderToExistingDPS(existingDPS.id, orderWithRelations, transactionalEntityManager);
                    if (dpsResponse.EC !== 0 || !dpsResponse.data) {
                        throw new websockets_1.WsException('Failed to update DPS');
                    }
                    dps = dpsResponse.data;
                    dps.total_distance_travelled = Number((Number(dps.total_distance_travelled || 0) + distance).toFixed(4));
                    dps.estimated_time_remaining =
                        (dps.estimated_time_remaining || 0) + estimatedTime;
                    dps.total_tips = Number((Number(dps.total_tips || 0) + Number(totalTips)).toFixed(2));
                    dps.total_earns = Number((Number(dps.total_earns || 0) + Number(totalEarns)).toFixed(2));
                    dps.stages = dps.stages.map(stage => ({
                        ...stage,
                        details: this.getStageDetails(stage.state, orderWithRelations, driverWithRelations, estimatedTime, totalTips)
                    }));
                    const orderIndex = dps.orders.length;
                    const orderSuffix = `order_${orderIndex}`;
                    const nextState = `driver_ready_${orderSuffix}`;
                    dps.current_state = nextState;
                    dps.previous_state = dps.current_state;
                    dps.next_state = `waiting_for_pickup_${orderSuffix}`;
                    await transactionalEntityManager.save(driver_progress_stage_entity_1.DriverProgressStage, dps);
                }
                orderWithRelations.driver_id = driverId;
                orderWithRelations.driver_wage = driver_wage;
                orderWithRelations.status = order_entity_1.OrderStatus.DISPATCHED;
                orderWithRelations.tracking_info = order_entity_1.OrderTrackingInfo.DISPATCHED;
                orderWithRelations.updated_at = timestamp;
                await transactionalEntityManager.save(order_entity_1.Order, orderWithRelations);
                if (!driverWithRelations.current_orders?.some(o => o.id === orderId)) {
                    driverWithRelations.current_orders = [
                        ...(driverWithRelations.current_orders || []),
                        orderWithRelations
                    ];
                    await transactionalEntityManager.save(driver_entity_1.Driver, driverWithRelations);
                }
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
                this.server.to(`driver_${driverId}`).emit('driverStagesUpdated', dps);
                this.eventEmitter.emit('order.statusUpdated', {
                    orderId,
                    status: order_entity_1.OrderStatus.DISPATCHED,
                    driverId
                });
                return {
                    success: true,
                    data: { order: orderWithRelations, dps }
                };
            });
            return result;
        }
        catch (error) {
            console.error('[DriversGateway] Error in handleDriverAcceptOrder:', error);
            throw error;
        }
        finally {
            await this.redisService.del(lockKey);
        }
    }
    calculateDistance(lat1, lon1, lat2, lon2) {
        if (!lat1 ||
            !lon1 ||
            !lat2 ||
            !lon2 ||
            isNaN(lat1) ||
            isNaN(lon1) ||
            isNaN(lat2) ||
            isNaN(lon2)) {
            console.warn('Invalid coordinates:', { lat1, lon1, lat2, lon2 });
            return 0;
        }
        const R = 6371;
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) *
                Math.cos(this.deg2rad(lat2)) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        return Number(distance.toFixed(4));
    }
    deg2rad(deg) {
        return deg * (Math.PI / 180);
    }
    calculateEstimatedTime(distance) {
        return (distance / 30) * 60;
    }
    getStageDetails(state, order, driver, estimatedTime, tip) {
        const baseDetails = {
            estimated_time: estimatedTime,
            actual_time: 0,
            notes: '',
            tip: state.includes('delivery_complete') ? tip : 0
        };
        if (state.startsWith('waiting_for_pickup_') ||
            state.startsWith('restaurant_pickup_')) {
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
        }
        else if (state.startsWith('en_route_to_customer_') ||
            state.startsWith('delivery_complete_')) {
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
        }
        else if (state.startsWith('driver_ready_')) {
            return {
                ...baseDetails,
                location: driver.current_location
            };
        }
        return baseDetails;
    }
    async handleOrderAssignedToDriver(orderAssignment) {
        try {
            const driverId = orderAssignment.driverListenerId;
            if (!driverId)
                throw new websockets_1.WsException('Driver ID is required');
            const order = await this.ordersService.findOne(orderAssignment.id);
            if (!order?.data)
                throw new websockets_1.WsException('Order not found');
            const driverNotificationData = this.prepareDriverNotificationData(order.data);
            const clients = await this.server.in(`driver_${driverId}`).fetchSockets();
            console.log(`[DriversGateway] Emitting to room driver_${driverId}, clients: ${clients.length}`);
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
            console.log(`[DriversGateway] Emitted incomingOrderForDriver to driver ${driverId}`);
            return { event: 'orderAssigned', data: { success: true } };
        }
        catch (error) {
            console.error('[DriversGateway] Error handling order.assignedToDriver:', error);
            throw new websockets_1.WsException(error instanceof websockets_1.WsException ? error.message : 'Internal server error');
        }
    }
    prepareDriverNotificationData(order) {
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
    prepareAddressData(address) {
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
        if (!address)
            return defaultAddress;
        if (!address.location ||
            !address.location.lat ||
            !address.location.lng ||
            isNaN(address.location.lat) ||
            isNaN(address.location.lng)) {
            console.warn('Invalid location data in address:', address);
            address.location = defaultAddress.location;
        }
        return address;
    }
    prepareDriverDetails(driver) {
        if (!driver)
            return null;
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
    formatFullAddress(address) {
        if (!address)
            return 'N/A';
        return `${address.street}, ${address.city}, ${address.nationality}`;
    }
    async handleDeliveryCompletion(order, dps, transactionalEntityManager) {
        logToFile('Starting handleDeliveryCompletion', {
            orderId: order.id,
            dpsId: dps.id
        });
        logToFile('[CRITICAL FIX] Directly updating order status to DELIVERED', {
            orderId: order.id,
            status: order_entity_1.OrderStatus.DELIVERED
        });
        await transactionalEntityManager.update(order_entity_1.Order, { id: order.id }, {
            status: order_entity_1.OrderStatus.DELIVERED,
            tracking_info: order_entity_1.OrderTrackingInfo.DELIVERED,
            updated_at: Math.floor(Date.now() / 1000)
        });
        const driver = await transactionalEntityManager
            .getRepository(driver_entity_1.Driver)
            .findOne({
            where: { id: order.driver_id },
            relations: ['current_orders']
        });
        if (!driver) {
            throw new Error(`Driver ${order.driver_id} not found`);
        }
        logToFile('Found driver', {
            driverId: driver.id,
            currentOrders: driver.current_orders?.length
        });
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
        const rawDistance = order.distance || 0;
        logToFile('Raw distance from order', { orderId: order.id, rawDistance });
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
        }
        else {
            logToFile('WARNING: Missing location data', addressInfo);
            distance = rawDistance;
        }
        order.distance = distance;
        await transactionalEntityManager.save(order_entity_1.Order, order);
        logToFile('Updated order distance', { orderId: order.id, distance });
        const currentDistance = Number(dps.total_distance_travelled || 0);
        const orderDistance = Number(distance);
        dps.total_distance_travelled = Number((currentDistance + orderDistance).toFixed(4));
        await transactionalEntityManager.save(driver_progress_stage_entity_1.DriverProgressStage, dps);
        logToFile('Updated DPS total distance', {
            dpsId: dps.id,
            totalDistance: dps.total_distance_travelled
        });
        const lockKey = `order_transaction:${order.id}`;
        const lockAcquired = await this.redisService.setNx(lockKey, 'locked', 5000);
        try {
            if (!lockAcquired) {
                logToFile('Failed to acquire lock for transaction', {
                    orderId: order.id
                });
                return;
            }
            const existingTx = await transactionalEntityManager
                .getRepository(transaction_entity_1.Transaction)
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
            const driverWallet = await this.fWalletsRepository.findByUserId(driver.user_id, transactionalEntityManager);
            if (!driverWallet) {
                throw new Error(`Wallet not found for driver ${driver.id}`);
            }
            let financeWallet = await this.fWalletsRepository.findById(constants_1.FLASHFOOD_FINANCE.id, transactionalEntityManager);
            if (!financeWallet) {
                throw new Error('Finance wallet not found');
            }
            let transactionResponse;
            let attempt = 0;
            let lastError;
            while (attempt < 3) {
                transactionResponse = await this.transactionsService.create({
                    user_id: driver.user_id,
                    fwallet_id: financeWallet.id,
                    transaction_type: 'PURCHASE',
                    amount: order.delivery_fee,
                    balance_after: Number(financeWallet.balance) - Number(order.delivery_fee),
                    version: financeWallet.version || 0,
                    status: 'PENDING',
                    source: 'FWALLET',
                    destination_type: 'FWALLET',
                    destination: driverWallet.id,
                    reference_order_id: order.id
                }, transactionalEntityManager);
                if (transactionResponse.EC === 0) {
                    break;
                }
                if (transactionResponse.EM &&
                    transactionResponse.EM.includes('Wallet version mismatch')) {
                    financeWallet = await this.fWalletsRepository.findById(constants_1.FLASHFOOD_FINANCE.id, transactionalEntityManager);
                    attempt++;
                    lastError = transactionResponse.EM;
                    continue;
                }
                lastError = transactionResponse.EM;
                break;
            }
            if (transactionResponse.EC !== 0) {
                throw new Error(`Transaction failed: ${lastError || transactionResponse.EM}`);
            }
            this.redisService.del(`fwallet:${driver.user_id}`);
            this.redisService.del(`orders:restaurant:${order.restaurant_id}:page:1:limit:50`);
            logToFile('Created transaction', {
                orderId: order.id,
                transactionId: transactionResponse.data.id,
                amount: transactionResponse.data.amount
            });
        }
        catch (error) {
            logToFile('Error creating transaction', {
                orderId: order.id,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
        finally {
            if (lockAcquired) {
                await this.redisService.del(lockKey);
            }
            const customerId = order.customer_id;
            if (customerId) {
                const cacheKey = `orders:customer:${customerId}`;
                await this.redisService.del(cacheKey);
                logToFile('Deleted customer orders cache', {
                    orderId: order.id,
                    customerId,
                    cacheKey
                });
            }
            else {
                logToFile('WARNING: No customerId found for cache deletion', {
                    orderId: order.id
                });
            }
        }
    }
};
exports.DriversGateway = DriversGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], DriversGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('newOrderForDriver'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DriversGateway.prototype, "handleNewOrder", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('updateDriverProgress'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DriversGateway.prototype, "handleDriverProgressUpdate", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('driverAcceptOrder'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DriversGateway.prototype, "handleDriverAcceptOrder", null);
__decorate([
    (0, event_emitter_1.OnEvent)('order.assignedToDriver'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DriversGateway.prototype, "handleOrderAssignedToDriver", null);
exports.DriversGateway = DriversGateway = __decorate([
    (0, common_1.Injectable)(),
    (0, websockets_1.WebSocketGateway)({
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
            error: (msg, context) => console.error(`[Socket.IO Error] ${context}: ${msg}`),
            warn: (msg, context) => console.warn(`[Socket.IO Warn] ${context}: ${msg}`),
            info: (msg, context) => console.info(`[Socket.IO Info] ${context}: ${msg}`),
            debug: (msg, context) => console.debug(`[Socket.IO Debug] ${context}: ${msg}`)
        }
    }),
    __param(0, (0, common_1.Inject)('SOCKET_SERVER')),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => restaurants_service_1.RestaurantsService))),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => drivers_service_1.DriversService))),
    __param(6, (0, common_1.Inject)((0, common_1.forwardRef)(() => orders_service_1.OrdersService))),
    __param(15, (0, common_1.Inject)((0, common_1.forwardRef)(() => users_repository_1.UserRepository))),
    __metadata("design:paramtypes", [Object, restaurants_service_1.RestaurantsService,
        drivers_service_1.DriversService,
        drivers_repository_1.DriversRepository,
        driver_stats_records_service_1.DriverStatsService,
        event_emitter_1.EventEmitter2,
        orders_service_1.OrdersService,
        finance_rules_service_1.FinanceRulesService,
        fwallets_repository_1.FWalletsRepository,
        transactions_service_1.TransactionService,
        driver_progress_stages_service_1.DriverProgressStagesService,
        typeorm_1.DataSource,
        address_book_repository_1.AddressBookRepository,
        jwt_1.JwtService,
        redis_service_1.RedisService,
        users_repository_1.UserRepository])
], DriversGateway);
//# sourceMappingURL=drivers.gateway.js.map