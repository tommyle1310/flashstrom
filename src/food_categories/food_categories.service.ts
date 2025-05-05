import { Injectable, Logger } from '@nestjs/common';
import { CreateFoodCategoryDto } from './dto/create-food_category.dto';
import { UpdateFoodCategoryDto } from './dto/update-food_category.dto';
import { FoodCategoriesRepository } from './food_categories.repository';
import { createResponse, ApiResponse } from 'src/utils/createResponse';
import { FoodCategory } from './entities/food_category.entity';
import { RedisService } from 'src/redis/redis.service'; // Giả định bạn có RedisService
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

const logger = new Logger('FoodCategoriesService');

@Injectable()
export class FoodCategoriesService {
  private readonly cacheKey = 'food_categories:all';
  private readonly cacheTtl = 3600; // 1 giờ (3600 giây)

  constructor(
    private readonly foodCategoriesRepository: FoodCategoriesRepository,
    private readonly redisService: RedisService, // Inject RedisService
    @InjectRepository(FoodCategory)
    private readonly foodCategoryRepository: Repository<FoodCategory>
  ) {}

  async create(
    createFoodCategoryDto: CreateFoodCategoryDto
  ): Promise<ApiResponse<FoodCategory>> {
    try {
      const existingCategory = await this.foodCategoriesRepository.findByName(
        createFoodCategoryDto.name
      );

      if (existingCategory) {
        return createResponse(
          'DuplicatedRecord',
          null,
          'Food category with this name already exists'
        );
      }

      const newCategory = await this.foodCategoriesRepository.create(
        createFoodCategoryDto
      );

      // Xóa cache khi tạo mới
      await this.redisService.del(this.cacheKey);
      logger.log(`Cleared cache: ${this.cacheKey}`);

      return createResponse(
        'OK',
        newCategory,
        'Food category created successfully'
      );
    } catch (error: any) {
      logger.error(
        `Error creating food category: ${error.message}`,
        error.stack
      );
      return createResponse(
        'ServerError',
        null,
        'Error creating food category'
      );
    }
  }

  async findAll(): Promise<ApiResponse<FoodCategory[]>> {
    const start = Date.now();
    try {
      // 1. Kiểm tra cache
      const cachedData = await this.redisService.get(this.cacheKey);
      if (cachedData) {
        logger.log(
          `Fetched food categories from cache in ${Date.now() - start}ms`
        );
        return createResponse(
          'OK',
          JSON.parse(cachedData),
          'Fetched all food categories from cache'
        );
      }
      logger.log(`Cache miss for ${this.cacheKey}`);

      // 2. Truy vấn database
      const dbStart = Date.now();
      const categories = await this.foodCategoriesRepository.findAll();
      logger.log(`Database fetch took ${Date.now() - dbStart}ms`);

      // 3. Lưu vào cache
      const cacheStart = Date.now();
      const cacheSaved = await this.redisService.setNx(
        this.cacheKey,
        JSON.stringify(categories),
        this.cacheTtl * 1000 // TTL tính bằng milliseconds
      );
      if (cacheSaved) {
        logger.log(
          `Stored food categories in cache: ${this.cacheKey} (took ${Date.now() - cacheStart}ms)`
        );
      } else {
        logger.warn(
          `Failed to store food categories in cache: ${this.cacheKey}`
        );
      }

      logger.log(`Total time: ${Date.now() - start}ms`);
      return createResponse('OK', categories, 'Fetched all food categories');
    } catch (error: any) {
      logger.error(
        `Error fetching food categories: ${error.message}`,
        error.stack
      );
      return createResponse(
        'ServerError',
        null,
        'Error fetching food categories'
      );
    }
  }

  async findOne(id: string): Promise<ApiResponse<FoodCategory>> {
    try {
      const category = await this.foodCategoriesRepository.findById(id);
      if (!category) {
        return createResponse('NotFound', null, 'Food category not found');
      }
      return createResponse(
        'OK',
        category,
        'Food category retrieved successfully'
      );
    } catch (error: any) {
      logger.error(
        `Error fetching food category: ${error.message}`,
        error.stack
      );
      return createResponse(
        'ServerError',
        null,
        'Error fetching food category'
      );
    }
  }

  async update(
    id: string,
    updateFoodCategoryDto: UpdateFoodCategoryDto
  ): Promise<ApiResponse<FoodCategory>> {
    try {
      const category = await this.foodCategoriesRepository.findById(id);
      if (!category) {
        return createResponse('NotFound', null, 'Food category not found');
      }

      const updatedCategory = await this.foodCategoriesRepository.update(
        id,
        updateFoodCategoryDto
      );

      // Xóa cache khi cập nhật
      await this.redisService.del(this.cacheKey);
      logger.log(`Cleared cache: ${this.cacheKey}`);

      return createResponse(
        'OK',
        updatedCategory,
        'Food category updated successfully'
      );
    } catch (error: any) {
      logger.error(
        `Error updating food category: ${error.message}`,
        error.stack
      );
      return createResponse(
        'ServerError',
        null,
        'Error updating food category'
      );
    }
  }

  async remove(id: string): Promise<ApiResponse<null>> {
    try {
      const result = await this.foodCategoriesRepository.delete(id);
      if (!result) {
        return createResponse('NotFound', null, 'Food category not found');
      }

      // Xóa cache khi xóa
      await this.redisService.del(this.cacheKey);
      logger.log(`Cleared cache: ${this.cacheKey}`);

      return createResponse('OK', null, 'Food category deleted successfully');
    } catch (error: any) {
      logger.error(
        `Error deleting food category: ${error.message}`,
        error.stack
      );
      return createResponse(
        'ServerError',
        null,
        'Error deleting food category'
      );
    }
  }

  async findAllPaginated(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      const [items, total] =
        await this.foodCategoriesRepository.findAllPaginated(skip, limit);
      const totalPages = Math.ceil(total / limit);

      return createResponse('OK', {
        totalPages,
        currentPage: page,
        totalItems: total,
        items
      });
    } catch (error) {
      logger.error(
        `Error fetching paginated food categories: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return createResponse('ServerError', null);
    }
  }
}
