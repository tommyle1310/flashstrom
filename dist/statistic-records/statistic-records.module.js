"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatisticRecordsModule = void 0;
const common_1 = require("@nestjs/common");
const statistic_records_service_1 = require("./statistic-records.service");
const statistic_records_controller_1 = require("./statistic-records.controller");
const typeorm_1 = require("@nestjs/typeorm");
const statistic_entity_1 = require("../statistics/entities/statistic.entity");
const statistic_record_entity_1 = require("./entities/statistic-record.entity");
const statistic_records_repository_1 = require("./statistic-records.repository");
let StatisticRecordsModule = class StatisticRecordsModule {
};
exports.StatisticRecordsModule = StatisticRecordsModule;
exports.StatisticRecordsModule = StatisticRecordsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([statistic_entity_1.Statistics, statistic_record_entity_1.StatisticRecord])],
        controllers: [statistic_records_controller_1.StatisticRecordsController],
        providers: [statistic_records_service_1.StatisticRecordsService, statistic_records_repository_1.StatisticRecordsRepository]
    })
], StatisticRecordsModule);
//# sourceMappingURL=statistic-records.module.js.map