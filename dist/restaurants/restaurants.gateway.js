"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestaurantsGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const restaurants_service_1 = require("./restaurants.service");
const update_restaurant_dto_1 = require("./dto/update-restaurant.dto");
const drivers_service_1 = require("../drivers/drivers.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const common_1 = require("@nestjs/common");
const commonFunctions_1 = require("../utils/commonFunctions");
const order_entity_1 = require("../orders/entities/order.entity");
const orders_repository_1 = require("../orders/orders.repository");
const jwt_1 = require("@nestjs/jwt");
const finance_rules_service_1 = require("../finance_rules/finance_rules.service");
const mathjs_1 = require("mathjs");
const driver_stats_records_service_1 = require("../driver_stats_records/driver_stats_records.service");
const redis_service_1 = require("../redis/redis.service");
const redis_adapter_1 = require("@socket.io/redis-adapter");
const orders_service_1 = require("../orders/orders.service");
let RestaurantsGateway = class RestaurantsGateway {
    constructor(socketServer, restaurantsService, driverService, eventEmitter, ordersRepository, jwtService, driverStatsService, financeRulesService, redisService, ordersService) {
        this.socketServer = socketServer;
        this.restaurantsService = restaurantsService;
        this.driverService = driverService;
        this.eventEmitter = eventEmitter;
        this.ordersRepository = ordersRepository;
        this.jwtService = jwtService;
        this.driverStatsService = driverStatsService;
        this.financeRulesService = financeRulesService;
        this.redisService = redisService;
        this.ordersService = ordersService;
        this.notificationLock = new Map();
        this.activeConnections = new Map();
        this.restaurantSockets = new Map();
        this.isListenerRegistered = false;
        this.redisClient = this.redisService.getClient();
        console.log('[RestaurantsGateway] Constructor called, instance ID:', Math.random());
    }
    afterInit() {
        console.log('[RestaurantsGateway] Initialized');
        if (!this.server) {
            console.error('[RestaurantsGateway] WebSocket server is null after initialization');
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
                        console.log('[RestaurantsGateway] Redis subClient already open, skipping connect');
                    }
                    else {
                        await subClient.connect();
                        console.log('[RestaurantsGateway] Redis subClient connected');
                    }
                    const redisAdapter = (0, redis_adapter_1.createAdapter)(pubClient, subClient);
                    this.server.adapter(redisAdapter);
                    console.log('[RestaurantsGateway] Socket.IO Redis adapter initialized successfully');
                }
                catch (err) {
                    if (retryCount < maxRetries) {
                        retryCount++;
                        console.warn(`[RestaurantsGateway] Retrying Redis connection (${retryCount}/${maxRetries})...`);
                        setTimeout(connectRedis, 2000);
                    }
                    else {
                        console.error('[RestaurantsGateway] Failed to initialize Redis adapter after retries:', err.message);
                    }
                }
            };
            connectRedis();
        }
        catch (err) {
            console.error('[RestaurantsGateway] Error setting up Redis adapter:', err.message);
        }
        const listenerCount = this.eventEmitter.listenerCount('listenUpdateOrderTracking');
        console.log(`[RestaurantsGateway] Current listenUpdateOrderTracking listeners: ${listenerCount}`);
        if (listenerCount > 1) {
            console.warn('[RestaurantsGateway] Multiple listeners detected, removing all');
            this.eventEmitter.removeAllListeners('listenUpdateOrderTracking');
        }
        if (!this.isListenerRegistered) {
            this.eventEmitter.on('listenUpdateOrderTracking', this.handleOrderTrackingUpdate.bind(this));
            this.isListenerRegistered = true;
            console.log('[RestaurantsGateway] Registered listener for listenUpdateOrderTracking');
        }
        this.server.setMaxListeners(300);
    }
    async onModuleDestroy() {
        this.eventEmitter.removeListener('listenUpdateOrderTracking', this.handleOrderTrackingUpdate.bind(this));
        this.isListenerRegistered = false;
        if (this.redisClient && this.redisClient.isOpen) {
            await this.redisClient.quit();
        }
        console.log('[RestaurantsGateway] Removed listener and closed Redis connection');
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
            console.error('[RestaurantsGateway] Token validation error:', error.message);
            throw new websockets_1.WsException('Token validation failed');
        }
    }
    async handleConnection(client) {
        try {
            console.log('⚡️ Client connected to restaurant namespace:', client.id);
            const restaurantData = await this.validateToken(client);
            if (!restaurantData) {
                console.log('[RestaurantsGateway] Invalid token, disconnecting:', client.id);
                client.disconnect(true);
                return;
            }
            const restaurantId = restaurantData.id;
            console.log(`[RestaurantsGateway] Restaurant ${restaurantId} attempting connection:`, client.id);
            const lockKey = `lock:restaurant:connect:${restaurantId}`;
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
                            console.log(`[RestaurantsGateway] Active connection exists for restaurant ${restaurantId} with socket ${existingSocketId}, disconnecting ${client.id}`);
                            client.disconnect(true);
                            return;
                        }
                        await this.redisService.del(lockKey);
                    }
                    retryCount++;
                    console.log(`[RestaurantsGateway] Retrying lock for restaurant ${restaurantId} (${retryCount}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                }
            }
            if (!lockAcquired) {
                console.log(`[RestaurantsGateway] Failed to acquire lock for restaurant ${restaurantId}, disconnecting ${client.id}`);
                client.disconnect(true);
                return;
            }
            try {
                const clients = await this.server
                    .in(`restaurant_${restaurantId}`)
                    .fetchSockets();
                if (clients.length > 0) {
                    console.warn(`[RestaurantsGateway] Multiple clients detected in room restaurant_${restaurantId}, cleaning up`);
                    await this.cleanupRestaurantConnections(restaurantId, client.id);
                }
                await client.join(`restaurant_${restaurantId}`);
                console.log(`Restaurant auto-joined restaurant_${restaurantId} via token`);
                this.restaurantSockets.set(restaurantId, new Set([client.id]));
                console.log(`[RestaurantsGateway] Updated socket set for restaurant ${restaurantId}:`, this.restaurantSockets.get(restaurantId));
                this.activeConnections.set(client.id, client);
                const updatedClients = await this.server
                    .in(`restaurant_${restaurantId}`)
                    .fetchSockets();
                console.log(`[RestaurantsGateway] Clients in room restaurant_${restaurantId}:`, updatedClients.length);
                client.emit('connected', { restaurantId, status: 'connected' });
            }
            finally {
                await this.redisService.del(lockKey);
            }
        }
        catch (error) {
            console.error('[RestaurantsGateway] Error handling connection:', error.message);
            client.disconnect(true);
        }
    }
    async cleanupRestaurantConnections(restaurantId, newSocketId) {
        console.log(`[RestaurantsGateway] Cleaning up connections for restaurant ${restaurantId}`);
        const socketIds = this.restaurantSockets.get(restaurantId) || new Set();
        const existingSockets = await this.server
            .in(`restaurant_${restaurantId}`)
            .fetchSockets();
        for (const socket of existingSockets) {
            if (socket.id !== newSocketId) {
                const activeSocket = this.activeConnections.get(socket.id);
                if (activeSocket) {
                    console.log(`[RestaurantsGateway] Disconnecting old socket ${socket.id} for restaurant ${restaurantId}`);
                    activeSocket.removeAllListeners();
                    activeSocket.leave(`restaurant_${restaurantId}`);
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
        this.restaurantSockets.delete(restaurantId);
        console.log(`[RestaurantsGateway] Removed socket set for restaurant ${restaurantId}`);
        this.notificationLock.delete(`notify_${restaurantId}`);
    }
    handleDisconnect(client) {
        console.log('❌ Client disconnected from restaurant namespace:', client.id);
        const restaurantId = Array.from(this.restaurantSockets.keys()).find(key => {
            const socketSet = this.restaurantSockets.get(key);
            return socketSet && socketSet.has(client.id);
        });
        this.activeConnections.delete(client.id);
        if (restaurantId) {
            const socketSet = this.restaurantSockets.get(restaurantId);
            if (socketSet) {
                socketSet.delete(client.id);
                if (socketSet.size === 0) {
                    this.restaurantSockets.delete(restaurantId);
                }
            }
            client.leave(`restaurant_${restaurantId}`);
            client.removeAllListeners();
        }
    }
    async handleUpdateRestaurant(updateRestaurantDto) {
        const restaurant = await this.restaurantsService.update(updateRestaurantDto.id, updateRestaurantDto);
        this.server.emit('restaurantUpdated', restaurant);
        return restaurant;
    }
    async handleNewOrder(order) {
        await this.server
            .to(`restaurant_${order.restaurant_id}`)
            .emit('incomingOrderForRestaurant', {
            orderId: order.order.orderId,
            status: order.order.status,
            tracking_info: order.order.tracking_info,
            updated_at: order.order.updated_at,
            customer_id: order.order.customer_id,
            driver_id: order.order.driver_id,
            restaurant_id: order.order.restaurant_id,
            restaurant_avatar: order.order.restaurant_avatar || null,
            driver_avatar: order.order.driver_avatar || null,
            restaurantAddress: order.order.restaurantAddress,
            customerAddress: order.order.customerAddress
        });
        console.log(`Emitted incomingOrderForRestaurant to restaurant_${order.restaurant_id}`);
        return {
            event: 'newOrderForRestaurant',
            data: order,
            message: `Notified customer ${order.customer_id}`
        };
    }
    async handleRestaurantAccept(data, client) {
        const { orderDetails: orderId, availableDrivers } = data;
        const restaurantId = Array.from(this.restaurantSockets.keys()).find(key => {
            const socketSet = this.restaurantSockets.get(key);
            return socketSet && socketSet.has(client.id);
        });
        if (!restaurantId) {
            throw new websockets_1.WsException('Restaurant not authorized');
        }
        const lockKey = `event:restaurant:accept:${orderId}`;
        const lockAcquired = await this.redisService.setNx(lockKey, client.id, 300000);
        if (!lockAcquired) {
            console.log(`[RestaurantsGateway] Skipping duplicated restaurantAccept for order ${orderId}`);
            return { event: 'restaurantAcceptWithAvailableDrivers', data: undefined };
        }
        try {
            const order = await this.ordersService.findOne(orderId);
            if (!order?.data) {
                throw new websockets_1.WsException(`Order ${orderId} not found`);
            }
            if (order.data.restaurant_id !== restaurantId) {
                throw new websockets_1.WsException('Restaurant not authorized for this order');
            }
            await this.ordersService.update(orderId, {
                status: order_entity_1.OrderStatus.PREPARING,
                tracking_info: order_entity_1.OrderTrackingInfo.PREPARING
            });
            const mappedDrivers = this.prepareDriverData(availableDrivers);
            const responsePrioritizeDrivers = await this.driverService.prioritizeAndAssignDriver(mappedDrivers, order.data);
            if (!this.isValidDriverResponse(responsePrioritizeDrivers)) {
                console.log('[RestaurantsGateway] No suitable driver found for order:', orderId);
                return {
                    event: 'noDriver',
                    data: { message: 'No suitable driver found' }
                };
            }
            const selectedDriver = responsePrioritizeDrivers.data[0];
            const { distance, driver_wage } = await this.calculateOrderMetrics(order.data);
            if (driver_wage === null) {
                throw new websockets_1.WsException('Failed to calculate driver wage');
            }
            await this.updateOrderWithMetrics(orderId, distance, driver_wage);
            const updatedOrder = await this.getUpdatedOrder(orderId);
            await this.notifyDriverAndParties(updatedOrder, selectedDriver.id, driver_wage);
            await this.notifyPartiesOnce(updatedOrder);
            console.log('[RestaurantsGateway] Successfully handled restaurantAccept for order:', orderId);
            return { event: 'restaurantAcceptWithAvailableDrivers', data: undefined };
        }
        catch (error) {
            console.error('[RestaurantsGateway] Error handling restaurantAccept:', error);
            throw new websockets_1.WsException(error.message);
        }
        finally {
            await this.redisService.del(lockKey);
        }
    }
    prepareDriverData(availableDrivers) {
        return availableDrivers.map(item => ({
            id: item.id,
            location: { lat: item.lat, lng: item.lng },
            active_points: 0,
            current_order_id: []
        }));
    }
    isValidDriverResponse(response) {
        return response.EC === 0 && response.data.length > 0;
    }
    async calculateOrderMetrics(order) {
        const res_location = order.restaurantAddress;
        const customer_location = order.customerAddress;
        const distance = (0, commonFunctions_1.calculateDistance)(customer_location?.location?.lat ?? 0, customer_location?.location?.lng ?? 0, res_location?.location?.lat ?? 0, res_location?.location?.lng ?? 0);
        const driver_wage = await this.calculateDriverWage(distance);
        return { distance, driver_wage };
    }
    async calculateDriverWage(distance) {
        const latestFinanceRuleResponse = await this.financeRulesService.findOneLatest();
        const { EC, EM, data } = latestFinanceRuleResponse;
        if (EC !== 0) {
            console.error('Error getting finance rules:', EM);
            return null;
        }
        try {
            if (distance >= 0 && distance <= 1) {
                return data.driver_fixed_wage['0-1km'];
            }
            else if (distance > 1 && distance <= 2) {
                return data.driver_fixed_wage['1-2km'];
            }
            else if (distance > 2 && distance <= 3) {
                return data.driver_fixed_wage['2-3km'];
            }
            else if (distance > 3 && distance <= 5) {
                return data.driver_fixed_wage['4-5km'];
            }
            else if (distance > 5) {
                const formula = data.driver_fixed_wage['>5km'];
                return (0, mathjs_1.evaluate)(formula.replace('km', distance.toString()));
            }
            return null;
        }
        catch (error) {
            console.error('Error calculating driver wage:', error);
            return null;
        }
    }
    async updateOrderStatus(orderId, status, trackingInfo) {
        await this.ordersRepository.update(orderId, {
            status,
            tracking_info: trackingInfo
        });
    }
    async updateOrderWithMetrics(orderId, distance, driver_wage) {
        const updatedFields = {
            distance: +distance,
            status: order_entity_1.OrderStatus.PREPARING,
            tracking_info: order_entity_1.OrderTrackingInfo.PREPARING,
            driver_wage: +driver_wage
        };
        console.log('cehck udpate field', updatedFields);
        await this.ordersRepository.update(orderId, updatedFields);
    }
    async getUpdatedOrder(orderId) {
        const order = await this.ordersRepository.findById(orderId);
        if (!order) {
            throw new Error('Failed to retrieve updated order');
        }
        return order;
    }
    async notifyDriverAndParties(order, driverId, driver_wage) {
        console.log('[RestaurantsGateway] Preparing driver notification for driver:', driverId, 'with wage:', driver_wage);
        const driverNotificationData = {
            ...order,
            driver_wage,
            total_amount: order.total_amount,
            order_items: order.order_items,
            driver_earn: driver_wage,
            restaurantAddress: order.restaurantAddress,
            customerAddress: order.customerAddress,
            driverListenerId: driverId
        };
        const lockKey = `lock:order:notify:${order.id}`;
        const lockAcquired = await this.redisService.setNx(lockKey, 'locked', 10000);
        if (!lockAcquired) {
            console.log('[RestaurantsGateway] Skipping notify due to existing lock for order:', order.id);
            return;
        }
        try {
            await this.eventEmitter.emitAsync('order.assignedToDriver', driverNotificationData);
            console.log('[RestaurantsGateway] Emitted order.assignedToDriver for order:', order.id);
            await this.notifyPartiesOnce(order);
        }
        catch (err) {
            console.error('[RestaurantsGateway] Error in notifyDriverAndParties:', err);
        }
        finally {
            await this.redisService.del(lockKey);
        }
    }
    async handleRestaurantOrderReady(data) {
        try {
            const { orderId } = data;
            const order = await this.ordersRepository.update(orderId, {
                status: order_entity_1.OrderStatus.READY_FOR_PICKUP,
                tracking_info: order_entity_1.OrderTrackingInfo.RESTAURANT_PICKUP
            });
            await this.notifyPartiesOnce(order);
            return { event: 'orderReadyForPickup', data: order };
        }
        catch (error) {
            console.error('Error in handleRestaurantOrderReady:', error);
            return { event: 'error', data: { message: 'Internal server error' } };
        }
    }
    async notifyPartiesOnce(order) {
        const notifyKey = `lock:notify:${order.id}`;
        const lockAcquired = await this.redisService.setNx(notifyKey, 'locked', 10000);
        if (!lockAcquired) {
            console.log(`[RestaurantsGateway] Notification for order ${order.id} already in progress, skipping`);
            return;
        }
        try {
            const trackingUpdate = {
                orderId: order.id,
                status: order.status,
                tracking_info: order.tracking_info,
                updated_at: order.updated_at,
                customer_id: order.customer_id,
                driver_id: order.driver_id,
                restaurant_id: order.restaurant_id,
                restaurant_avatar: order.restaurant?.avatar || null,
                driver_avatar: order.driver?.avatar || null,
                restaurantAddress: order.restaurantAddress,
                customerAddress: order.customerAddress
            };
            let retryCount = 0;
            const maxRetries = 3;
            const retryDelay = 500;
            while (retryCount < maxRetries) {
                const restaurantClients = await this.server
                    .in(`restaurant_${order.restaurant_id}`)
                    .fetchSockets();
                console.log(`[RestaurantsGateway] Emitting notifyOrderStatus to ${restaurantClients.length} clients in room restaurant_${order.restaurant_id}`);
                if (restaurantClients.length > 0) {
                    this.server
                        .to(`restaurant_${order.restaurant_id}`)
                        .emit('notifyOrderStatus', trackingUpdate);
                    break;
                }
                retryCount++;
                console.log(`[RestaurantsGateway] No clients in room restaurant_${order.restaurant_id}, retrying (${retryCount}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
            if (order.driver_id) {
                const driverClients = await this.server
                    .in(`driver_${order.driver_id}`)
                    .fetchSockets();
                console.log(`[RestaurantsGateway] Emitting notifyOrderStatus to ${driverClients.length} clients in room driver_${order.driver_id}`);
                if (driverClients.length > 0) {
                    this.server
                        .to(`driver_${order.driver_id}`)
                        .emit('notifyOrderStatus', trackingUpdate);
                }
            }
            console.log(`[RestaurantsGateway] Emitted notifyOrderStatus for order ${order.id}`);
            this.eventEmitter.emit('notifyDriverOrderStatus', trackingUpdate);
        }
        catch (err) {
            console.error('[RestaurantsGateway] Error in notifyPartiesOnce:', err);
        }
        finally {
            await this.redisService.del(notifyKey);
        }
    }
    handleOrderTrackingUpdate(payload) {
        console.log(`[RestaurantsGateway] Received listenUpdateOrderTracking for order ${payload.orderId}`);
        this.server
            .to(`restaurant_${payload.restaurant_id}`)
            .emit('orderTrackingUpdated', payload);
    }
};
exports.RestaurantsGateway = RestaurantsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], RestaurantsGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('updateRestaurant'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_restaurant_dto_1.UpdateRestaurantDto]),
    __metadata("design:returntype", Promise)
], RestaurantsGateway.prototype, "handleUpdateRestaurant", null);
__decorate([
    (0, event_emitter_1.OnEvent)('newOrderForRestaurant'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RestaurantsGateway.prototype, "handleNewOrder", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('restaurantAcceptWithAvailableDrivers'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], RestaurantsGateway.prototype, "handleRestaurantAccept", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('restaurantOrderReady'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RestaurantsGateway.prototype, "handleRestaurantOrderReady", null);
__decorate([
    (0, event_emitter_1.OnEvent)('listenUpdateOrderTracking'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RestaurantsGateway.prototype, "handleOrderTrackingUpdate", null);
exports.RestaurantsGateway = RestaurantsGateway = __decorate([
    (0, common_1.Injectable)(),
    (0, websockets_1.WebSocketGateway)({
        namespace: 'restaurant',
        cors: {
            origin: ['*', process.env.FULL_BACKEND_URL],
            methods: ['GET', 'POST'],
            credentials: true
        },
        transports: ['websocket'],
        pingTimeout: 180000,
        pingInterval: 30000,
        maxHttpBufferSize: 1e6
    }),
    __param(0, (0, common_1.Inject)('SOCKET_SERVER')),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => restaurants_service_1.RestaurantsService))),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => drivers_service_1.DriversService))),
    __param(9, (0, common_1.Inject)((0, common_1.forwardRef)(() => orders_service_1.OrdersService))),
    __metadata("design:paramtypes", [Object, restaurants_service_1.RestaurantsService,
        drivers_service_1.DriversService,
        event_emitter_1.EventEmitter2,
        orders_repository_1.OrdersRepository,
        jwt_1.JwtService,
        driver_stats_records_service_1.DriverStatsService,
        finance_rules_service_1.FinanceRulesService,
        redis_service_1.RedisService,
        orders_service_1.OrdersService])
], RestaurantsGateway);
//# sourceMappingURL=restaurants.gateway.js.map