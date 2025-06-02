import { Injectable, Logger } from '@nestjs/common';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { Promotion } from './entities/promotion.entity';
import { createResponse, ApiResponse } from 'src/utils/createResponse';
import { v4 as uuidv4 } from 'uuid';
import { PromotionsRepository } from './promotions.repository';
import { FoodCategoriesRepository } from 'src/food_categories/food_categories.repository';
import { RedisService } from 'src/redis/redis.service';

const logger = new Logger('PromotionsService');

@Injectable()
export class PromotionsService {
  private readonly allPromotionsCacheKey = 'promotions:all';
  private readonly validPromotionsCacheKey =
    'promotions:valid_with_restaurants';
  private readonly cacheTtl = 300; // 5 phút (300 giây)

  constructor(
    private readonly promotionsRepository: PromotionsRepository, // Use custom repository only
    private readonly foodCategoriesRepository: FoodCategoriesRepository,
    private readonly redisService: RedisService
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

      const existingFoodCategories = await Promise.all(
        createPromotionDto.food_category_ids.map(async foodCategoryId => {
          return await this.foodCategoriesRepository.findById(foodCategoryId);
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
        food_category_ids: existingFoodCategories.map(category => category.id)
      });

      // Clear cache
      await this.redisService.del(this.allPromotionsCacheKey);
      await this.redisService.del(this.validPromotionsCacheKey);
      logger.log(
        `Cleared cache: ${this.allPromotionsCacheKey}, ${this.validPromotionsCacheKey}`
      );

      return createResponse(
        'OK',
        savedPromotion,
        'Promotion created successfully'
      );
    } catch (error: any) {
      logger.error(`Error creating promotion: ${error.message}`, error.stack);
      return createResponse('ServerError', null, 'Error creating promotion');
    }
  }

  async findValidWithRestaurants(): Promise<ApiResponse<Promotion[]>> {
    const start = Date.now();
    try {
      // Check cache
      const cachedData = await this.redisService.get(
        this.validPromotionsCacheKey
      );
      if (cachedData) {
        logger.log(
          `Fetched valid promotions from cache in ${Date.now() - start}ms`
        );
        return createResponse(
          'OK',
          JSON.parse(cachedData),
          'Valid promotions with restaurants retrieved from cache'
        );
      }
      logger.log(`Cache miss for ${this.validPromotionsCacheKey}`);

      // Query database
      const dbStart = Date.now();
      const currentTimestamp = Math.floor(Date.now() / 1000);

      const queryBuilder = this.promotionsRepository.promotionRepository // Use the underlying TypeORM repository
        .createQueryBuilder('promotion')
        .leftJoin(
          'restaurant_promotions',
          'rp',
          'rp.promotion_id = promotion.id'
        )
        .leftJoin('restaurants', 'r', 'r.id = rp.restaurant_id')
        .leftJoin('address_books', 'ab', 'ab.id = r.address_id')
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
          'r.ratings AS restaurant_ratings',
          'ab.id AS address_id',
          'ab.street AS address_street',
          'ab.city AS address_city',
          'ab.nationality AS address_nationality',
          'ab.postal_code AS address_postal_code',
          'ab.location AS address_location',
          'ab.title AS address_title'
        ])
        .where('promotion.start_date <= :currentTimestamp', {
          currentTimestamp
        })
        .andWhere('promotion.end_date >= :currentTimestamp', {
          currentTimestamp
        });

      const { entities, raw } = await queryBuilder.getRawAndEntities();
      logger.log(`Database fetch took ${Date.now() - dbStart}ms`);

