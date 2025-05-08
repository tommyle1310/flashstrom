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
const restaurant_entity_1 = require("../restaurants/entities/restaurant.entity");
const constants_1 = require("../utils/constants");
const redis_adapter_1 = require("@socket.io/redis-adapter");
const redis_service_1 = require("../redis/redis.service");
const common_2 = require("@nestjs/common");
const users_repository_1 = require("../users/users.repository");
const bcrypt = __importStar(require("bcryptjs"));
const Payload_1 = require("../types/Payload");
const logger = new common_2.Logger('DriversGateway');
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
            console.log('[DriversGateway] notifyPartiesOnce - trackingUpdate:', trackingUpdate);
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
                            const nextStateBase = currentStageIndex < stageOrder.length - 1
                                ? stageOrder[currentStageIndex + 1]
                                : null;
                            const nextState = nextStateBase
                                ? `${nextStateBase}_${orderSuffix}`
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
                                if (stage.state === currentState &&
                                    stage.status === 'in_progress') {
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
                                    const estimatedTime = this.calculateEstimatedTime(order.distance || 0);
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
                                    }
                                    else if (stage.status === 'pending') {
                                        return { ...stage, status: 'in_progress', timestamp };
                                    }
                                }
                                return stage;
                            });
                            if (nextStateBase && nextStateBase in stageToStatusMap) {
                                const newStatus = stageToStatusMap[nextStateBase];
                                const newTrackingInfo = stageToTrackingMap[nextStateBase];
                                logger.log(`Updating order ${order.id} status from ${order.status} to ${newStatus}`);
                                await transactionalEntityManager.update(order_entity_1.Order, { id: order.id }, {
                                    status: newStatus,
                                    tracking_info: newTrackingInfo,
                                    updated_at: Math.floor(Date.now() / 1000)
                                });
                            }
                        }
                        else if (currentStageIndex < stageOrder.length - 1) {
                            allCompleted = false;
                            const nextState = `driver_ready_${orderSuffix}`;
                            updatedStages = updatedStages.map((stage) => {
                                if (stage.state === nextState && stage.status === 'pending') {
                                    const estimatedTime = this.calculateEstimatedTime(order.distance || 0);
                                    dps.estimated_time_remaining =
                                        (dps.estimated_time_remaining || 0) + estimatedTime;
                                    stage.details.estimated_time = estimatedTime;
                                    return { ...stage, status: 'in_progress', timestamp };
                                }
                                return stage;
                            });
                            const newStatus = stageToStatusMap['driver_ready'];
                            const newTrackingInfo = stageToTrackingMap['driver_ready'];
                            await transactionalEntityManager.update(order_entity_1.Order, { id: order.id }, {
                                status: newStatus,
                                tracking_info: newTrackingInfo,
                                updated_at: Math.floor(Date.now() / 1000)
                            });
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
                        await transactionalEntityManager.update(order_entity_1.Order, { id: targetOrderId }, {
                            status: newStatus,
                            tracking_info: newTrackingInfo,
                            updated_at: Math.floor(Date.now() / 1000)
                        });
                    }
                }
                const inProgressStage = updatedStages.find(stage => stage.status === 'in_progress');
                let newCurrentState;
                let newPreviousState = dps.current_state;
                let newNextState = null;
                if (inProgressStage) {
                    newCurrentState = inProgressStage.state;
                    const currentIndex = stageOrder.findIndex(base => inProgressStage.state.startsWith(base));
                    newNextState =
                        currentIndex < stageOrder.length - 1
                            ? `${stageOrder[currentIndex + 1]}_${inProgressStage.state.split('_order_')[1]}`
                            : null;
                }
                else {
                    const lastCompletedDelivery = updatedStages
                        .filter(stage => stage.state.startsWith('delivery_complete_') &&
                        stage.status === 'completed')
                        .sort((a, b) => b.timestamp - a.timestamp)[0];
                    newCurrentState = lastCompletedDelivery
                        ? lastCompletedDelivery.state
                        : dps.current_state;
                    newPreviousState = lastCompletedDelivery
                        ? dps.current_state
                        : newPreviousState;
                    newNextState = lastCompletedDelivery ? null : newNextState;
                }
                const allDeliveryCompleteStages = updatedStages.filter(stage => stage.state.startsWith('delivery_complete_'));
                const allDeliveryCompleteDone = allDeliveryCompleteStages.every(stage => stage.status === 'completed');
                const updateResult = await this.driverProgressStageService.updateStage(data.stageId, {
                    current_state: newCurrentState,
                    previous_state: newPreviousState,
                    next_state: newNextState,
                    stages: updatedStages,
                    orders: dps.orders,
                    estimated_time_remaining: dps.estimated_time_remaining,
                    actual_time_spent: dps.actual_time_spent,
                    total_distance_travelled: Number(Number(dps.total_distance_travelled || 0).toFixed(4)),
                    total_tips: dps.total_tips,
                    total_earns: dps.total_earns,
                    transactions_processed: dps.transactions_processed ||
                        (allDeliveryCompleteDone ? false : undefined)
                }, transactionalEntityManager);
                if (allDeliveryCompleteDone &&
                    allDeliveryCompleteStages.length > 0 &&
                    !updateResult.data.transactions_processed) {
                    logger.log('Processing COD transactions for completed deliveries');
                    const driver = await transactionalEntityManager
                        .getRepository(driver_entity_1.Driver)
                        .findOne({ where: { id: dps.driver_id } });
                    if (!driver) {
                        logger.error(`Driver ${dps.driver_id} not found`);
                        throw new Error(`Driver ${dps.driver_id} not found`);
                    }
                    logger.log('Found driver:', driver);
                    const driverWallet = await this.fWalletsRepository.findByUserId(driver.user_id, transactionalEntityManager);
                    if (!driverWallet) {
                        logger.error(`Wallet not found for driver ${dps.driver_id}`);
                        throw new Error(`Wallet not found for driver ${dps.driver_id}`);
                    }
                    logger.log('Found driver wallet:', {
                        id: driverWallet.id,
                        balance: driverWallet.balance
                    });
                    for (const order of dps.orders) {
                        if (order.payment_method === 'COD') {
                            logger.log('Processing COD transaction for order:', order.id);
                            const restaurant = await transactionalEntityManager
                                .getRepository(restaurant_entity_1.Restaurant)
                                .findOne({ where: { id: order.restaurant_id } });
                            if (!restaurant) {
                                logger.error(`Restaurant ${order.restaurant_id} not found`);
                                throw new Error(`Restaurant ${order.restaurant_id} not found`);
                            }
                            logger.log('Found restaurant:', restaurant);
                            const restaurantWallet = await this.fWalletsRepository.findByUserId(restaurant.owner_id, transactionalEntityManager);
                            if (!restaurantWallet) {
                                logger.error(`Wallet not found for restaurant ${order.restaurant_id}`);
                                throw new Error(`Wallet not found for restaurant ${order.restaurant_id}`);
                            }
                            logger.log('Found restaurant wallet:', {
                                id: restaurantWallet.id,
                                balance: restaurantWallet.balance
                            });
                            const codTransactionDto = {
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
                            logger.log('Creating COD transaction with DTO:', codTransactionDto);
                            const codTransactionResponse = await this.transactionsService.create(codTransactionDto, transactionalEntityManager);
                            if (codTransactionResponse.EC !== 0) {
                                logger.error('COD Transaction failed:', codTransactionResponse);
                                throw new Error(`COD Transaction failed: ${codTransactionResponse.EM}`);
                            }
                            logger.log('COD transaction created successfully:', codTransactionResponse.data);
                            logger.log('Updating order payment status to PAID');
                            const orderUpdateResult = await this.ordersService.updateOrderPaymentStatus(order.id, 'PAID', transactionalEntityManager);
                            logger.log('Order payment status update result:', orderUpdateResult);
                        }
                    }
                    if (dps.total_earns > 0) {
                        logger.log('Processing driver earnings transaction:', {
                            driverId: driver.id,
                            amount: dps.total_earns
                        });
                        let flashfoodUser = await this.userRepository.findById(constants_1.FLASHFOOD_FINANCE_neon_test_branch.user_id, transactionalEntityManager);
                        if (!flashfoodUser) {
                            logger.log('Creating FlashFood finance user');
                            flashfoodUser = await this.userRepository.create({
                                id: constants_1.FLASHFOOD_FINANCE_neon_test_branch.user_id,
                                email: constants_1.FLASHFOOD_FINANCE_neon_test_branch.email,
                                password: await bcrypt.hash('flashfood123', 10),
                                first_name: 'FlashFood',
                                last_name: 'Finance',
                                user_type: [Payload_1.Enum_UserType.F_WALLET],
                                is_verified: true
                            });
                            logger.log('Created FlashFood finance user:', flashfoodUser);
                        }
                        let flashfoodWallet = await this.fWalletsRepository.findById(constants_1.FLASHFOOD_FINANCE_neon_test_branch.id, transactionalEntityManager);
                        console.log('check flas wall', flashfoodWallet);
                        if (!flashfoodWallet) {
                            logger.log('Creating FlashFood finance wallet');
                            flashfoodWallet = await this.fWalletsRepository.create({
                                user_id: flashfoodUser.id,
                                balance: 1000000,
                                email: flashfoodUser.email,
                                password: 'dummy',
                                first_name: flashfoodUser.first_name,
                                last_name: flashfoodUser.last_name
                            }, transactionalEntityManager);
                            logger.log('Created FlashFood finance wallet:', flashfoodWallet);
                        }
                        const earningsTransactionDto = {
                            user_id: driver.user_id,
                            fwallet_id: flashfoodWallet.id,
                            transaction_type: 'PURCHASE',
                            amount: dps.total_earns,
                            balance_after: parseFloat(flashfoodWallet.balance.toString()) -
                                dps.total_earns,
                            status: 'PENDING',
                            version: flashfoodWallet.version || 0,
                            source: 'FWALLET',
                            destination: driverWallet.id,
                            destination_type: 'FWALLET'
                        };
                        logger.log('Creating earnings transaction with DTO:', earningsTransactionDto);
                        const earningsTransactionResponse = await this.transactionsService.create(earningsTransactionDto, transactionalEntityManager);
                        console.log('chekc ưtfwtf reéesponse', earningsTransactionResponse);
                        if (earningsTransactionResponse.EC !== 0) {
                            logger.error('Earnings transaction failed:', earningsTransactionResponse);
                            throw new Error(`Earnings transaction failed: ${earningsTransactionResponse.EM}`);
                        }
                        logger.log('Earnings transaction created successfully:', earningsTransactionResponse.data);
                    }
                    dps.transactions_processed = true;
                    await transactionalEntityManager.save(driver_progress_stage_entity_1.DriverProgressStage, dps);
                    logger.log('Updated driver progress stage transactions_processed flag');
                }
                const newStagesString = JSON.stringify(updateResult.data.stages);
                const hasChanges = oldStagesString !== newStagesString ||
                    oldCurrentState !== updateResult.data.current_state ||
                    oldPreviousState !== updateResult.data.previous_state ||
                    oldNextState !== updateResult.data.next_state;
                const allStagesCompleted = updateResult.data.stages.every(stage => stage.status === 'completed');
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
                else {
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
                if (!updatedOrder.driver && updatedOrder.driver_id) {
                    console.warn(`[DriversGateway] updatedOrder.driver is null, fetching driver with id: ${updatedOrder.driver_id}`);
                    updatedOrder.driver = await transactionalEntityManager
                        .getRepository(driver_entity_1.Driver)
                        .findOne({ where: { id: updatedOrder.driver_id } });
                    if (!updatedOrder.driver) {
                        console.error(`[DriversGateway] Driver ${updatedOrder.driver_id} not found`);
                    }
                }
                console.log('[DriversGateway] handleDriverProgressUpdate - updatedOrder.driver:', updatedOrder.driver);
                await this.notifyPartiesOnce(updatedOrder);
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
        if (!driverId || !driverId.startsWith('FF_DRI_')) {
            console.error(`[DriversGateway] Invalid driverId: ${driverId}`);
            return { success: false, message: 'Invalid driverId' };
        }
        if (!orderId || !orderId.startsWith('FF_ORDER_')) {
            console.error(`[DriversGateway] Invalid orderId: ${orderId}`);
            return { success: false, message: 'Invalid orderId' };
        }
        const lockKey = `${driverId}_${orderId}`;
        console.log(`[DriversGateway] Driver ${driverId} accepting order ${orderId}`);
        if (this.processingOrders.has(lockKey)) {
            console.log(`[DriversGateway] Order ${orderId} already being processed by driver ${driverId}`);
            return { success: false, message: 'Order is already being processed' };
        }
        this.processingOrders.add(lockKey);
        const maxRetries = 3;
        let attempt = 0;
        while (attempt < maxRetries) {
            try {
                const result = await Promise.race([
                    this.dataSource.transaction('SERIALIZABLE', async (transactionalEntityManager) => {
                        console.log('[DriversGateway] Starting transaction for order:', orderId);
                        const order = await transactionalEntityManager
                            .getRepository(order_entity_1.Order)
                            .createQueryBuilder('order')
                            .setLock('pessimistic_write')
                            .where('order.id = :orderId', { orderId })
                            .getOne();
                        if (!order) {
                            console.error(`[DriversGateway] Order not found in DB for orderId: ${orderId}`);
                            throw new websockets_1.WsException('Order not found');
                        }
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
                                'restaurant.address',
                                'driver'
                            ]
                        });
                        if (!orderWithRelations)
                            throw new websockets_1.WsException('Order not found');
                        const driver = await transactionalEntityManager
                            .getRepository(driver_entity_1.Driver)
                            .findOne({ where: { id: driverId } });
                        if (!driver)
                            throw new websockets_1.WsException('Driver not found');
                        const driverWithRelations = await transactionalEntityManager
                            .getRepository(driver_entity_1.Driver)
                            .findOne({
                            where: { id: driverId },
                            relations: ['current_orders']
                        });
                        if (!driverWithRelations)
                            throw new websockets_1.WsException('Driver not found');
                        const existingDPS = await transactionalEntityManager
                            .getRepository(driver_progress_stage_entity_1.DriverProgressStage)
                            .createQueryBuilder('dps')
                            .where('dps.driver_id = :driverId', { driverId })
                            .andWhere('dps.current_state NOT LIKE :completedState', {
                            completedState: 'delivery_complete_%'
                        })
                            .getOne();
                        let dps;
                        const timestamp = Math.floor(Date.now() / 1000);
                        const rawDistance = orderWithRelations.distance || 0;
                        const distance = typeof rawDistance === 'string'
                            ? parseFloat(rawDistance)
                            : Number(rawDistance);
                        if (isNaN(distance)) {
                            console.warn(`[DriversGateway] Invalid distance value for order ${orderId}: ${rawDistance}`);
                            throw new websockets_1.WsException('Invalid distance value in order');
                        }
                        const estimatedTime = this.calculateEstimatedTime(distance);
                        const totalTips = orderWithRelations.driver_tips || 0;
                        const latestFinanceRuleResponse = await this.financeRulesService.findOneLatest();
                        const { EC, EM, data } = latestFinanceRuleResponse;
                        console.log('[DriversGateway] check finance rule data:', data);
                        if (EC !== 0)
                            throw new websockets_1.WsException(EM);
                        let driver_wage;
                        if (distance >= 0 && distance <= 1) {
                            driver_wage = Number(data.driver_fixed_wage['0-1km']);
                        }
                        else if (distance > 1 && distance <= 2) {
                            driver_wage = Number(data.driver_fixed_wage['1-2km']);
                        }
                        else if (distance > 2 && distance <= 3) {
                            driver_wage = Number(data.driver_fixed_wage['2-3km']);
                        }
                        else if (distance > 4 && distance <= 5) {
                            driver_wage = Number(data.driver_fixed_wage['4-5km']);
                        }
                        else if (distance > 5) {
                            const formula = data.driver_fixed_wage['>5km'];
                            try {
                                driver_wage = (0, mathjs_1.evaluate)(formula.replace('km', distance.toString()));
                                console.log('[DriversGateway] Calculated driver wage:', driver_wage);
                            }
                            catch (error) {
                                console.error('[DriversGateway] Error evaluating wage formula:', error);
                                throw new websockets_1.WsException('Invalid wage formula');
                            }
                        }
                        else {
                            console.warn(`[DriversGateway] Invalid distance range for order ${orderId}: ${distance}`);
                            throw new websockets_1.WsException('Invalid distance value');
                        }
                        console.log('[DriversGateway] check driver wage:', driver_wage);
                        const totalEarns = driver_wage;
                        console.log('[DriversGateway] check total earns:', totalEarns);
                        if (!existingDPS) {
                            console.log(`[DriversGateway] No existing DPS found for driver ${driverId}, creating new one`);
                            const dpsResponse = await this.driverProgressStageService.create({
                                driver_id: driverId,
                                orders: [orderWithRelations],
                                current_state: 'driver_ready_order_1',
                                estimated_time_remaining: estimatedTime,
                                total_distance_travelled: Number(distance.toFixed(4)),
                                total_tips: totalTips,
                                total_earns: totalEarns
                            }, transactionalEntityManager);
                            if (dpsResponse.EC !== 0 || !dpsResponse.data)
                                throw new websockets_1.WsException(`Failed to create new DPS`);
                            dps = dpsResponse.data;
                            dps.stages = dps.stages.map(stage => {
                                const details = this.getStageDetails(stage.state, orderWithRelations, driverWithRelations, estimatedTime, totalTips);
                                return { ...stage, details };
                            });
                            console.log('[DriversGateway] Saving new DPS');
                            await transactionalEntityManager.save(driver_progress_stage_entity_1.DriverProgressStage, dps);
                            console.log(`[DriversGateway] Created DPS with total_earns=${dps.total_earns}`);
                        }
                        else {
                            console.log(`[DriversGateway] Existing DPS found for driver ${driverId}, adding order`);
                            const dpsResponse = await this.driverProgressStageService.addOrderToExistingDPS(existingDPS.id, orderWithRelations, transactionalEntityManager);
                            if (dpsResponse.EC !== 0 || !dpsResponse.data)
                                throw new websockets_1.WsException(`Failed to add order to existing DPS`);
                            dps = dpsResponse.data;
                            const orderAlreadyInDPS = dps.orders?.some(o => o.id === orderId);
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
                            }
                            else {
                                console.log(`[DriversGateway] Order ${orderId} already in DPS, skipping earnings update`);
                            }
                            dps.stages = dps.stages.map(stage => {
                                const details = this.getStageDetails(stage.state, orderWithRelations, driverWithRelations, estimatedTime, totalTips);
                                return { ...stage, details };
                            });
                            console.log('[DriversGateway] Saving updated DPS');
                            await transactionalEntityManager.save(driver_progress_stage_entity_1.DriverProgressStage, dps);
                            console.log(`[DriversGateway] Updated DPS with total_earns=${dps.total_earns}`);
                        }
                        orderWithRelations.driver_id = driverId;
                        orderWithRelations.driver_wage = driver_wage;
                        orderWithRelations.status = order_entity_1.OrderStatus.DISPATCHED;
                        orderWithRelations.tracking_info = order_entity_1.OrderTrackingInfo.DISPATCHED;
                        orderWithRelations.updated_at = timestamp;
                        console.log('[DriversGateway] Saving order with driver_id:', driverId, 'driver_wage:', driver_wage);
                        await transactionalEntityManager.save(order_entity_1.Order, orderWithRelations);
                        driverWithRelations.current_orders =
                            driverWithRelations.current_orders || [];
                        if (!driverWithRelations.current_orders.some(o => o.id === orderId)) {
                            driverWithRelations.current_orders.push(orderWithRelations);
                        }
                        console.log('[DriversGateway] Saving driver');
                        await transactionalEntityManager.save(driver_entity_1.Driver, driverWithRelations);
                        const updatedOrder = await transactionalEntityManager
                            .getRepository(order_entity_1.Order)
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
                            throw new websockets_1.WsException('Order not found after update');
                        console.log('[DriversGateway] Transaction completed, updatedOrder:', {
                            id: updatedOrder.id,
                            driver_id: updatedOrder.driver_id,
                            driver_wage: updatedOrder.driver_wage,
                            status: updatedOrder.status
                        });
                        return { success: true, order: updatedOrder, dps };
                    }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Transaction timeout after 30s')), 30000))
                ]);
                if (result instanceof Error)
                    throw result;
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
                            console.log('[DriversGateway] Emitted driverStagesUpdated to driver:', driverId);
                            break;
                        }
                        else {
                            console.error('[DriversGateway] WebSocket server is null, cannot emit driverStagesUpdated');
                            break;
                        }
                    }
                    catch (emitError) {
                        console.warn(`[DriversGateway] Emit failed, retry ${i + 1}/${maxEmitRetries}:`, emitError);
                        if (i === maxEmitRetries - 1)
                            console.error('[DriversGateway] Emit failed after retries');
                        await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
                    }
                }
                return result;
            }
            catch (error) {
                if (error.code === '40001' && attempt < maxRetries - 1) {
                    attempt++;
                    console.log(`[DriversGateway] Retry attempt ${attempt} for driver ${driverId} due to serialization failure`);
                    await new Promise(resolve => setTimeout(resolve, 100 * attempt));
                    continue;
                }
                console.error('[DriversGateway] Error in handleDriverAcceptOrder:', error);
                return {
                    success: false,
                    message: error.message || 'Internal server error'
                };
            }
            finally {
                this.processingOrders.delete(lockKey);
                console.log(`[DriversGateway] Processing lock released for ${lockKey}`);
            }
        }
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
        return (address || {
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
        });
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
        if (order.payment_method === 'COD') {
            await this.ordersService.updateOrderPaymentStatus(order.id, 'PAID', transactionalEntityManager);
            logger.log('Processing COD transaction for order:', order.id);
            const driver = await transactionalEntityManager
                .getRepository(driver_entity_1.Driver)
                .findOne({ where: { id: dps.driver_id } });
            if (!driver) {
                logger.error(`Driver ${dps.driver_id} not found`);
                throw new Error(`Driver ${dps.driver_id} not found`);
            }
            const driverWallet = await this.fWalletsRepository.findByUserId(driver.user_id, transactionalEntityManager);
            if (!driverWallet) {
                logger.error(`Wallet not found for driver ${dps.driver_id}`);
                throw new Error(`Wallet not found for driver ${dps.driver_id}`);
            }
            const restaurant = await transactionalEntityManager
                .getRepository(restaurant_entity_1.Restaurant)
                .findOne({ where: { id: order.restaurant_id } });
            if (!restaurant) {
                logger.error(`Restaurant ${order.restaurant_id} not found`);
                throw new Error(`Restaurant ${order.restaurant_id} not found`);
            }
            const restaurantWallet = await this.fWalletsRepository.findByUserId(restaurant.owner_id, transactionalEntityManager);
            if (!restaurantWallet) {
                logger.error(`Wallet not found for restaurant ${order.restaurant_id}`);
                throw new Error(`Wallet not found for restaurant ${order.restaurant_id}`);
            }
            const codTransactionDto = {
                user_id: driver.user_id,
                fwallet_id: driverWallet.id,
                transaction_type: 'WITHDRAW',
                amount: Number(order.total_amount),
                balance_after: 0,
                version: driverWallet.version || 0,
                status: 'PENDING',
                source: 'FWALLET',
                destination: restaurantWallet.id,
                destination_type: 'FWALLET'
            };
            const codTransactionResponse = await this.transactionsService.create(codTransactionDto, transactionalEntityManager);
            if (codTransactionResponse.EC !== 0) {
                logger.error('COD Transaction failed:', codTransactionResponse);
                throw new Error(`COD Transaction failed: ${codTransactionResponse.EM}`);
            }
            logger.log('COD transaction created successfully:', codTransactionResponse.data);
        }
        const rawDistance = order.distance || 0;
        const distance = typeof rawDistance === 'string'
            ? parseFloat(rawDistance)
            : Number(rawDistance);
        if (isNaN(distance)) {
            logger.error(`Invalid distance value for order ${order.id}: ${rawDistance}`);
            throw new Error('Invalid distance value in order');
        }
        const latestFinanceRuleResponse = await this.financeRulesService.findOneLatest();
        const { EC, EM, data: financeRules } = latestFinanceRuleResponse;
        if (EC !== 0)
            throw new Error(EM);
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
                logger.error('Error evaluating wage formula:', error);
                throw new Error('Invalid wage formula');
            }
        }
        else {
            logger.error(`Invalid distance range for order ${order.id}: ${distance}`);
            throw new Error('Invalid distance value');
        }
        const driver = await transactionalEntityManager
            .getRepository(driver_entity_1.Driver)
            .findOne({ where: { id: dps.driver_id } });
        if (!driver) {
            logger.error(`Driver ${dps.driver_id} not found`);
            throw new Error(`Driver ${dps.driver_id} not found`);
        }
        const driverWallet = await this.fWalletsRepository.findByUserId(driver.user_id, transactionalEntityManager);
        if (!driverWallet) {
            logger.error(`Wallet not found for driver ${dps.driver_id}`);
            throw new Error(`Wallet not found for driver ${dps.driver_id}`);
        }
        let flashfoodUser = await this.userRepository.findById(constants_1.FLASHFOOD_FINANCE_neon_test_branch.user_id, transactionalEntityManager);
        if (!flashfoodUser) {
            flashfoodUser = await this.userRepository.create({
                id: constants_1.FLASHFOOD_FINANCE_neon_test_branch.user_id,
                email: constants_1.FLASHFOOD_FINANCE_neon_test_branch.email,
                password: await bcrypt.hash('flashfood123', 10),
                first_name: 'FlashFood',
                last_name: 'Finance',
                user_type: [Payload_1.Enum_UserType.F_WALLET],
                is_verified: true
            });
        }
        let flashfoodWallet = await this.fWalletsRepository.findById(constants_1.FLASHFOOD_FINANCE_neon_test_branch.id, transactionalEntityManager);
        if (!flashfoodWallet) {
            flashfoodWallet = await this.fWalletsRepository.create({
                user_id: flashfoodUser.id,
                balance: 1000000,
                email: flashfoodUser.email,
                password: 'dummy',
                first_name: flashfoodUser.first_name,
                last_name: flashfoodUser.last_name
            }, transactionalEntityManager);
        }
        const totalEarnings = Number(driver_wage) + Number(order.driver_tips || 0);
        logger.log(`Processing driver earnings for order ${order.id}:`, {
            base_wage: driver_wage,
            tips: order.driver_tips,
            total: totalEarnings
        });
        const earningsTransactionDto = {
            user_id: driver.user_id,
            fwallet_id: flashfoodWallet.id,
            transaction_type: 'PURCHASE',
            amount: totalEarnings,
            balance_after: Number(flashfoodWallet.balance) - totalEarnings,
            status: 'PENDING',
            version: flashfoodWallet.version || 0,
            source: 'FWALLET',
            destination: driverWallet.id,
            destination_type: 'FWALLET'
        };
        const earningsTransactionResponse = await this.transactionsService.create(earningsTransactionDto, transactionalEntityManager);
        if (earningsTransactionResponse.EC !== 0) {
            logger.error('Driver earnings transaction failed:', earningsTransactionResponse);
            throw new Error(`Earnings transaction failed: ${earningsTransactionResponse.EM}`);
        }
        logger.log('Driver earnings transaction created successfully:', earningsTransactionResponse.data);
        await transactionalEntityManager.update(order_entity_1.Order, { id: order.id }, {
            driver_wage,
            status: order_entity_1.OrderStatus.DELIVERED,
            tracking_info: order_entity_1.OrderTrackingInfo.DELIVERED,
            updated_at: Math.floor(Date.now() / 1000)
        });
        dps.total_tips =
            Number(dps.total_tips || 0) + Number(order.driver_tips || 0);
        dps.total_earns = Number(dps.total_earns || 0) + totalEarnings;
        dps.total_distance_travelled =
            Number(dps.total_distance_travelled || 0) + Number(distance);
        await transactionalEntityManager
            .createQueryBuilder()
            .delete()
            .from('driver_current_orders')
            .where('driver_id = :driverId', { driverId: dps.driver_id })
            .andWhere('order_id = :orderId', { orderId: order.id })
            .execute();
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