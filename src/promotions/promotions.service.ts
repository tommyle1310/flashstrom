import { Injectable } from '@nestjs/common';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { Promotion } from './entities/promotion.entity';
import { createResponse } from 'src/utils/createResponse';
import { ApiResponse } from 'src/utils/createResponse';
import { v4 as uuidv4 } from 'uuid';
import { PromotionsRepository } from './promotions.repository';
import { FoodCategoriesRepository } from 'src/food_categories/food_categories.repository';

interface SimplifiedRestaurant {
  id: string;
  restaurant_name: string;
  avatar: { url: string; key: string } | null;
  ratings: { average_rating: number; review_count: number } | null;
  // Các field khác là optional
  owner_id?: string;
  owner_name?: string;
  address_id?: string;
  description?: string | null;
  contact_email?: { title: string; is_default: boolean; email: string }[];
  contact_phone?: { title: string; number: string; is_default: boolean }[];
  images_gallery?: { url: string; key: string }[] | null;
  status?: {
    is_open: boolean;
    is_active: boolean;
    is_accepted_orders: boolean;
  };
  opening_hours?: {
    mon: { from: number; to: number };
    tue: { from: number; to: number };
    wed: { from: number; to: number };
    thu: { from: number; to: number };
    fri: { from: number; to: number };
    sat: { from: number; to: number };
    sun: { from: number; to: number };
  };
  created_at?: number;
  updated_at?: number;
  total_orders?: number;
}

@Injectable()
export class PromotionsService {
  constructor(
    private readonly promotionsRepository: PromotionsRepository,
    private readonly foodCategoriesRepository: FoodCategoriesRepository
  ) {}

  async create(
    createPromotionDto: CreatePromotionDto
  ): Promise<ApiResponse<Promotion>> {
    try {
      const existingPromotion = await this.promotionsRepository.findByName(
        createPromotionDto.name
      );
      if (existingPromotion) {
        return createResponse(
          'DuplicatedRecord',
          null,
          'Promotion with this name already exists'
        );
      }
      console.log('createPromotionDto.food_categories', createPromotionDto);
      const existingFoodCategories = await Promise.all(
        createPromotionDto.food_categories.map(async foodCategory => {
          return await this.foodCategoriesRepository.findById(foodCategory.id);
        })
      );

      const missingCategories = existingFoodCategories.some(
        category => !category
      );

      if (missingCategories) {
        return createResponse(
          'NotFound',
          null,
          'One or more food categories not found'
        );
      }

      const savedPromotion = await this.promotionsRepository.create({
        ...createPromotionDto,
        id: `FF_PROMO_${uuidv4()}`,
        food_categories: existingFoodCategories
      });

      return createResponse(
        'OK',
        savedPromotion,
        'Promotion created successfully'
      );
    } catch (error: any) {
      console.log('error', error);
      return createResponse('ServerError', null, 'Error creating promotion');
    }
  }

  async findAll(): Promise<ApiResponse<Promotion[]>> {
    try {
      const promotions = await this.promotionsRepository.findAll();
      return createResponse(
        'OK',
        promotions,
        'Promotions retrieved successfully'
      );
    } catch (error: any) {
      console.log('error', error);
      return createResponse('ServerError', null, 'Error fetching promotions');
    }
  }

  async findValidWithRestaurants(): Promise<ApiResponse<Promotion[]>> {
    try {
      const currentTimestamp = Math.floor(Date.now() / 1000);

      const queryBuilder = this.promotionsRepository.promotionRepository
        .createQueryBuilder('promotion')
        .leftJoin(
          'restaurant_promotions',
          'rp',
          'rp.promotion_id = promotion.id'
        )
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
          'r.restaurant_name AS restaurant_name', // Thêm restaurant_name
          'r.avatar AS restaurant_avatar', // Thêm avatar
          'r.ratings AS restaurant_ratings' // Thêm ratings
        ])
        .where('promotion.start_date <= :currentTimestamp', {
          currentTimestamp
        })
        .andWhere('promotion.end_date >= :currentTimestamp', {
          currentTimestamp
        });

      const { entities, raw } = await queryBuilder.getRawAndEntities();

      const promotionMap = new Map<
        string,
        Promotion & { restaurants: SimplifiedRestaurant[] }
      >();
      entities.forEach(promo =>
        promotionMap.set(promo.id, { ...promo, restaurants: [] })
      );

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

      return createResponse(
        'OK',
        result,
        'Valid promotions with restaurants retrieved successfully'
      );
    } catch (error: any) {
      console.log('error', error);
      return createResponse(
        'ServerError',
        null,
        'Error fetching valid promotions with restaurants'
      );
    }
  }

  async findOne(id: string): Promise<ApiResponse<Promotion>> {
    try {
      const promotion = await this.promotionsRepository.findById(id);
      if (!promotion) {
        return createResponse('NotFound', null, 'Promotion not found');
      }
      return createResponse(
        'OK',
        promotion,
        'Promotion retrieved successfully'
      );
    } catch (error: any) {
      console.log('error', error);
      return createResponse('ServerError', null, 'Error fetching promotion');
    }
  }

  async update(
    id: string,
    updatePromotionDto: UpdatePromotionDto
  ): Promise<ApiResponse<Promotion>> {
    try {
      const promotion = await this.promotionsRepository.findById(id);
      if (!promotion) {
        return createResponse('NotFound', null, 'Promotion not found');
      }

      await this.promotionsRepository.update(id, updatePromotionDto);
      const updatedPromotion = await this.promotionsRepository.findById(id);
      return createResponse(
        'OK',
        updatedPromotion,
        'Promotion updated successfully'
      );
    } catch (error: any) {
      console.log('error', error);
      return createResponse('ServerError', null, 'Error updating promotion');
    }
  }

  async remove(id: string): Promise<ApiResponse<null>> {
    try {
      const result = await this.promotionsRepository.delete(id);
      if (result.affected === 0) {
        return createResponse('NotFound', null, 'Promotion not found');
      }
      return createResponse('OK', null, 'Promotion deleted successfully');
    } catch (error: any) {
      console.log('error', error);
      return createResponse('ServerError', null, 'Error deleting promotion');
    }
  }

  async updateEntityAvatar(
    uploadResult: { url: string; public_id: string },
    entityId: string
  ) {
    const promotion = await this.promotionsRepository.update(entityId, {
      avatar: { url: uploadResult.url, key: uploadResult.public_id }
    });

    if (!promotion) {
      return createResponse('NotFound', null, 'promotion not found');
    }

    return createResponse(
      'OK',
      promotion,
      'promotion avatar updated successfully'
    );
  }
}
