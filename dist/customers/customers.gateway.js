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
exports.CustomersGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const customers_service_1 = require("./customers.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const jwt_1 = require("@nestjs/jwt");
let CustomersGateway = class CustomersGateway {
    constructor(customersService, jwtService, eventEmitter) {
        this.customersService = customersService;
        this.jwtService = jwtService;
        this.eventEmitter = eventEmitter;
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
        console.log('⚡️ Client connected to customer namespace:', client.id);
        const customerData = await this.validateToken(client);
        if (!customerData)
            return;
        const customerId = customerData.id;
        if (customerId) {
            client.join(`customer_${customerId}`);
            console.log(`Customer auto-joined customer_${customerId} via token`);
        }
    }
    async handleCustomerPlaceOrder(order) {
        const customerId = order.customer_id;
        const trackingUpdate = {
            orderId: order.id,
            status: order.status,
            tracking_info: order.tracking_info,
            updated_at: order.updated_at,
            customer_id: order.customer_id,
            driver_id: order.driver_id,
            restaurant_id: order.restaurant_id,
            restaurantAddress: order.restaurantAddress,
            customerAddress: order.customerAddress,
            driverDetails: order.driverDetails,
        };
        await this.server
            .to(`customer_${customerId}`)
            .emit('notifyOrderStatus', trackingUpdate);
        console.log('Emitted newOrderForRestaurant via EventEmitter2:', {
            restaurant_id: order.restaurant_id,
            order: trackingUpdate
        });
        return {
            event: 'customerPlaceOrder',
            data: trackingUpdate,
            message: `customerPlaceOrder processed successfully`
        };
    }
    async handleListenUpdateOrderTracking(order) {
        const trackingUpdate = {
            orderId: order.orderId,
            status: order.status,
            tracking_info: order.tracking_info,
            updated_at: order.updated_at,
            customer_id: order.customer_id,
            driver_id: order.driver_id,
            restaurant_id: order.restaurant_id,
            restaurant_avatar: order.restaurant_avatar,
            driver_avatar: order.driver_avatar,
            restaurantAddress: order.restaurantAddress,
            customerAddress: order.customerAddress,
            driverDetails: order.driverDetails,
        };
        console.log('check tackign udpate', order);
        await this.server
            .to(`customer_${order.customer_id}`)
            .emit('notifyOrderStatus', trackingUpdate);
        console.log(`Emitted notifyOrderStatus to customer_${order.customer_id}`);
        return {
            event: 'notifyOrderStatus',
            data: order,
            message: `Notified customer ${order.customer_id}`
        };
    }
};
exports.CustomersGateway = CustomersGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], CustomersGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('customerPlaceOrder'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CustomersGateway.prototype, "handleCustomerPlaceOrder", null);
__decorate([
    (0, event_emitter_1.OnEvent)('listenUpdateOrderTracking'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CustomersGateway.prototype, "handleListenUpdateOrderTracking", null);
exports.CustomersGateway = CustomersGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        namespace: 'customer',
        cors: {
            origin: ['*', process.env.FULL_BACKEND_URL],
            methods: ['GET', 'POST'],
            credentials: true
        },
        transports: ['websocket']
    }),
    __metadata("design:paramtypes", [customers_service_1.CustomersService,
        jwt_1.JwtService,
        event_emitter_1.EventEmitter2])
], CustomersGateway);
//# sourceMappingURL=customers.gateway.js.map