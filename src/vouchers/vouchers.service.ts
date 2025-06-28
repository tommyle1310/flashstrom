import { Injectable, Logger } from '@nestjs/common';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { Voucher, VoucherStatus, VoucherType } from './entities/voucher.entity';
import { createResponse, ApiResponse } from 'src/utils/createResponse';
import { v4 as uuidv4 } from 'uuid';
import { VouchersRepository } from './vouchers.repository';
import { RedisService } from 'src/redis/redis.service';
import { DataSource, EntityManager } from 'typeorm';

const logger = new Logger('VouchersService');

export interface VoucherValidationResult {
  isValid: boolean;
  errors: string[];
  voucher?: Voucher;
  discountAmount?: number;
}

export interface ApplyVouchersResult {
  totalDiscount: number;
  appliedVouchers: Voucher[];
  deliveryDiscount: number;
  itemDiscount: number;
}

@Injectable()
export class VouchersService {
  private readonly allVouchersCacheKey = 'vouchers:all';
  private readonly validVouchersCacheKey = 'vouchers:valid';
  private readonly cacheTtl = 300; // 5 minutes

  constructor(
    private readonly vouchersRepository: VouchersRepository,
    private readonly redisService: RedisService,
    private readonly dataSource: DataSource
  ) {}

  async create(
    createVoucherDto: CreateVoucherDto
  ): Promise<ApiResponse<Voucher>> {
    try {
      // Check if voucher code already exists
      const existingVoucher = await this.vouchersRepository.findByCode(
        createVoucherDto.code
      );
      if (existingVoucher) {
        return createResponse(
          'DuplicatedRecord',
          null,
          'Voucher with this code already exists'
        );
      }

      // Validate dates
      if (createVoucherDto.start_date >= createVoucherDto.end_date) {
        return createResponse(
          'InvalidFormatInput',
          null,
          'Start date must be before end date'
        );
      }

      // Validate discount value based on type
      if (
        createVoucherDto.voucher_type === VoucherType.PERCENTAGE &&
        createVoucherDto.discount_value > 100
      ) {
        return createResponse(
          'InvalidFormatInput',
          null,
          'Percentage discount cannot exceed 100%'
        );
      }

      const savedVoucher = await this.vouchersRepository.create({
        ...createVoucherDto,
        id: `FF_VOUCHER_${uuidv4()}`,
        current_usage: 0
      });

      // Clear caches
      await this.clearVoucherCaches();

      return createResponse('OK', savedVoucher, 'Voucher created successfully');
    } catch (error: any) {
      logger.error(`Error creating voucher: ${error.message}`, error.stack);
      return createResponse('ServerError', null, 'Error creating voucher');
    }
  }

  async findAll(): Promise<ApiResponse<Voucher[]>> {
    const start = Date.now();
    try {
      // Check cache
      const cachedData = await this.redisService.get(this.allVouchersCacheKey);
      if (cachedData) {
        logger.log(`Fetched vouchers from cache in ${Date.now() - start}ms`);
        return createResponse(
          'OK',
          JSON.parse(cachedData),
          'Vouchers retrieved from cache'
        );
      }

      // Fetch from database
      const vouchers = await this.vouchersRepository.findAll();

      // Cache the result
      await this.redisService.set(
        this.allVouchersCacheKey,
        JSON.stringify(vouchers),
        this.cacheTtl * 1000
      );

      logger.log(`Fetched vouchers from DB in ${Date.now() - start}ms`);
      return createResponse('OK', vouchers, 'Vouchers retrieved successfully');
    } catch (error: any) {
      logger.error(`Error fetching vouchers: ${error.message}`, error.stack);
      return createResponse('ServerError', null, 'Error fetching vouchers');
    }
  }