      // Process data
      const processingStart = Date.now();
      interface SimplifiedRestaurant {
        id: string;
        restaurant_name: string;
        avatar: { url: string; key: string };
        ratings: { average_rating: number; review_count: number };
        address: {
          id: string;
          street: string;
          city: string;
          nationality: string;
          postal_code: number;
          location: { lng: number; lat: number };
          title: string;
        };
      }

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
            ratings: row.restaurant_ratings,
            address: {
              id: row.address_id,
              street: row.address_street,
              city: row.address_city,
              nationality: row.address_nationality,
              postal_code: row.address_postal_code,
              location: row.address_location,
              title: row.address_title
            }
          });
        }
      });

      const result = Array.from(promotionMap.values()).map(promo => ({
        ...promo,
        restaurants: promo.restaurants.slice(0, 5)
      }));
      logger.log(`Data processing took ${Date.now() - processingStart}ms`);

      // Save to cache
      const cacheStart = Date.now();
      const cacheSaved = await this.redisService.setNx(
        this.validPromotionsCacheKey,
        JSON.stringify(result),
        this.cacheTtl * 1000
      );
      if (cacheSaved) {
        logger.log(
          `Stored valid promotions in cache: ${this.validPromotionsCacheKey} (took ${Date.now() - cacheStart}ms)`
        );
      } else {
        logger.warn(
          `Failed to store valid promotions in cache: ${this.validPromotionsCacheKey}`
        );
      }

      logger.log(`Total time: ${Date.now() - start}ms`);
      return createResponse(
        'OK',
        result,
        'Valid promotions with restaurants retrieved successfully'
      );
    } catch (error: any) {
      logger.error(
        `Error fetching valid promotions: ${error.message}`,
        error.stack
      );
      return createResponse(
        'ServerError',
        null,
        'Error fetching valid promotions with restaurants'
      );
    }
  }

  async findAll(): Promise<ApiResponse<Promotion[]>> {
    const start = Date.now();
    try {
      // Kiểm tra cache
      const cachedData = await this.redisService.get(
        this.allPromotionsCacheKey
      );
      if (cachedData) {
        logger.log(`Fetched promotions from cache in ${Date.now() - start}ms`);
        return createResponse(
          'OK',
          JSON.parse(cachedData),
          'Promotions retrieved from cache'
        );
      }
      logger.log(`Cache miss for ${this.allPromotionsCacheKey}`);

      // Truy vấn database
      const dbStart = Date.now();
      const promotions = await this.promotionsRepository.findAll();
      logger.log(`Database fetch took ${Date.now() - dbStart}ms`);

      // Lưu vào cache
      const cacheStart = Date.now();
      const cacheSaved = await this.redisService.setNx(
        this.allPromotionsCacheKey,
        JSON.stringify(promotions),
        this.cacheTtl * 1000
      );
      if (cacheSaved) {
        logger.log(
          `Stored promotions in cache: ${this.allPromotionsCacheKey} (took ${Date.now() - cacheStart}ms)`
        );
      } else {
        logger.warn(
          `Failed to store promotions in cache: ${this.allPromotionsCacheKey}`
        );
      }

      logger.log(`Total time: ${Date.now() - start}ms`);
      return createResponse(
        'OK',
        promotions,
        'Promotions retrieved successfully'
      );
    } catch (error: any) {
      logger.error(`Error fetching promotions: ${error.message}`, error.stack);
      return createResponse('ServerError', null, 'Error fetching promotions');
    }
  }

  async findOne(id: string): Promise<ApiResponse<Promotion>> {
    const start = Date.now();
    const cacheKey = `promotion:${id}`;

    try {
      // Try to get from cache first
      const cachedData = await this.redisService.get(cacheKey);
      if (cachedData) {
        logger.log(`Cache hit for promotion ${id} in ${Date.now() - start}ms`);
        return createResponse(
          'OK',
          JSON.parse(cachedData),
          'Promotion retrieved from cache'
        );
      }

      logger.log(`Cache miss for promotion ${id}`);
      const promotion =
        await this.promotionsRepository.findByIdWithRestaurants(id);

      if (!promotion) {
        return createResponse('NotFound', null, 'Promotion not found');
      }

      // Cache the result for 5 minutes
      await this.redisService.set(cacheKey, JSON.stringify(promotion), 300);

      logger.log(`Fetched promotion ${id} in ${Date.now() - start}ms`);
      return createResponse(
        'OK',
        promotion,
        'Promotion retrieved successfully'
      );
    } catch (error: any) {
      logger.error(`Error fetching promotion: ${error.message}`, error.stack);
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

      // Xóa cache
      await this.redisService.del(this.allPromotionsCacheKey);
      await this.redisService.del(this.validPromotionsCacheKey);
      logger.log(
        `Cleared cache: ${this.allPromotionsCacheKey}, ${this.validPromotionsCacheKey}`
      );

      return createResponse(
        'OK',
        updatedPromotion,
        'Promotion updated successfully'
      );
    } catch (error: any) {
      logger.error(`Error updating promotion: ${error.message}`, error.stack);
      return createResponse('ServerError', null, 'Error updating promotion');
    }
  }

  async remove(id: string): Promise<ApiResponse<null>> {
    try {
      const result = await this.promotionsRepository.delete(id);
      if (result.affected === 0) {
        return createResponse('NotFound', null, 'Promotion not found');
      }

      // Xóa cache
      await this.redisService.del(this.allPromotionsCacheKey);
      await this.redisService.del(this.validPromotionsCacheKey);
      logger.log(
        `Cleared cache: ${this.allPromotionsCacheKey}, ${this.validPromotionsCacheKey}`
      );

      return createResponse('OK', null, 'Promotion deleted successfully');
    } catch (error: any) {
      logger.error(`Error deleting promotion: ${error.message}`, error.stack);
      return createResponse('ServerError', null, 'Error deleting promotion');
    }
  }

  async updateEntityAvatar(
    uploadResult: { url: string; public_id: string },
    entityId: string
  ) {
    try {
      const promotion = await this.promotionsRepository.update(entityId, {
        avatar: { url: uploadResult.url, key: uploadResult.public_id }
      });

      if (!promotion) {
        return createResponse('NotFound', null, 'Promotion not found');
      }

      // Xóa cache
      await this.redisService.del(this.allPromotionsCacheKey);
      await this.redisService.del(this.validPromotionsCacheKey);
      logger.log(
        `Cleared cache: ${this.allPromotionsCacheKey}, ${this.validPromotionsCacheKey}`
      );

      return createResponse(
        'OK',
        promotion,
        'Promotion avatar updated successfully'
      );
    } catch (error: any) {
      logger.error(
        `Error updating promotion avatar: ${error.message}`,
        error.stack
      );
      return createResponse(
        'ServerError',
        null,
        'Error updating promotion avatar'
      );
    }
  }

  async findAllPaginated(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      const [items, total] = await this.promotionsRepository.findAllPaginated(
        skip,
        limit
      );
      const totalPages = Math.ceil(total / limit);

      return createResponse('OK', {
        totalPages,
        currentPage: page,
        totalItems: total,
        items
      });
    } catch (error) {
      logger.error(
        `Error fetching paginated promotions: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return createResponse('ServerError', null);
    }
  }
}
