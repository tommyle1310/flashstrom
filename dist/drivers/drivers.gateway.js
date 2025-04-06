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
exports.DriversGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const mathjs_1 = require("mathjs");
const event_emitter_1 = require("@nestjs/event-emitter");
const socket_io_1 = require("socket.io");
const drivers_service_1 = require("./drivers.service");
const update_driver_dto_1 = require("./dto/update-driver.dto");
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
let DriversGateway = class DriversGateway {
    constructor(restaurantsService, driverService, driverRepository, driverStatsService, eventEmitter, ordersService, financeRulesService, driverProgressStageService, dataSource, addressBookRepository, jwtService) {
        this.restaurantsService = restaurantsService;
        this.driverService = driverService;
        this.driverRepository = driverRepository;
        this.driverStatsService = driverStatsService;
        this.eventEmitter = eventEmitter;
        this.ordersService = ordersService;
        this.financeRulesService = financeRulesService;
        this.driverProgressStageService = driverProgressStageService;
        this.dataSource = dataSource;
        this.addressBookRepository = addressBookRepository;
        this.jwtService = jwtService;
        this.driverSockets = new Map();
        this.notificationLock = new Map();
        this.activeConnections = new Map();
        this.dpsCreationLocks = new Set();
        this.requestQueue = new Map();
        this.processingOrders = new Set();
    }
    afterInit() {
        console.log('Driver Gateway initialized');
    }
    async validateToken(client) {
        try {
            const authHeader = client.handshake.headers.auth;
            if (!authHeader?.startsWith('Bearer ')) {
                client.disconnect();
                return null;
            }
            const token = authHeader.slice(7);
            if (!token) {
                client.disconnect();
                return null;
            }
            const decoded = await this.jwtService.verify(token, {
                secret: process.env.JWT_SECRET
            });
            return decoded;
        }
        catch (error) {
            console.error('Token validation error:', error);
            client.disconnect();
            return null;
        }
    }
    async handleConnection(client) {
        const driverData = await this.validateToken(client);
        if (!driverData)
            return;
        const driverId = driverData.id;
        if (driverId) {
            this.cleanupDriverConnections(driverId);
            if (!this.driverSockets.has(driverId)) {
                this.driverSockets.set(driverId, new Set());
            }
            this.driverSockets.get(driverId)?.add(client.id);
            client.join(`driver_${driverId}`);
            console.log(`Driver auto-joined driver_${driverId} via token`);
        }
        this.activeConnections.set(client.id, client);
    }
    cleanupDriverConnections(driverId) {
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
    handleDisconnect(client) {
        console.log(`Driver disconnected: ${client.id}`);
        const driverId = client.handshake.query.driverId;
        this.activeConnections.delete(client.id);
        if (driverId) {
            this.processingOrders.delete(`${driverId}_*`);
            this.dpsCreationLocks.delete(driverId);
        }
    }
    async handleUpdateDriver(updateDriverDto) {
        const driver = await this.driverService.update(updateDriverDto.id, updateDriverDto);
        this.server.emit('driverUpdated', driver);
        return driver;
    }
    async handleNewOrder(order) {
        const driverId = order.driver_id;
        this.server.to(driverId).emit('incomingOrder', order);
        console.log('Emitted incomingOrder event to driver:', driverId, order);
        return order;
    }
    async handleDriverAcceptOrder(data) {
        console.log('[DEBUG] Raw data received:', data);
        const { driverId, orderId } = data;
        if (!driverId || !driverId.startsWith('FF_DRI_')) {
            console.error(`Invalid driverId: ${driverId}`);
            return { success: false, message: 'Invalid driverId' };
        }
        if (!orderId || !orderId.startsWith('FF_ORDER_')) {
            console.error(`Invalid orderId: ${orderId}`);
            return { success: false, message: 'Invalid orderId' };
        }
        const lockKey = `${driverId}_${orderId}`;
        console.log(`Driver ${driverId} accepting order ${orderId}`);
        if (this.processingOrders.has(lockKey)) {
            console.log(`Order ${orderId} already being processed by driver ${driverId}`);
            return { success: false, message: 'Order is already being processed' };
        }
        this.processingOrders.add(lockKey);
        const maxRetries = 3;
        let attempt = 0;
        while (attempt < maxRetries) {
            try {
                const result = await Promise.race([
                    this.dataSource.transaction('SERIALIZABLE', async (transactionalEntityManager) => {
                        console.log('[DEBUG] Starting transaction for order:', orderId);
                        const order = await transactionalEntityManager
                            .getRepository(order_entity_1.Order)
                            .createQueryBuilder('order')
                            .setLock('pessimistic_write')
                            .where('order.id = :orderId', { orderId })
                            .getOne();
                        if (!order) {
                            console.error(`[DEBUG] Order not found in DB for orderId: ${orderId}`);
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
                                'restaurant.address'
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
                        let dpsWithRelations = null;
                        if (existingDPS) {
                            dpsWithRelations = await transactionalEntityManager
                                .getRepository(driver_progress_stage_entity_1.DriverProgressStage)
                                .findOne({
                                where: { id: existingDPS.id },
                                relations: ['orders']
                            });
                        }
                        let dps;
                        const timestamp = Math.floor(Date.now() / 1000);
                        const rawDistance = orderWithRelations.distance || 0;
                        const distance = typeof rawDistance === 'string'
                            ? parseFloat(rawDistance)
                            : Number(rawDistance);
                        if (isNaN(distance)) {
                            console.warn(`Invalid distance value for order ${orderId}: ${rawDistance}`);
                            throw new websockets_1.WsException('Invalid distance value in order');
                        }
                        const estimatedTime = this.calculateEstimatedTime(distance);
                        const totalTips = orderWithRelations.driver_tips || 0;
                        const latestFinanceRuleResponse = await this.financeRulesService.findOneLatest();
                        const { EC, EM, data } = latestFinanceRuleResponse;
                        console.log('check finance rule data:', data);
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
                                console.log('Calculated driver wage:', driver_wage);
                            }
                            catch (error) {
                                console.error('Error evaluating wage formula:', error);
                                throw new websockets_1.WsException('Invalid wage formula');
                            }
                        }
                        else {
                            console.warn(`Invalid distance range for order ${orderId}: ${distance}`);
                            throw new websockets_1.WsException('Invalid distance value');
                        }
                        console.log('check driver wage:', driver_wage);
                        const totalEarns = driver_wage;
                        if (!existingDPS) {
                            console.log(`No existing DPS found for driver ${driverId}, creating new one`);
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
                            console.log('[DEBUG] Saving new DPS');
                            await transactionalEntityManager.save(driver_progress_stage_entity_1.DriverProgressStage, dps);
                            console.log(`[DEBUG] Created DPS with total_earns=${dps.total_earns}`);
                        }
                        else {
                            console.log(`Existing DPS found for driver ${driverId}, adding order`);
                            const dpsResponse = await this.driverProgressStageService.addOrderToExistingDPS(existingDPS.id, orderWithRelations, transactionalEntityManager);
                            if (dpsResponse.EC !== 0 || !dpsResponse.data)
                                throw new websockets_1.WsException(`Failed to add order to existing DPS`);
                            dps = dpsResponse.data;
                            dps.total_distance_travelled =
                                (dps.total_distance_travelled || 0) +
                                    Number(distance.toFixed(4));
                            dps.estimated_time_remaining =
                                (dps.estimated_time_remaining || 0) + estimatedTime;
                            dps.total_tips =
                                Number(dps.total_tips || 0) + Number(totalTips);
                            dps.total_earns =
                                Number(dps.total_earns || 0) + Number(totalEarns);
                            dps.stages = dps.stages.map(stage => {
                                const details = this.getStageDetails(stage.state, orderWithRelations, driverWithRelations, estimatedTime, totalTips);
                                return { ...stage, details };
                            });
                            console.log('[DEBUG] Saving updated DPS');
                            await transactionalEntityManager.save(driver_progress_stage_entity_1.DriverProgressStage, dps);
                            console.log(`[DEBUG] Updated DPS with total_earns=${dps.total_earns}`);
                        }
                        orderWithRelations.driver_id = driverId;
                        orderWithRelations.status = order_entity_1.OrderStatus.DISPATCHED;
                        orderWithRelations.tracking_info = order_entity_1.OrderTrackingInfo.DISPATCHED;
                        orderWithRelations.updated_at = timestamp;
                        console.log('[DEBUG] Saving order');
                        await transactionalEntityManager.save(order_entity_1.Order, orderWithRelations);
                        driverWithRelations.current_orders =
                            driverWithRelations.current_orders || [];
                        if (!driverWithRelations.current_orders.some(o => o.id === orderId)) {
                            driverWithRelations.current_orders.push(orderWithRelations);
                        }
                        console.log('[DEBUG] Saving driver');
                        await transactionalEntityManager.save(driver_entity_1.Driver, driverWithRelations);
                        console.log('[DEBUG] Transaction completed');
                        return { success: true, order: orderWithRelations, dps };
                    }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Transaction timeout after 30s')), 30000))
                ]);
                if (result instanceof Error)
                    throw result;
                console.log('[DEBUG] Updating stats');
                await this.driverStatsService.updateStatsForDriver(driverId, 'daily');
                console.log('[DEBUG] Notifying parties');
                await this.notifyPartiesOnce(result.order);
                console.log('[DEBUG] Emitting stages updated');
                const maxEmitRetries = 3;
                for (let i = 0; i < maxEmitRetries; i++) {
                    try {
                        await this.server
                            .to(`driver_${driverId}`)
                            .emit('driverStagesUpdated', result.dps);
                        break;
                    }
                    catch (emitError) {
                        console.warn(`[DEBUG] Emit failed, retry ${i + 1}/${maxEmitRetries}:`, emitError);
                        if (i === maxEmitRetries - 1)
                            console.error('[DEBUG] Emit failed after retries');
                        await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
                    }
                }
                return result;
            }
            catch (error) {
                if (error.code === '40001' && attempt < maxRetries - 1) {
                    attempt++;
                    console.log(`Retry attempt ${attempt} for driver ${driverId} due to serialization failure`);
                    await new Promise(resolve => setTimeout(resolve, 100 * attempt));
                    continue;
                }
                console.error('Error in handleDriverAcceptOrder:', error);
                return {
                    success: false,
                    message: error.message || 'Internal server error'
                };
            }
            finally {
                this.processingOrders.delete(lockKey);
                console.log(`Processing lock released for ${lockKey}`);
            }
        }
    }
    calculateEstimatedTime(distance) {
        return (distance / 30) * 60;
    }
    calculateTotalEarns(order) {
        return +order.delivery_fee || 0;
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
    async handleDriverProgressUpdate(data) {
        try {
            const result = await this.dataSource.transaction(async (transactionalEntityManager) => {
                const dps = await transactionalEntityManager
                    .getRepository(driver_progress_stage_entity_1.DriverProgressStage)
                    .findOne({
                    where: { id: data.stageId },
                    relations: ['orders']
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
                                await transactionalEntityManager.update(order_entity_1.Order, { id: order.id }, {
                                    status: newStatus,
                                    tracking_info: newTrackingInfo,
                                    updated_at: Math.floor(Date.now() / 1000)
                                });
                                if (nextStateBase === 'delivery_complete') {
                                    dps.total_tips =
                                        (dps.total_tips || 0) + (order.driver_tips || 0);
                                    dps.total_earns =
                                        (dps.total_earns || 0) + this.calculateTotalEarns(order);
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
                    total_earns: dps.total_earns
                }, transactionalEntityManager);
                const newStagesString = JSON.stringify(updateResult.data.stages);
                const hasChanges = oldStagesString !== newStagesString ||
                    oldCurrentState !== updateResult.data.current_state ||
                    oldPreviousState !== updateResult.data.previous_state ||
                    oldNextState !== updateResult.data.next_state;
                const allStagesCompleted = updateResult.data.stages.every(stage => stage.status === 'completed');
                if (updateResult.EC === 0 && hasChanges) {
                    await this.server
                        .to(`driver_${dps.driver_id}`)
                        .emit('driverStagesUpdated', updateResult.data);
                    console.log('Emitted driverStagesUpdated:', updateResult.data);
                }
                else {
                    console.log('Skipped emitting driverStagesUpdated:', {
                        reason: !hasChanges ? 'No changes detected' : 'Update failed',
                        oldStagesString,
                        newStagesString,
                        oldCurrentState,
                        newCurrentState: updateResult.data.current_state,
                        allStagesCompleted
                    });
                }
                const updatedOrder = await this.ordersService.findOne(targetOrderId, transactionalEntityManager);
                if (updatedOrder?.data)
                    await this.notifyPartiesOnce(updatedOrder.data);
                return { success: true, stage: updateResult.data };
            });
            return result;
        }
        catch (error) {
            console.error('❌ Error in handleDriverProgressUpdate:', error);
            return { success: false, message: 'Internal server error' };
        }
    }
    async notifyPartiesOnce(order) {
        const notifyKey = `notify_${order.id}`;
        if (this.notificationLock.get(notifyKey))
            return;
        try {
            this.notificationLock.set(notifyKey, true);
            const trackingUpdate = {
                orderId: order.id,
                status: order.status,
                tracking_info: order.tracking_info,
                updated_at: order.updated_at,
                customer_id: order.customer_id,
                driver_avatar: order?.driver?.avatar,
                restaurant_avatar: order?.restaurant?.avatar,
                driver_id: order.driver_id,
                restaurant_id: order.restaurant_id,
                driver_tips: order.driver_tips || 0
            };
            this.eventEmitter.emit('listenUpdateOrderTracking', trackingUpdate);
            console.log(`Emitted notifyOrderStatus for order ${order.id}`);
        }
        finally {
            this.notificationLock.delete(notifyKey);
        }
    }
    async handleOrderAssignedToDriver(orderAssignment) {
        try {
            const driverId = orderAssignment.driverListenerId;
            if (!driverId)
                throw new websockets_1.WsException('Driver ID is required');
            await this.server
                .to(`driver_${driverId}`)
                .emit('incomingOrderForDriver', {
                event: 'incomingOrderForDriver',
                data: orderAssignment,
                message: 'Order received successfully'
            });
            return { event: 'orderAssigned', data: { success: true } };
        }
        catch (error) {
            console.error('Error handling order.assignedToDriver:', error);
            throw new websockets_1.WsException(error instanceof websockets_1.WsException ? error.message : 'Internal server error');
        }
    }
};
exports.DriversGateway = DriversGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], DriversGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('updateDriver'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_driver_dto_1.UpdateDriverDto]),
    __metadata("design:returntype", Promise)
], DriversGateway.prototype, "handleUpdateDriver", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('newOrderForDriver'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DriversGateway.prototype, "handleNewOrder", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('driverAcceptOrder'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DriversGateway.prototype, "handleDriverAcceptOrder", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('updateDriverProgress'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DriversGateway.prototype, "handleDriverProgressUpdate", null);
__decorate([
    (0, event_emitter_1.OnEvent)('order.assignedToDriver'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DriversGateway.prototype, "handleOrderAssignedToDriver", null);
exports.DriversGateway = DriversGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        namespace: 'driver',
        cors: {
            origin: ['*', process.env.FULL_BACKEND_URL],
            methods: ['GET', 'POST'],
            credentials: true
        },
        transports: ['websocket']
    }),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => drivers_service_1.DriversService))),
    __metadata("design:paramtypes", [restaurants_service_1.RestaurantsService,
        drivers_service_1.DriversService,
        drivers_repository_1.DriversRepository,
        driver_stats_records_service_1.DriverStatsService,
        event_emitter_1.EventEmitter2,
        orders_service_1.OrdersService,
        finance_rules_service_1.FinanceRulesService,
        driver_progress_stages_service_1.DriverProgressStagesService,
        typeorm_1.DataSource,
        address_book_repository_1.AddressBookRepository,
        jwt_1.JwtService])
], DriversGateway);
//# sourceMappingURL=drivers.gateway.js.map