  async findValidVouchers(): Promise<ApiResponse<Voucher[]>> {
    const start = Date.now();
    try {
      // Check cache
      const cachedData = await this.redisService.get(
        this.validVouchersCacheKey
      );
      if (cachedData) {
        logger.log(
          `Fetched valid vouchers from cache in ${Date.now() - start}ms`
        );
        return createResponse(
          'OK',
          JSON.parse(cachedData),
          'Valid vouchers retrieved from cache'
        );
      }

      // Fetch from database
      const vouchers = await this.vouchersRepository.findValidVouchers();

      // Cache the result
      await this.redisService.set(
        this.validVouchersCacheKey,
        JSON.stringify(vouchers),
        this.cacheTtl * 1000
      );

      logger.log(`Fetched valid vouchers from DB in ${Date.now() - start}ms`);
      return createResponse(
        'OK',
        vouchers,
        'Valid vouchers retrieved successfully'
      );
    } catch (error: any) {
      logger.error(
        `Error fetching valid vouchers: ${error.message}`,
        error.stack
      );
      return createResponse(
        'ServerError',
        null,
        'Error fetching valid vouchers'
      );
    }
  }

  async findVouchersValidAtTime(
    timestamp?: number
  ): Promise<ApiResponse<Voucher[]>> {
    const start = Date.now();
    const targetTime = timestamp || Math.floor(Date.now() / 1000);
    const cacheKey = `vouchers:valid_at_time:${targetTime}`;

    try {
      // Check cache
      const cachedData = await this.redisService.get(cacheKey);
      if (cachedData) {
        logger.log(
          `Fetched vouchers valid at time from cache in ${Date.now() - start}ms`
        );
        return createResponse(
          'OK',
          JSON.parse(cachedData),
          'Vouchers valid at time retrieved from cache'
        );
      }

      logger.log(`Cache miss for vouchers valid at time ${targetTime}`);

      // Fetch all vouchers from database
      const allVouchers = await this.vouchersRepository.findAll();

      // Filter vouchers that are valid at the specified time (only considering start_date and end_date)
      const validVouchers = allVouchers.filter(
        voucher =>
          voucher.status === VoucherStatus.ACTIVE &&
          targetTime >= voucher.start_date &&
          targetTime <= voucher.end_date &&
          (voucher.maximum_usage === null ||
            voucher.current_usage < voucher.maximum_usage)
      );

      // Cache the result for shorter time (2 minutes) since it's time-specific
      await this.redisService.set(
        cacheKey,
        JSON.stringify(validVouchers),
        120 * 1000
      );

      logger.log(
        `Fetched ${validVouchers.length} vouchers valid at time ${targetTime} in ${Date.now() - start}ms`
      );

      return createResponse(
        'OK',
        validVouchers,
        `Found ${validVouchers.length} vouchers valid at the specified time`
      );
    } catch (error: any) {
      logger.error(
        `Error fetching vouchers valid at time: ${error.message}`,
        error.stack
      );
      return createResponse(
        'ServerError',
        null,
        'Error fetching vouchers valid at time'
      );
    }
  }

  async findOne(id: string): Promise<ApiResponse<Voucher>> {
    const start = Date.now();
    const cacheKey = `voucher:${id}`;

    try {
      // Try to get from cache first
      const cachedData = await this.redisService.get(cacheKey);
      if (cachedData) {
        logger.log(`Cache hit for voucher ${id} in ${Date.now() - start}ms`);
        return createResponse(
          'OK',
          JSON.parse(cachedData),
          'Voucher retrieved from cache'
        );
      }

      logger.log(`Cache miss for voucher ${id}`);
      const voucher = await this.vouchersRepository.findById(id);
      if (!voucher) {
        return createResponse('NotFound', null, 'Voucher not found');
      }

      // Cache the result for 5 minutes
      await this.redisService.set(
        cacheKey,
        JSON.stringify(voucher),
        this.cacheTtl * 1000
      );

      logger.log(`Fetched voucher ${id} in ${Date.now() - start}ms`);
      return createResponse('OK', voucher, 'Voucher retrieved successfully');
    } catch (error: any) {
      logger.error(`Error fetching voucher: ${error.message}`, error.stack);
      return createResponse('ServerError', null, 'Error fetching voucher');
    }
  }

