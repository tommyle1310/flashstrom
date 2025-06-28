import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Voucher, VoucherStatus } from './entities/voucher.entity';
import { UpdateVoucherDto } from './dto/update-voucher.dto';

@Injectable()
export class VouchersRepository {
  constructor(
    @InjectRepository(Voucher)
    public voucherRepository: Repository<Voucher>
  ) {}

  async create(voucherData: Partial<Voucher>): Promise<Voucher> {
    const newVoucher = this.voucherRepository.create({
      ...voucherData,
      applicable_food_category_ids:
        voucherData.applicable_food_category_ids || [],
      applicable_restaurant_ids: voucherData.applicable_restaurant_ids || [],
      excluded_food_category_ids: voucherData.excluded_food_category_ids || [],
      excluded_restaurant_ids: voucherData.excluded_restaurant_ids || [],
      specific_customer_ids: voucherData.specific_customer_ids || []
    });
    return this.voucherRepository.save(newVoucher);
  }

  async findAll(): Promise<Voucher[]> {
    return this.voucherRepository.find({
      order: { created_at: 'DESC' }
    });
  }

  async findById(id: string): Promise<Voucher | null> {
    return this.voucherRepository.findOne({ where: { id } });
  }

  async findByCode(code: string): Promise<Voucher | null> {
    return this.voucherRepository.findOne({ where: { code } });
  }

  async findByIds(ids: string[]): Promise<Voucher[]> {
    return this.voucherRepository.findByIds(ids);
  }

  async findAvailableVouchersForCustomer(
    customerId: string,
    orderTotal: number,
    restaurantId: string,
    foodCategoryIds: string[]
  ): Promise<Voucher[]> {
    const currentTimestamp = Math.floor(Date.now() / 1000);

    const queryBuilder = this.voucherRepository
      .createQueryBuilder('voucher')
      .where('voucher.status = :status', { status: VoucherStatus.ACTIVE })
      .andWhere('voucher.start_date <= :currentTime', {
        currentTime: currentTimestamp
      })
      .andWhere('voucher.end_date >= :currentTime', {
        currentTime: currentTimestamp
      })
      .andWhere(
        '(voucher.maximum_usage IS NULL OR voucher.current_usage < voucher.maximum_usage)'
      )
      .andWhere(
        '(voucher.minimum_order_value IS NULL OR voucher.minimum_order_value <= :orderTotal)',
        { orderTotal }
      );

    // Filter by restaurant constraints
    queryBuilder.andWhere(
      '(array_length(voucher.applicable_restaurant_ids, 1) IS NULL OR :restaurantId = ANY(voucher.applicable_restaurant_ids))',
      { restaurantId }
    );
    queryBuilder.andWhere(
      '(array_length(voucher.excluded_restaurant_ids, 1) IS NULL OR NOT(:restaurantId = ANY(voucher.excluded_restaurant_ids)))',
      { restaurantId }
    );

    // Filter by food category constraints
    if (foodCategoryIds.length > 0) {
      queryBuilder.andWhere(
        '(array_length(voucher.applicable_food_category_ids, 1) IS NULL OR voucher.applicable_food_category_ids && :foodCategoryIds)',
        { foodCategoryIds }
      );
      queryBuilder.andWhere(
        '(array_length(voucher.excluded_food_category_ids, 1) IS NULL OR NOT(voucher.excluded_food_category_ids && :foodCategoryIds))',
        { foodCategoryIds }
      );
    }

    // Filter by customer scope
    queryBuilder.andWhere(
      `(voucher.scope != 'SPECIFIC_CUSTOMERS' OR :customerId = ANY(voucher.specific_customer_ids))`,
      { customerId }
    );

    return queryBuilder.getMany();
  }

  async getCustomerVoucherUsage(
    customerId: string,
    voucherId: string,
    entityManager?: EntityManager
  ): Promise<number> {
    const manager = entityManager || this.voucherRepository.manager;

    const result = await manager.query(
      `SELECT COUNT(*) as usage_count 
       FROM orders 
       WHERE customer_id = $1 
       AND EXISTS (
         SELECT 1 
         FROM jsonb_array_elements(vouchers_applied) AS voucher_elem
         WHERE voucher_elem->>'id' = $2
       )`,
      [customerId, voucherId]
    );

    return parseInt(result[0]?.usage_count || '0');
  }

