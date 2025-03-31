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
exports.StatisticRecordsController = void 0;
const common_1 = require("@nestjs/common");
const statistic_records_service_1 = require("./statistic-records.service");
const create_statistic_record_dto_1 = require("./dto/create-statistic-record.dto");
const update_statistic_record_dto_1 = require("./dto/update-statistic-record.dto");
let StatisticRecordsController = class StatisticRecordsController {
    constructor(statisticRecordsService) {
        this.statisticRecordsService = statisticRecordsService;
    }
    create(createStatisticRecordDto) {
        return this.statisticRecordsService.create(createStatisticRecordDto);
    }
    findAll() {
        return this.statisticRecordsService.findAll();
    }
    findOne(id) {
        return this.statisticRecordsService.findOne(id);
    }
    async findByDriverId(driverId, limit, offset) {
        const limitNum = limit ? parseInt(limit, 10) : 10;
        const offsetNum = offset ? parseInt(offset, 10) : 0;
        return this.statisticRecordsService.findByDriverId({
            driverId,
            limit: limitNum,
            offset: offsetNum
        });
    }
    update(id, updateStatisticRecordDto) {
        return this.statisticRecordsService.update(id, updateStatisticRecordDto);
    }
    remove(id) {
        return this.statisticRecordsService.remove(id);
    }
};
exports.StatisticRecordsController = StatisticRecordsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_statistic_record_dto_1.CreateStatisticRecordDto]),
    __metadata("design:returntype", void 0)
], StatisticRecordsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], StatisticRecordsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StatisticRecordsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)('/by-driver/:driverId'),
    __param(0, (0, common_1.Param)('driverId')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], StatisticRecordsController.prototype, "findByDriverId", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_statistic_record_dto_1.UpdateStatisticRecordDto]),
    __metadata("design:returntype", void 0)
], StatisticRecordsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StatisticRecordsController.prototype, "remove", null);
exports.StatisticRecordsController = StatisticRecordsController = __decorate([
    (0, common_1.Controller)('statistic-records'),
    __metadata("design:paramtypes", [statistic_records_service_1.StatisticRecordsService])
], StatisticRecordsController);
//# sourceMappingURL=statistic-records.controller.js.map