  async findByCode(code: string): Promise<ApiResponse<Voucher>> {
    const start = Date.now();
    const cacheKey = `voucher:code:${code}`;

    try {
      // Try to get from cache first
      const cachedData = await this.redisService.get(cacheKey);
      if (cachedData) {
        logger.log(
          `Cache hit for voucher code ${code} in ${Date.now() - start}ms`
        );
        return createResponse(
          'OK',
          JSON.parse(cachedData),
          'Voucher retrieved from cache'
        );
      }

      logger.log(`Cache miss for voucher code ${code}`);
      const voucher = await this.vouchersRepository.findByCode(code);
      if (!voucher) {
        return createResponse('NotFound', null, 'Voucher not found');
      }

      // Cache the result for 5 minutes
      await this.redisService.set(
        cacheKey,
        JSON.stringify(voucher),
        this.cacheTtl * 1000
      );

      logger.log(`Fetched voucher by code ${code} in ${Date.now() - start}ms`);
      return createResponse('OK', voucher, 'Voucher retrieved successfully');
    } catch (error: any) {
      logger.error(
        `Error fetching voucher by code: ${error.message}`,
        error.stack
      );
      return createResponse('ServerError', null, 'Error fetching voucher');
    }
  }

  async update(
    id: string,
    updateVoucherDto: UpdateVoucherDto
  ): Promise<ApiResponse<Voucher>> {
    try {
      const existingVoucher = await this.vouchersRepository.findById(id);
      if (!existingVoucher) {
        return createResponse('NotFound', null, 'Voucher not found');
      }

      // Check for duplicate code if code is being updated
      if (
        updateVoucherDto.code &&
        updateVoucherDto.code !== existingVoucher.code
      ) {
        const duplicateVoucher = await this.vouchersRepository.findByCode(
          updateVoucherDto.code
        );
        if (duplicateVoucher) {
          return createResponse(
            'DuplicatedRecord',
            null,
            'Voucher with this code already exists'
          );
        }
      }

      // Validate dates if being updated
      if (updateVoucherDto.start_date && updateVoucherDto.end_date) {
        if (updateVoucherDto.start_date >= updateVoucherDto.end_date) {
          return createResponse(
            'InvalidFormatInput',
            null,
            'Start date must be before end date'
          );
        }
      }

      const updatedVoucher = await this.vouchersRepository.update(
        id,
        updateVoucherDto
      );
      if (!updatedVoucher) {
        return createResponse('ServerError', null, 'Failed to update voucher');
      }

      // Clear specific caches for this voucher
      await this.clearVoucherCaches();
      await this.redisService.del(`voucher:${id}`);
      await this.redisService.del(`voucher:code:${existingVoucher.code}`);
      // Also clear new code cache if code was updated
      if (
        updateVoucherDto.code &&
        updateVoucherDto.code !== existingVoucher.code
      ) {
        await this.redisService.del(`voucher:code:${updateVoucherDto.code}`);
      }

      logger.log(
        `Cleared voucher caches for ${id} and code ${existingVoucher.code}`
      );

      return createResponse(
        'OK',
        updatedVoucher,
        'Voucher updated successfully'
      );
    } catch (error: any) {
      logger.error(`Error updating voucher: ${error.message}`, error.stack);
      return createResponse('ServerError', null, 'Error updating voucher');
    }
  }

  async remove(id: string): Promise<ApiResponse<null>> {
    try {
      const existingVoucher = await this.vouchersRepository.findById(id);
      if (!existingVoucher) {
        return createResponse('NotFound', null, 'Voucher not found');
      }

      await this.vouchersRepository.delete(id);

      // Clear specific caches for this voucher
      await this.clearVoucherCaches();
      await this.redisService.del(`voucher:${id}`);
      await this.redisService.del(`voucher:code:${existingVoucher.code}`);

      logger.log(
        `Cleared voucher caches for deleted voucher ${id} and code ${existingVoucher.code}`
      );

      return createResponse('OK', null, 'Voucher deleted successfully');
    } catch (error: any) {
      logger.error(`Error deleting voucher: ${error.message}`, error.stack);
      return createResponse('ServerError', null, 'Error deleting voucher');
    }
  }

