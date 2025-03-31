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
exports.CreateStatisticsDto = void 0;
const class_validator_1 = require("class-validator");
var PeriodType;
(function (PeriodType) {
    PeriodType["DAILY"] = "daily";
    PeriodType["WEEKLY"] = "weekly";
    PeriodType["MONTHLY"] = "monthly";
    PeriodType["YEARLY"] = "yearly";
})(PeriodType || (PeriodType = {}));
class CreateStatisticsDto {
}
exports.CreateStatisticsDto = CreateStatisticsDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateStatisticsDto.prototype, "driver_id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateStatisticsDto.prototype, "customer_care_id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateStatisticsDto.prototype, "restaurant_id", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(PeriodType),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateStatisticsDto.prototype, "period_type", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CreateStatisticsDto.prototype, "period_start", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Array)
], CreateStatisticsDto.prototype, "records", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Object)
], CreateStatisticsDto.prototype, "data", void 0);
//# sourceMappingURL=create-statistic.dto.js.map