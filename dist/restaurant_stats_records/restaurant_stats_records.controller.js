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
exports.RestaurantStatsController = void 0;
const common_1 = require("@nestjs/common");
const restaurant_stats_records_service_1 = require("./restaurant_stats_records.service");
const createResponse_1 = require("../utils/createResponse");
let RestaurantStatsController = class RestaurantStatsController {
    constructor(restaurantStatsService) {
        this.restaurantStatsService = restaurantStatsService;
    }
    async updateStats(restaurantId, periodType) {
        await this.restaurantStatsService.updateStatsForRestaurant(restaurantId, periodType);
        return (0, createResponse_1.createResponse)('OK', null, 'Stats updated successfully');
    }
    async updateStatsForRange(restaurantId, startDate, endDate, periodType = 'daily') {
        const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
        const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);
        await this.restaurantStatsService.updateStatsForDateRange(restaurantId, startTimestamp, endTimestamp, periodType);
        return (0, createResponse_1.createResponse)('OK', null, 'Stats updated successfully for date range');
    }
    async getStats(restaurantId, startDate, endDate, aggregate = false, forceRefresh = false) {
        console.log(`Getting stats for restaurant ${restaurantId} from ${startDate} to ${endDate}`);
        console.log(`Force refresh: ${forceRefresh}`);
        const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
        const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);
        console.log(`Start timestamp: ${startTimestamp}, End timestamp: ${endTimestamp}`);
        if (forceRefresh === true) {
            console.log(`Forcing refresh of stats for date range`);
            await this.restaurantStatsService.updateStatsForDateRange(restaurantId, startTimestamp, endTimestamp);
        }
        return this.restaurantStatsService.getStatsForRestaurant(restaurantId, startTimestamp, endTimestamp, aggregate, forceRefresh);
    }
};
exports.RestaurantStatsController = RestaurantStatsController;
__decorate([
    (0, common_1.Post)(':restaurantId/update/:periodType'),
    __param(0, (0, common_1.Param)('restaurantId')),
    __param(1, (0, common_1.Param)('periodType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RestaurantStatsController.prototype, "updateStats", null);
__decorate([
    (0, common_1.Post)(':restaurantId/update-range'),
    __param(0, (0, common_1.Param)('restaurantId')),
    __param(1, (0, common_1.Query)('start_date')),
    __param(2, (0, common_1.Query)('end_date')),
    __param(3, (0, common_1.Query)('period_type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], RestaurantStatsController.prototype, "updateStatsForRange", null);
__decorate([
    (0, common_1.Get)(':restaurantId'),
    __param(0, (0, common_1.Param)('restaurantId')),
    __param(1, (0, common_1.Query)('start_date')),
    __param(2, (0, common_1.Query)('end_date')),
    __param(3, (0, common_1.Query)('aggregate')),
    __param(4, (0, common_1.Query)('force_refresh')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Boolean, Boolean]),
    __metadata("design:returntype", Promise)
], RestaurantStatsController.prototype, "getStats", null);
exports.RestaurantStatsController = RestaurantStatsController = __decorate([
    (0, common_1.Controller)('restaurant-stats'),
    __metadata("design:paramtypes", [restaurant_stats_records_service_1.RestaurantStatsService])
], RestaurantStatsController);
//# sourceMappingURL=restaurant_stats_records.controller.js.map