  async findAllPaginated(
    page: number = 1,
    limit: number = 10
  ): Promise<
    ApiResponse<{
      totalPages: number;
      currentPage: number;
      totalItems: number;
      items: Voucher[];
    }>
  > {
    try {
      const skip = (page - 1) * limit;
      const [vouchers, total] = await this.vouchersRepository.findAllPaginated(
        skip,
        limit
      );
      const totalPages = Math.ceil(total / limit);

      return createResponse(
        'OK',
        {
          totalPages,
          currentPage: page,
          totalItems: total,
          items: vouchers
        },
        'Paginated vouchers retrieved successfully'
      );
    } catch (error: any) {
      logger.error(
        `Error fetching paginated vouchers: ${error.message}`,
        error.stack
      );
      return createResponse(
        'ServerError',
        null,
        'Error fetching paginated vouchers'
      );
    }
  }

  async getAvailableVouchersForCustomer(
    customerId: string,
    orderTotal: number,
    restaurantId: string,
    foodCategoryIds: string[]
  ): Promise<ApiResponse<Voucher[]>> {
    const start = Date.now();
    const cacheKey = `vouchers:customer:${customerId}:${restaurantId}:${orderTotal}:${foodCategoryIds.join(',')}`;

    try {
      // Check cache first
      const cachedData = await this.redisService.get(cacheKey);
      if (cachedData) {
        logger.log(
          `Cache hit for customer vouchers ${customerId} in ${Date.now() - start}ms`
        );
        return createResponse(
          'OK',
          JSON.parse(cachedData),
          'Available vouchers retrieved from cache'
        );
      }

      logger.log(`Cache miss for customer vouchers ${customerId}`);
      // Get customer order statistics
      const customerStats = await this.getCustomerStatistics(customerId);

      // Get vouchers based on customer eligibility
      const eligibleVouchers =
        await this.vouchersRepository.getVouchersByCustomerEligibility(
          customerId,
          customerStats.orderCount,
          customerStats.totalSpent
        );

      // Filter vouchers based on order context
      const availableVouchers =
        await this.vouchersRepository.findAvailableVouchersForCustomer(
          customerId,
          orderTotal,
          restaurantId,
          foodCategoryIds
        );

      // Combine and deduplicate
      const voucherMap = new Map();
      [...eligibleVouchers, ...availableVouchers].forEach(voucher => {
        voucherMap.set(voucher.id, voucher);
      });

      const finalVouchers = Array.from(voucherMap.values()).filter(
        voucher => voucher.canBeUsedToday() && voucher.canBeUsedNow()
      );

      // Cache the result for shorter time (1 minute) since it's customer-specific
      await this.redisService.set(
        cacheKey,
        JSON.stringify(finalVouchers),
        60 * 1000
      );

      logger.log(
        `Fetched available vouchers for customer ${customerId} in ${Date.now() - start}ms`
      );

      return createResponse(
        'OK',
        finalVouchers,
        `Found ${finalVouchers.length} available vouchers`
      );
    } catch (error: any) {
      logger.error(
        `Error getting available vouchers: ${error.message}`,
        error.stack
      );
      return createResponse(
        'ServerError',
        null,
        'Error getting available vouchers'
      );
    }
  }

