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
exports.CustomerCareController = void 0;
const common_1 = require("@nestjs/common");
const customer_cares_service_1 = require("./customer_cares.service");
const create_customer_cares_dto_1 = require("./dto/create-customer_cares.dto");
const update_customer_cares_dto_1 = require("./dto/update-customer_cares.dto");
let CustomerCareController = class CustomerCareController {
    constructor(customerCareService) {
        this.customerCareService = customerCareService;
    }
    create(createCustomerCareDto) {
        return this.customerCareService.create(createCustomerCareDto);
    }
    findAll() {
        return this.customerCareService.findAll();
    }
    findCustomerCareById(id) {
        return this.customerCareService.findCustomerCareById(id);
    }
    findOne(field, value) {
        return this.customerCareService.findOne({ [field]: value });
    }
    update(id, updateCustomerCareDto) {
        return this.customerCareService.update(id, updateCustomerCareDto);
    }
    setAvailability(id) {
        return this.customerCareService.setAvailability(id);
    }
    remove(id) {
        return this.customerCareService.remove(id);
    }
};
exports.CustomerCareController = CustomerCareController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_customer_cares_dto_1.CreateCustomerCareDto]),
    __metadata("design:returntype", void 0)
], CustomerCareController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CustomerCareController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CustomerCareController.prototype, "findCustomerCareById", null);
__decorate([
    (0, common_1.Get)(':field/:value'),
    __param(0, (0, common_1.Param)('field')),
    __param(1, (0, common_1.Param)('value')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CustomerCareController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_customer_cares_dto_1.UpdateCustomerCareDto]),
    __metadata("design:returntype", void 0)
], CustomerCareController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/availability'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CustomerCareController.prototype, "setAvailability", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CustomerCareController.prototype, "remove", null);
exports.CustomerCareController = CustomerCareController = __decorate([
    (0, common_1.Controller)('customer-care'),
    __metadata("design:paramtypes", [customer_cares_service_1.CustomerCareService])
], CustomerCareController);
//# sourceMappingURL=customer_cares.controller.js.map