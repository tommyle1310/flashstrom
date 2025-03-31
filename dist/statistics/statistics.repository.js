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
exports.StatisticsRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const statistic_entity_1 = require("./entities/statistic.entity");
let StatisticsRepository = class StatisticsRepository {
    constructor(statisticsEntityRepository) {
        this.statisticsEntityRepository = statisticsEntityRepository;
    }
    async findById(id) {
        return await this.statisticsEntityRepository.findOne({
            where: { id },
            relations: ['records']
        });
    }
    async findByDriverId(driverId, periodType, limit, offset) {
        return await this.statisticsEntityRepository.find({
            where: { driver_id: driverId, period_type: periodType },
            take: limit,
            skip: offset,
            order: { period_start: 'DESC' },
            relations: ['records']
        });
    }
    async findByCustomerCareId(customerCareId, periodType, limit, offset) {
        return await this.statisticsEntityRepository.find({
            where: { customer_care_id: customerCareId, period_type: periodType },
            take: limit,
            skip: offset,
            order: { period_start: 'DESC' },
            relations: ['records']
        });
    }
    async findByRestaurantId(restaurantId, periodType, limit, offset) {
        return await this.statisticsEntityRepository.find({
            where: { restaurant_id: restaurantId, period_type: periodType },
            take: limit,
            skip: offset,
            order: { period_start: 'DESC' },
            relations: ['records']
        });
    }
    async create(createStatisticsDto) {
        const stats = this.statisticsEntityRepository.create(createStatisticsDto);
        return await this.statisticsEntityRepository.save(stats);
    }
    async update(id, updateStatisticsDto) {
        await this.statisticsEntityRepository.update(id, updateStatisticsDto);
        return await this.findById(id);
    }
    async remove(id) {
        const stats = await this.findById(id);
        if (stats) {
            await this.statisticsEntityRepository.delete(id);
        }
        return stats;
    }
};
exports.StatisticsRepository = StatisticsRepository;
exports.StatisticsRepository = StatisticsRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(statistic_entity_1.Statistics)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], StatisticsRepository);
//# sourceMappingURL=statistics.repository.js.map