  async incrementUsage(
    voucherId: string,
    entityManager?: EntityManager
  ): Promise<void> {
    const manager = entityManager || this.voucherRepository.manager;

    await manager
      .createQueryBuilder()
      .update(Voucher)
      .set({
        current_usage: () => 'current_usage + 1'
      })
      .where('id = :voucherId', { voucherId })
      .execute();
  }

  async update(
    id: string,
    updateVoucherDto: UpdateVoucherDto
  ): Promise<Voucher | null> {
    await this.voucherRepository.update(id, {
      ...updateVoucherDto,
      applicable_food_category_ids:
        updateVoucherDto.applicable_food_category_ids,
      applicable_restaurant_ids: updateVoucherDto.applicable_restaurant_ids,
      excluded_food_category_ids: updateVoucherDto.excluded_food_category_ids,
      excluded_restaurant_ids: updateVoucherDto.excluded_restaurant_ids,
      specific_customer_ids: updateVoucherDto.specific_customer_ids
    });
    return this.findById(id);
  }

  async delete(id: string): Promise<{ affected?: number }> {
    return this.voucherRepository.delete(id);
  }

  async findAllPaginated(
    skip: number,
    limit: number
  ): Promise<[Voucher[], number]> {
    return this.voucherRepository.findAndCount({
      skip,
      take: limit,
      order: { created_at: 'DESC' }
    });
  }

  async findValidVouchers(): Promise<Voucher[]> {
    const currentTimestamp = Math.floor(Date.now() / 1000);

    return this.voucherRepository
      .createQueryBuilder('voucher')
      .where('voucher.status = :status', { status: VoucherStatus.ACTIVE })
      .andWhere('voucher.start_date <= :currentTime', {
        currentTime: currentTimestamp
      })
      .andWhere('voucher.end_date >= :currentTime', {
        currentTime: currentTimestamp
      })
      .andWhere(
        '(voucher.maximum_usage IS NULL OR voucher.current_usage < voucher.maximum_usage)'
      )
      .orderBy('voucher.created_at', 'DESC')
      .getMany();
  }

  async markAsExhausted(voucherId: string): Promise<void> {
    await this.voucherRepository.update(voucherId, {
      status: VoucherStatus.EXHAUSTED
    });
  }

  async getVouchersByCustomerEligibility(
    customerId: string,
    customerOrderCount: number,
    customerTotalSpent: number
  ): Promise<Voucher[]> {
    const currentTimestamp = Math.floor(Date.now() / 1000);

    const queryBuilder = this.voucherRepository
      .createQueryBuilder('voucher')
      .where('voucher.status = :status', { status: VoucherStatus.ACTIVE })
      .andWhere('voucher.start_date <= :currentTime', {
        currentTime: currentTimestamp
      })
      .andWhere('voucher.end_date >= :currentTime', {
        currentTime: currentTimestamp
      })
      .andWhere(
        '(voucher.maximum_usage IS NULL OR voucher.current_usage < voucher.maximum_usage)'
      );

    // Check customer eligibility based on order count
    queryBuilder.andWhere(
      '(voucher.minimum_orders_required IS NULL OR voucher.minimum_orders_required <= :customerOrderCount)',
      { customerOrderCount }
    );

    // Check customer eligibility based on total spent
    queryBuilder.andWhere(
      '(voucher.minimum_total_spent IS NULL OR voucher.minimum_total_spent <= :customerTotalSpent)',
      { customerTotalSpent }
    );

    // Handle scope-based filtering
    queryBuilder.andWhere(
      `(
        voucher.scope = 'ALL_CUSTOMERS' OR
        (voucher.scope = 'NEW_CUSTOMERS' AND :customerOrderCount = 0) OR
        (voucher.scope = 'RETURNING_CUSTOMERS' AND :customerOrderCount > 0) OR
        (voucher.scope = 'SPECIFIC_CUSTOMERS' AND :customerId = ANY(voucher.specific_customer_ids))
      )`,
      { customerId, customerOrderCount }
    );

    return queryBuilder.orderBy('voucher.created_at', 'DESC').getMany();
  }
}
