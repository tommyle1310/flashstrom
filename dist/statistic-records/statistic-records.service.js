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
exports.StatisticRecordsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const statistic_record_entity_1 = require("./entities/statistic-record.entity");
const statistic_records_repository_1 = require("./statistic-records.repository");
const createResponse_1 = require("../utils/createResponse");
let StatisticRecordsService = class StatisticRecordsService {
    constructor(statisticRecordsRepository, statisticRecordEntityRepository) {
        this.statisticRecordsRepository = statisticRecordsRepository;
        this.statisticRecordEntityRepository = statisticRecordEntityRepository;
    }
    async create(createStatisticRecordDto) {
        try {
            if (!createStatisticRecordDto.driver_id &&
                !createStatisticRecordDto.customer_care_id &&
                !createStatisticRecordDto.restaurant_id) {
                return (0, createResponse_1.createResponse)('MissingInput', null, 'At least one of driver_id, customer_care_id, or restaurant_id is required');
            }
            const newRecord = await this.statisticRecordsRepository.create(createStatisticRecordDto);
            return (0, createResponse_1.createResponse)('OK', newRecord, 'Statistic record created successfully');
        }
        catch (error) {
            return this.handleError('Error creating statistic record:', error);
        }
    }
    async findAll() {
        try {
            const records = await this.statisticRecordEntityRepository.find();
            return (0, createResponse_1.createResponse)('OK', records, 'Fetched all statistic records');
        }
        catch (error) {
            return this.handleError('Error fetching statistic records:', error);
        }
    }
    async findOne(id) {
        try {
            const record = await this.statisticRecordsRepository.findById(id);
            return this.handleRecordResponse(record);
        }
        catch (error) {
            return this.handleError('Error fetching statistic record:', error);
        }
    }
    async findByDriverId({ driverId, limit, offset }) {
        try {
            const records = await this.statisticRecordsRepository.findByDriverId(driverId, limit, offset);
            return (0, createResponse_1.createResponse)('OK', records, 'Fetched statistic records by driver');
        }
        catch (error) {
            return this.handleError('Error fetching statistic records by driver:', error);
        }
    }
    async update(id, updateStatisticRecordDto) {
        try {
            const record = await this.statisticRecordsRepository.findById(id);
            if (!record) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Statistic record not found');
            }
            const updatedRecord = await this.statisticRecordsRepository.update(id, updateStatisticRecordDto);
            return (0, createResponse_1.createResponse)('OK', updatedRecord, 'Statistic record updated successfully');
        }
        catch (error) {
            return this.handleError('Error updating statistic record:', error);
        }
    }
    async remove(id) {
        try {
            const deletedRecord = await this.statisticRecordsRepository.remove(id);
            if (!deletedRecord) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Statistic record not found');
            }
            return (0, createResponse_1.createResponse)('OK', null, 'Statistic record deleted successfully');
        }
        catch (error) {
            return this.handleError('Error deleting statistic record:', error);
        }
    }
    handleRecordResponse(record) {
        if (!record) {
            return (0, createResponse_1.createResponse)('NotFound', null, 'Statistic record not found');
        }
        return (0, createResponse_1.createResponse)('OK', record, 'Statistic record retrieved successfully');
    }
    handleError(message, error) {
        console.error(message, error);
        return (0, createResponse_1.createResponse)('ServerError', null, 'An error occurred while processing your request');
    }
};
exports.StatisticRecordsService = StatisticRecordsService;
exports.StatisticRecordsService = StatisticRecordsService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(statistic_record_entity_1.StatisticRecord)),
    __metadata("design:paramtypes", [statistic_records_repository_1.StatisticRecordsRepository,
        typeorm_2.Repository])
], StatisticRecordsService);
//# sourceMappingURL=statistic-records.service.js.map