  async validateVouchersForOrder(
    voucherIds: string[],
    customerId: string,
    orderTotal: number,
    deliveryFee: number,
    restaurantId: string,
    foodCategoryIds: string[],
    entityManager?: EntityManager
  ): Promise<VoucherValidationResult[]> {
    try {
      // Limit to maximum 2 vouchers
      if (voucherIds.length > 2) {
        return [
          {
            isValid: false,
            errors: ['Maximum 2 vouchers can be applied per order']
          }
        ];
      }

      const vouchers = await this.vouchersRepository.findByIds(voucherIds);
      const results: VoucherValidationResult[] = [];

      for (const voucherId of voucherIds) {
        const voucher = vouchers.find(v => v.id === voucherId);

        if (!voucher) {
          results.push({
            isValid: false,
            errors: [`Voucher ${voucherId} not found`]
          });
          continue;
        }

        const validation = await this.validateSingleVoucher(
          voucher,
          customerId,
          orderTotal,
          deliveryFee,
          restaurantId,
          foodCategoryIds,
          entityManager
        );

        results.push(validation);
      }

      return results;
    } catch (error: any) {
      logger.error(`Error validating vouchers: ${error.message}`, error.stack);
      return [
        {
          isValid: false,
          errors: ['Error validating vouchers']
        }
      ];
    }
  }

