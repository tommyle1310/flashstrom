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
exports.StatisticsController = void 0;
const common_1 = require("@nestjs/common");
const statistics_service_1 = require("./statistics.service");
const create_statistic_dto_1 = require("./dto/create-statistic.dto");
const update_statistic_dto_1 = require("./dto/update-statistic.dto");
let StatisticsController = class StatisticsController {
    constructor(statisticsService) {
        this.statisticsService = statisticsService;
    }
    create(createStatisticsDto) {
        return this.statisticsService.create(createStatisticsDto);
    }
    findAll() {
        return this.statisticsService.findAll();
    }
    async findByDriverId(driverId, periodType, limit, offset) {
        const limitNum = limit ? parseInt(limit, 10) : 10;
        const offsetNum = offset ? parseInt(offset, 10) : 0;
        return this.statisticsService.findByDriverId({
            driverId,
            periodType: periodType || 'daily',
            limit: limitNum,
            offset: offsetNum
        });
    }
    async findByCustomerCareId(customerCareId, periodType, limit, offset) {
        const limitNum = limit ? parseInt(limit, 10) : 10;
        const offsetNum = offset ? parseInt(offset, 10) : 0;
        return this.statisticsService.findByCustomerCareId({
            customerCareId,
            periodType: periodType || 'daily',
            limit: limitNum,
            offset: offsetNum
        });
    }
    async findByRestaurantId(restaurantId, periodType, limit, offset) {
        const limitNum = limit ? parseInt(limit, 10) : 10;
        const offsetNum = offset ? parseInt(offset, 10) : 0;
        return this.statisticsService.findByRestaurantId({
            restaurantId,
            periodType: periodType || 'daily',
            limit: limitNum,
            offset: offsetNum
        });
    }
    findOne(id) {
        return this.statisticsService.findOne(id);
    }
    update(id, updateStatisticsDto) {
        return this.statisticsService.update(id, updateStatisticsDto);
    }
    remove(id) {
        return this.statisticsService.remove(id);
    }
};
exports.StatisticsController = StatisticsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_statistic_dto_1.CreateStatisticsDto]),
    __metadata("design:returntype", void 0)
], StatisticsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], StatisticsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('/by-driver/:driverId'),
    __param(0, (0, common_1.Param)('driverId')),
    __param(1, (0, common_1.Query)('period_type')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], StatisticsController.prototype, "findByDriverId", null);
__decorate([
    (0, common_1.Get)('/by-customer-care/:customerCareId'),
    __param(0, (0, common_1.Param)('customerCareId')),
    __param(1, (0, common_1.Query)('period_type')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], StatisticsController.prototype, "findByCustomerCareId", null);
__decorate([
    (0, common_1.Get)('/by-restaurant/:restaurantId'),
    __param(0, (0, common_1.Param)('restaurantId')),
    __param(1, (0, common_1.Query)('period_type')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], StatisticsController.prototype, "findByRestaurantId", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StatisticsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_statistic_dto_1.UpdateStatisticsDto]),
    __metadata("design:returntype", void 0)
], StatisticsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StatisticsController.prototype, "remove", null);
exports.StatisticsController = StatisticsController = __decorate([
    (0, common_1.Controller)('statistics'),
    __metadata("design:paramtypes", [statistics_service_1.StatisticsService])
], StatisticsController);
//# sourceMappingURL=statistics.controller.js.map