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
exports.StatisticsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const statistic_entity_1 = require("./entities/statistic.entity");
const statistics_repository_1 = require("./statistics.repository");
const createResponse_1 = require("../utils/createResponse");
let StatisticsService = class StatisticsService {
    constructor(statisticsRepository, statisticsEntityRepository) {
        this.statisticsRepository = statisticsRepository;
        this.statisticsEntityRepository = statisticsEntityRepository;
    }
    async create(createStatisticsDto) {
        try {
            if (!createStatisticsDto.driver_id &&
                !createStatisticsDto.customer_care_id &&
                !createStatisticsDto.restaurant_id) {
                return (0, createResponse_1.createResponse)('MissingInput', null, 'At least one of driver_id, customer_care_id, or restaurant_id is required');
            }
            const newStats = await this.statisticsRepository.create(createStatisticsDto);
            return (0, createResponse_1.createResponse)('OK', newStats, 'Statistics created successfully');
        }
        catch (error) {
            return this.handleError('Error creating statistics:', error);
        }
    }
    async findAll() {
        try {
            const stats = await this.statisticsEntityRepository.find({
                relations: ['records']
            });
            return (0, createResponse_1.createResponse)('OK', stats, 'Fetched all statistics');
        }
        catch (error) {
            return this.handleError('Error fetching statistics:', error);
        }
    }
    async findOne(id) {
        try {
            const stats = await this.statisticsRepository.findById(id);
            return this.handleStatsResponse(stats);
        }
        catch (error) {
            return this.handleError('Error fetching statistics:', error);
        }
    }
    async findByDriverId({ driverId, periodType, limit, offset }) {
        try {
            const stats = await this.statisticsRepository.findByDriverId(driverId, periodType, limit, offset);
            return (0, createResponse_1.createResponse)('OK', stats, 'Fetched statistics by driver');
        }
        catch (error) {
            return this.handleError('Error fetching statistics by driver:', error);
        }
    }
    async findByCustomerCareId({ customerCareId, periodType, limit, offset }) {
        try {
            const stats = await this.statisticsRepository.findByCustomerCareId(customerCareId, periodType, limit, offset);
            return (0, createResponse_1.createResponse)('OK', stats, 'Fetched statistics by customer care');
        }
        catch (error) {
            return this.handleError('Error fetching statistics by customer care:', error);
        }
    }
    async findByRestaurantId({ restaurantId, periodType, limit, offset }) {
        try {
            const stats = await this.statisticsRepository.findByRestaurantId(restaurantId, periodType, limit, offset);
            return (0, createResponse_1.createResponse)('OK', stats, 'Fetched statistics by restaurant');
        }
        catch (error) {
            return this.handleError('Error fetching statistics by restaurant:', error);
        }
    }
    async update(id, updateStatisticsDto) {
        try {
            const stats = await this.statisticsRepository.findById(id);
            if (!stats) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Statistics not found');
            }
            const updatedStats = await this.statisticsRepository.update(id, updateStatisticsDto);
            return (0, createResponse_1.createResponse)('OK', updatedStats, 'Statistics updated successfully');
        }
        catch (error) {
            return this.handleError('Error updating statistics:', error);
        }
    }
    async remove(id) {
        try {
            const deletedStats = await this.statisticsRepository.remove(id);
            if (!deletedStats) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Statistics not found');
            }
            return (0, createResponse_1.createResponse)('OK', null, 'Statistics deleted successfully');
        }
        catch (error) {
            return this.handleError('Error deleting statistics:', error);
        }
    }
    handleStatsResponse(stats) {
        if (!stats) {
            return (0, createResponse_1.createResponse)('NotFound', null, 'Statistics not found');
        }
        return (0, createResponse_1.createResponse)('OK', stats, 'Statistics retrieved successfully');
    }
    handleError(message, error) {
        console.error(message, error);
        return (0, createResponse_1.createResponse)('ServerError', null, 'An error occurred while processing your request');
    }
};
exports.StatisticsService = StatisticsService;
exports.StatisticsService = StatisticsService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(statistic_entity_1.Statistics)),
    __metadata("design:paramtypes", [statistics_repository_1.StatisticsRepository,
        typeorm_2.Repository])
], StatisticsService);
//# sourceMappingURL=statistics.service.js.map