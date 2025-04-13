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
let RestaurantsGateway = class RestaurantsGateway {
    constructor(restaurantsService, driverService, eventEmitter, ordersRepository, jwtService, driverStatsService, financeRulesService) {
        this.restaurantsService = restaurantsService;
        this.driverService = driverService;
        this.eventEmitter = eventEmitter;
        this.ordersRepository = ordersRepository;
        this.jwtService = jwtService;
        this.driverStatsService = driverStatsService;
        this.financeRulesService = financeRulesService;
        this.notificationLock = new Map();
    }
    afterInit() {
        console.log('Restaurant Gateway initialized!');
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
        console.log('⚡️ Client connected to restaurant namespace:', client.id);
        const restaurantData = await this.validateToken(client);
        if (!restaurantData)
            return;
        const restaurantId = restaurantData.id;
        if (restaurantId) {
            client.join(`restaurant_${restaurantId}`);
            console.log(`Restaurant auto-joined restaurant_${restaurantId} via token`);
        }
    }
    handleDisconnect(client) {
        console.log('❌ Client disconnected from restaurant namespace:', client.id);
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
    async handleRestaurantAcceptWithDrivers(data) {
        try {
            const { availableDrivers, orderDetails: orderId } = data;
            const fullOrderDetails = await this.restaurantsService.getOrderById(orderId);
            if (!fullOrderDetails) {
                return { event: 'error', data: { message: 'Order not found' } };
            }
            await this.ordersRepository.update(orderId, {
                status: order_entity_1.OrderStatus.RESTAURANT_ACCEPTED,
                tracking_info: order_entity_1.OrderTrackingInfo.ORDER_RECEIVED
            });
            const mappedDrivers = availableDrivers.map(item => ({
                id: item.id,
                location: { lat: item.lat, lng: item.lng },
                active_points: 0,
                current_order_id: []
            }));
            const responsePrioritizeDrivers = await this.driverService.prioritizeAndAssignDriver(mappedDrivers, fullOrderDetails);
            if (responsePrioritizeDrivers.EC === 0 &&
                responsePrioritizeDrivers.data.length > 0) {
                const selectedDriver = responsePrioritizeDrivers.data[0];
                const res_location = fullOrderDetails.restaurantAddress;
                const customer_location = fullOrderDetails.customerAddress;
                const distance = (0, commonFunctions_1.calculateDistance)(customer_location?.location?.lat ?? 0, customer_location?.location?.lng ?? 0, res_location?.location?.lat ?? 0, res_location?.location?.lng ?? 0);
                const latestFinanceRuleResponse = await this.financeRulesService.findOneLatest();
                const { EC, EM, data } = latestFinanceRuleResponse;
                console.log('cehck naow', data);
                if (EC !== 0) {
                    return { event: 'error', data: { message: EM } };
                }
                let driver_wage;
                if (distance >= 0 && distance <= 1) {
                    driver_wage = data.driver_fixed_wage['0-1km'];
                }
                else if (distance > 1 && distance <= 2) {
                    driver_wage = data.driver_fixed_wage['1-2km'];
                }
                else if (distance > 2 && distance <= 3) {
                    driver_wage = data.driver_fixed_wage['2-3km'];
                }
                else if (distance > 4 && distance <= 5) {
                    driver_wage = data.driver_fixed_wage['4-5km'];
                }
                else if (distance > 5) {
                    const formula = data.driver_fixed_wage['>5km'];
                    try {
                        driver_wage = (0, mathjs_1.evaluate)(formula.replace('km', distance.toString()));
                        console.log('Calculated driver wage:', driver_wage);
                    }
                    catch (error) {
                        console.error('Error evaluating wage formula:', error);
                    }
                    return { event: 'error', data: { message: 'Invalid wage formula' } };
                }
                else {
                    return {
                        event: 'error',
                        data: { message: 'Invalid distance value' }
                    };
                }
                console.log('check drier wage', driver_wage);
                const updatedFields = {
                    distance: +distance,
                    status: order_entity_1.OrderStatus.PREPARING,
                    tracking_info: order_entity_1.OrderTrackingInfo.PREPARING,
                    driver_wage
                };
                console.log('Fields to update:', updatedFields);
                await this.ordersRepository.update(orderId, updatedFields);
                const orderWithDistance = await this.ordersRepository.findById(orderId);
                if (!orderWithDistance) {
                    throw new Error('Failed to retrieve updated order');
                }
                await this.eventEmitter.emit('order.assignedToDriver', {
                    ...orderWithDistance,
                    driverListenerId: selectedDriver.id
                });
                await this.notifyPartiesOnce(orderWithDistance);
                return { event: 'orderAssigned', data: orderWithDistance };
            }
            return {
                event: 'noDriver',
                data: { message: 'No suitable driver found' }
            };
        }
        catch (error) {
            console.error('Error in handleRestaurantAcceptWithDrivers:', error);
            return { event: 'error', data: { message: 'Internal server error' } };
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
                driver_id: order.driver_id,
                restaurant_id: order.restaurant_id,
                restaurant_avatar: order.restaurant?.avatar || null,
                driver_avatar: order.driver?.avatar || null,
                restaurantAddress: order.restaurantAddress,
                customerAddress: order.customerAddress
            };
            this.eventEmitter.emit('listenUpdateOrderTracking', trackingUpdate);
            this.eventEmitter.emit('notifyDriverOrderStatus', trackingUpdate);
            this.server
                .to(`restaurant_${order.restaurant_id}`)
                .emit('notifyOrderStatus', trackingUpdate);
            console.log(`Emitted notifyOrderStatus for order ${order.id}`);
        }
        finally {
            this.notificationLock.delete(notifyKey);
        }
    }
    async handleListenUpdateOrderTracking(order) {
        await this.server
            .to(`restaurant_${order.restaurant_id}`)
            .emit('notifyOrderStatus', {
            orderId: order.orderId,
            status: order.status,
            tracking_info: order.tracking_info,
            updated_at: order.updated_at,
            customer_id: order.customer_id,
            driver_id: order.driver_id,
            restaurant_id: order.restaurant_id,
            restaurant_avatar: order.restaurant_avatar || null,
            driver_avatar: order.driver_avatar || null,
            restaurantAddress: order.restaurantAddress,
            customerAddress: order.customerAddress
        });
        return {
            event: 'notifyOrderStatus',
            data: order,
            message: `Notified restaurant ${order.restaurant_id}`
        };
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
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RestaurantsGateway.prototype, "handleRestaurantAcceptWithDrivers", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('restaurantOrderReady'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RestaurantsGateway.prototype, "handleRestaurantOrderReady", null);
__decorate([
    (0, event_emitter_1.OnEvent)('listenUpdateOrderTracking'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RestaurantsGateway.prototype, "handleListenUpdateOrderTracking", null);
exports.RestaurantsGateway = RestaurantsGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        namespace: 'restaurant',
        cors: {
            origin: ['*', process.env.FULL_BACKEND_URL],
            methods: ['GET', 'POST'],
            credentials: true
        },
        transports: ['websocket']
    }),
    __param(0, (0, common_1.Inject)((0, common_1.forwardRef)(() => restaurants_service_1.RestaurantsService))),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => drivers_service_1.DriversService))),
    __metadata("design:paramtypes", [restaurants_service_1.RestaurantsService,
        drivers_service_1.DriversService,
        event_emitter_1.EventEmitter2,
        orders_repository_1.OrdersRepository,
        jwt_1.JwtService,
        driver_stats_records_service_1.DriverStatsService,
        finance_rules_service_1.FinanceRulesService])
], RestaurantsGateway);
//# sourceMappingURL=restaurants.gateway.js.map