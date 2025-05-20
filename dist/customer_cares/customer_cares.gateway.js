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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerCaresGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const event_emitter_1 = require("@nestjs/event-emitter");
let CustomerCaresGateway = class CustomerCaresGateway {
    constructor(eventEmitter) {
        this.eventEmitter = eventEmitter;
        this.eventEmitter.on('customerCareRequest', this.handleCustomerCareRequest.bind(this));
    }
    handleCustomerCareRequest(data) {
        console.log('Received customer care request:', data);
        return data;
    }
};
exports.CustomerCaresGateway = CustomerCaresGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], CustomerCaresGateway.prototype, "server", void 0);
__decorate([
    (0, event_emitter_1.OnEvent)('customerCareRequest'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CustomerCaresGateway.prototype, "handleCustomerCareRequest", null);
exports.CustomerCaresGateway = CustomerCaresGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({ namespace: 'customer_cares' }),
    __metadata("design:paramtypes", [event_emitter_1.EventEmitter2])
], CustomerCaresGateway);
//# sourceMappingURL=customer_cares.gateway.js.map