  private async validateSingleVoucher(
    voucher: Voucher,
    customerId: string,
    orderTotal: number,
    deliveryFee: number,
    restaurantId: string,
    foodCategoryIds: string[],
    entityManager?: EntityManager
  ): Promise<VoucherValidationResult> {
    const errors: string[] = [];

    // Check if voucher is active and not expired
    if (!voucher.isActive()) {
      if (voucher.isExpired()) {
        errors.push('Voucher has expired');
      } else if (voucher.status !== VoucherStatus.ACTIVE) {
        errors.push('Voucher is not active');
      } else {
        errors.push('Voucher usage limit reached');
      }
    }

    // Check time and day constraints
    if (!voucher.canBeUsedToday()) {
      errors.push('Voucher cannot be used today');
    }

    if (!voucher.canBeUsedNow()) {
      errors.push('Voucher cannot be used at this time');
    }

    // Check minimum order value
    if (
      voucher.minimum_order_value &&
      orderTotal < voucher.minimum_order_value
    ) {
      errors.push(
        `Minimum order value of ${voucher.minimum_order_value} not met`
      );
    }

    // Check customer usage limit
    const customerUsage = await this.vouchersRepository.getCustomerVoucherUsage(
      customerId,
      voucher.id,
      entityManager
    );

    if (customerUsage >= voucher.usage_limit_per_customer) {
      errors.push('You have reached the usage limit for this voucher');
    }

    // Check restaurant constraints
    if (
      voucher.applicable_restaurant_ids.length > 0 &&
      !voucher.applicable_restaurant_ids.includes(restaurantId)
    ) {
      errors.push('Voucher is not applicable to this restaurant');
    }

    if (voucher.excluded_restaurant_ids.includes(restaurantId)) {
      errors.push('Voucher cannot be used with this restaurant');
    }

    // Check food category constraints
    if (voucher.applicable_food_category_ids.length > 0) {
      const hasApplicableCategory = voucher.applicable_food_category_ids.some(
        categoryId => foodCategoryIds.includes(categoryId)
      );
      if (!hasApplicableCategory) {
        errors.push('Voucher is not applicable to items in your order');
      }
    }

    if (voucher.excluded_food_category_ids.length > 0) {
      const hasExcludedCategory = voucher.excluded_food_category_ids.some(
        categoryId => foodCategoryIds.includes(categoryId)
      );
      if (hasExcludedCategory) {
        errors.push('Voucher cannot be used with items in your order');
      }
    }

    // Calculate discount amount if valid
    let discountAmount = 0;
    if (errors.length === 0) {
      if (voucher.voucher_type === VoucherType.FIXED) {
        discountAmount = voucher.discount_value;
      } else if (voucher.voucher_type === VoucherType.PERCENTAGE) {
        discountAmount = orderTotal * (voucher.discount_value / 100);
        if (voucher.maximum_discount_amount) {
          discountAmount = Math.min(
            discountAmount,
            voucher.maximum_discount_amount
          );
        }
      } else if (voucher.voucher_type === VoucherType.FREESHIP) {
        discountAmount = deliveryFee;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      voucher: errors.length === 0 ? voucher : undefined,
      discountAmount
    };
  }

  async applyVouchersToOrder(
    validatedVouchers: VoucherValidationResult[],
    orderTotal: number,
    deliveryFee: number,
    entityManager?: EntityManager
  ): Promise<ApplyVouchersResult> {
    let totalDiscount = 0;
    let deliveryDiscount = 0;
    let itemDiscount = 0;
    const appliedVouchers: Voucher[] = [];

    for (const validation of validatedVouchers) {
      if (
        validation.isValid &&
        validation.voucher &&
        validation.discountAmount
      ) {
        appliedVouchers.push(validation.voucher);

        if (validation.voucher.voucher_type === VoucherType.FREESHIP) {
          deliveryDiscount += validation.discountAmount;
        } else {
          itemDiscount += validation.discountAmount;
        }

        totalDiscount += validation.discountAmount;

        // Increment usage count
        await this.vouchersRepository.incrementUsage(
          validation.voucher.id,
          entityManager
        );

        // Check if voucher should be marked as exhausted
        if (
          validation.voucher.maximum_usage &&
          validation.voucher.current_usage + 1 >=
            validation.voucher.maximum_usage
        ) {
          await this.vouchersRepository.markAsExhausted(validation.voucher.id);
        }
      }
    }

    return {
      totalDiscount,
      appliedVouchers,
      deliveryDiscount,
      itemDiscount
    };
  }

  private async getCustomerStatistics(customerId: string): Promise<{
    orderCount: number;
    totalSpent: number;
  }> {
    try {
      const result = await this.dataSource.query(
        `SELECT 
          COUNT(*) as order_count,
          COALESCE(SUM(total_amount), 0) as total_spent
         FROM orders 
         WHERE customer_id = $1 
         AND status = 'DELIVERED'`,
        [customerId]
      );

      return {
        orderCount: parseInt(result[0]?.order_count || '0'),
        totalSpent: parseFloat(result[0]?.total_spent || '0')
      };
    } catch (error) {
      logger.error('Error getting customer statistics:', error);
      return { orderCount: 0, totalSpent: 0 };
    }
  }

  private async clearVoucherCaches(): Promise<void> {
    try {
      await Promise.all([
        this.redisService.del(this.allVouchersCacheKey),
        this.redisService.del(this.validVouchersCacheKey)
      ]);

      // Clear time-specific caches pattern (they have 2-minute TTL anyway)
      // Note: In production, you might want to use a more sophisticated cache invalidation strategy
      const timeSpecificPattern = 'vouchers:valid_at_time:*';
      await this.redisService.del(timeSpecificPattern);

      logger.log('Cleared voucher caches including time-specific caches');
    } catch (error) {
      logger.warn('Failed to clear voucher caches:', error);
    }
  }

  async updateEntityAvatar(
    uploadResult: { url: string; public_id: string },
    entityId: string
  ): Promise<ApiResponse<Voucher>> {
    try {
      const voucher = await this.vouchersRepository.findById(entityId);
      if (!voucher) {
        return createResponse('NotFound', null, 'Voucher not found');
      }

      const updateDto = new UpdateVoucherDto();
      updateDto.avatar = {
        url: uploadResult.url,
        key: uploadResult.public_id
      };

      const updatedVoucher = await this.vouchersRepository.update(
        entityId,
        updateDto
      );
      if (!updatedVoucher) {
        return createResponse(
          'ServerError',
          null,
          'Failed to update voucher avatar'
        );
      }

      await this.clearVoucherCaches();

      return createResponse(
        'OK',
        updatedVoucher,
        'Voucher avatar updated successfully'
      );
    } catch (error: any) {
      logger.error('Error updating voucher avatar:', error);
      return createResponse(
        'ServerError',
        null,
        'An error occurred while updating voucher avatar'
      );
    }
  }
}
