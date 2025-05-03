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
exports.FinanceRulesRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const finance_rule_entity_1 = require("./entities/finance_rule.entity");
let FinanceRulesRepository = class FinanceRulesRepository {
    constructor(financeRuleEntityRepository) {
        this.financeRuleEntityRepository = financeRuleEntityRepository;
    }
    async findById(id) {
        return await this.financeRuleEntityRepository.findOne({
            where: { id },
            relations: ['created_by']
        });
    }
    async findAll() {
        return await this.financeRuleEntityRepository.find({
            order: { created_at: 'DESC' },
            relations: ['created_by']
        });
    }
    async create(createFinanceRuleDto) {
        const financeRule = this.financeRuleEntityRepository.create(createFinanceRuleDto);
        return await this.financeRuleEntityRepository.save(financeRule);
    }
    async update(id, updateFinanceRuleDto) {
        await this.financeRuleEntityRepository.update(id, updateFinanceRuleDto);
        return await this.findById(id);
    }
    async remove(id) {
        const financeRule = await this.findById(id);
        if (financeRule) {
            await this.financeRuleEntityRepository.delete(id);
        }
        return financeRule;
    }
    async findAllPaginated(skip, limit) {
        return this.financeRuleEntityRepository.findAndCount({
            skip,
            take: limit
        });
    }
};
exports.FinanceRulesRepository = FinanceRulesRepository;
exports.FinanceRulesRepository = FinanceRulesRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(finance_rule_entity_1.FinanceRule)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], FinanceRulesRepository);
//# sourceMappingURL=finance_rules.repository.js.map