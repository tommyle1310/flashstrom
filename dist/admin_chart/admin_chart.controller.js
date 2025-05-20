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
exports.AdminChartController = void 0;
const common_1 = require("@nestjs/common");
const admin_chart_service_1 = require("./admin_chart.service");
const admin_chart_query_dto_1 = require("./dto/admin_chart_query.dto");
const createResponse_1 = require("../utils/createResponse");
let AdminChartController = class AdminChartController {
    constructor(adminChartService) {
        this.adminChartService = adminChartService;
    }
    async getChartData(query) {
        console.log(`Getting admin chart data from ${query.start_date} to ${query.end_date}`);
        console.log(`Period type: ${query.period_type}, Force refresh: ${query.force_refresh}`);
        const startTimestamp = Math.floor(new Date(query.start_date).getTime() / 1000);
        const endTimestamp = Math.floor(new Date(query.end_date).getTime() / 1000);
        const forceRefresh = query.force_refresh === 'true';
        console.log(`Start timestamp: ${startTimestamp}, End timestamp: ${endTimestamp}`);
        return this.adminChartService.getChartData(startTimestamp, endTimestamp, query.period_type || admin_chart_query_dto_1.PeriodType.DAILY, forceRefresh);
    }
    async updateChartData(query) {
        const startTimestamp = Math.floor(new Date(query.start_date).getTime() / 1000);
        const endTimestamp = Math.floor(new Date(query.end_date).getTime() / 1000);
        await this.adminChartService.generateChartData(startTimestamp, endTimestamp, query.period_type || admin_chart_query_dto_1.PeriodType.DAILY);
        return (0, createResponse_1.createResponse)('OK', null, 'Admin chart data updated successfully');
    }
};
exports.AdminChartController = AdminChartController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [admin_chart_query_dto_1.AdminChartQueryDto]),
    __metadata("design:returntype", Promise)
], AdminChartController.prototype, "getChartData", null);
__decorate([
    (0, common_1.Post)('update'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [admin_chart_query_dto_1.AdminChartQueryDto]),
    __metadata("design:returntype", Promise)
], AdminChartController.prototype, "updateChartData", null);
exports.AdminChartController = AdminChartController = __decorate([
    (0, common_1.Controller)('admin-chart'),
    __metadata("design:paramtypes", [admin_chart_service_1.AdminChartService])
], AdminChartController);
//# sourceMappingURL=admin_chart.controller.js.map