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
exports.PromotionsRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const promotion_entity_1 = require("./entities/promotion.entity");
let PromotionsRepository = class PromotionsRepository {
    constructor(promotionRepository) {
        this.promotionRepository = promotionRepository;
    }
    async create(promotionData) {
        const newPromotion = this.promotionRepository.create(promotionData);
        return this.promotionRepository.save(newPromotion);
    }
    async findAll(options) {
        const queryBuilder = this.promotionRepository.createQueryBuilder('promotion');
        if (options?.relations?.includes('restaurants')) {
            queryBuilder
                .leftJoinAndSelect('promotion.restaurants', 'restaurants')
                .leftJoin('promotion.restaurants', 'restaurant_promotions');
        }
        return queryBuilder.getMany();
    }
    async findById(id) {
        return this.promotionRepository.findOne({ where: { id } });
    }
    async findByName(name) {
        return this.promotionRepository.findOne({ where: { name } });
    }
    async update(id, updateData) {
        const { food_categories, ...restData } = updateData;
        await this.promotionRepository.update(id, restData);
        if (food_categories) {
            const promotion = await this.promotionRepository.findOne({
                where: { id },
                relations: ['food_categories']
            });
            if (promotion) {
                promotion.food_categories = food_categories;
                await this.promotionRepository.save(promotion);
            }
        }
    }
    async delete(id) {
        return this.promotionRepository.delete(id);
    }
    async findByIds(ids) {
        return await this.promotionRepository.findByIds(ids);
    }
};
exports.PromotionsRepository = PromotionsRepository;
exports.PromotionsRepository = PromotionsRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(promotion_entity_1.Promotion)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], PromotionsRepository);
//# sourceMappingURL=promotions.repository.js.map