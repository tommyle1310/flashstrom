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
exports.PromotionsService = void 0;
const common_1 = require("@nestjs/common");
const createResponse_1 = require("../utils/createResponse");
const uuid_1 = require("uuid");
const promotions_repository_1 = require("./promotions.repository");
const food_categories_repository_1 = require("../food_categories/food_categories.repository");
let PromotionsService = class PromotionsService {
    constructor(promotionsRepository, foodCategoriesRepository) {
        this.promotionsRepository = promotionsRepository;
        this.foodCategoriesRepository = foodCategoriesRepository;
    }
    async create(createPromotionDto) {
        try {
            const existingPromotion = await this.promotionsRepository.findByName(createPromotionDto.name);
            if (existingPromotion) {
                return (0, createResponse_1.createResponse)('DuplicatedRecord', null, 'Promotion with this name already exists');
            }
            console.log('createPromotionDto.food_categories', createPromotionDto);
            const existingFoodCategories = await Promise.all(createPromotionDto.food_categories.map(async (foodCategory) => {
                return await this.foodCategoriesRepository.findById(foodCategory.id);
            }));
            const missingCategories = existingFoodCategories.some(category => !category);
            if (missingCategories) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'One or more food categories not found');
            }
            const savedPromotion = await this.promotionsRepository.create({
                ...createPromotionDto,
                id: `FF_PROMO_${(0, uuid_1.v4)()}`,
                food_categories: existingFoodCategories
            });
            return (0, createResponse_1.createResponse)('OK', savedPromotion, 'Promotion created successfully');
        }
        catch (error) {
            console.log('error', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error creating promotion');
        }
    }
    async findAll() {
        try {
            const promotions = await this.promotionsRepository.findAll();
            return (0, createResponse_1.createResponse)('OK', promotions, 'Promotions retrieved successfully');
        }
        catch (error) {
            console.log('error', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error fetching promotions');
        }
    }
    async findValidWithRestaurants() {
        try {
            const currentTimestamp = Math.floor(Date.now() / 1000);
            const queryBuilder = this.promotionsRepository.promotionRepository
                .createQueryBuilder('promotion')
                .leftJoin('restaurant_promotions', 'rp', 'rp.promotion_id = promotion.id')
                .leftJoin('restaurants', 'r', 'r.id = rp.restaurant_id')
                .select([
                'promotion.id',
                'promotion.name',
                'promotion.description',
                'promotion.start_date',
                'promotion.end_date',
                'promotion.discount_type',
                'promotion.discount_value',
                'promotion.promotion_cost_price',
                'promotion.minimum_order_value',
                'promotion.avatar',
                'promotion.status',
                'promotion.bogo_details',
                'promotion.created_at',
                'promotion.updated_at',
                'r.id AS restaurant_id',
                'r.restaurant_name AS restaurant_name',
                'r.avatar AS restaurant_avatar',
                'r.ratings AS restaurant_ratings'
            ])
                .where('promotion.start_date <= :currentTimestamp', {
                currentTimestamp
            })
                .andWhere('promotion.end_date >= :currentTimestamp', {
                currentTimestamp
            });
            const { entities, raw } = await queryBuilder.getRawAndEntities();
            const promotionMap = new Map();
            entities.forEach(promo => promotionMap.set(promo.id, { ...promo, restaurants: [] }));
            raw.forEach(row => {
                const promo = promotionMap.get(row.promotion_id);
                if (promo && row.restaurant_id) {
                    promo.restaurants.push({
                        id: row.restaurant_id,
                        restaurant_name: row.restaurant_name,
                        avatar: row.restaurant_avatar,
                        ratings: row.restaurant_ratings
                    });
                }
            });
            const result = Array.from(promotionMap.values()).map(promo => ({
                ...promo,
                restaurants: promo.restaurants.slice(0, 5)
            }));
            return (0, createResponse_1.createResponse)('OK', result, 'Valid promotions with restaurants retrieved successfully');
        }
        catch (error) {
            console.log('error', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error fetching valid promotions with restaurants');
        }
    }
    async findOne(id) {
        try {
            const promotion = await this.promotionsRepository.findById(id);
            if (!promotion) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Promotion not found');
            }
            return (0, createResponse_1.createResponse)('OK', promotion, 'Promotion retrieved successfully');
        }
        catch (error) {
            console.log('error', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error fetching promotion');
        }
    }
    async update(id, updatePromotionDto) {
        try {
            const promotion = await this.promotionsRepository.findById(id);
            if (!promotion) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Promotion not found');
            }
            await this.promotionsRepository.update(id, updatePromotionDto);
            const updatedPromotion = await this.promotionsRepository.findById(id);
            return (0, createResponse_1.createResponse)('OK', updatedPromotion, 'Promotion updated successfully');
        }
        catch (error) {
            console.log('error', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error updating promotion');
        }
    }
    async remove(id) {
        try {
            const result = await this.promotionsRepository.delete(id);
            if (result.affected === 0) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Promotion not found');
            }
            return (0, createResponse_1.createResponse)('OK', null, 'Promotion deleted successfully');
        }
        catch (error) {
            console.log('error', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error deleting promotion');
        }
    }
    async updateEntityAvatar(uploadResult, entityId) {
        const promotion = await this.promotionsRepository.update(entityId, {
            avatar: { url: uploadResult.url, key: uploadResult.public_id }
        });
        if (!promotion) {
            return (0, createResponse_1.createResponse)('NotFound', null, 'promotion not found');
        }
        return (0, createResponse_1.createResponse)('OK', promotion, 'promotion avatar updated successfully');
    }
};
exports.PromotionsService = PromotionsService;
exports.PromotionsService = PromotionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [promotions_repository_1.PromotionsRepository,
        food_categories_repository_1.FoodCategoriesRepository])
], PromotionsService);
//# sourceMappingURL=promotions.service.js.map