import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CartItem } from './entities/cart_item.entity';
import { CreateCartItemDto } from './dto/create-cart_item.dto';
import { UpdateCartItemDto } from './dto/update-cart_item.dto';
import { Equal } from 'typeorm';
import { createClient } from 'redis';

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redis.connect().catch(err => console.error('Redis connection error:', err));

@Injectable()
export class CartItemsRepository {
  constructor(
    @InjectRepository(CartItem)
    private repository: Repository<CartItem>,
    private readonly dataSource: DataSource
  ) {}

  async create(createDto: CreateCartItemDto): Promise<CartItem> {
    const cartItem = this.repository.create(createDto);
    const savedItem = await this.repository.save(cartItem);
    // Invalidate cache
    await redis.del(`cart_items:${createDto.customer_id}`);
    return savedItem;
  }

  async findAll(query: Record<string, any> = {}): Promise<CartItem[]> {
    return await this.repository.find({
      where: query,
      select: ['id', 'customer_id', 'item_id', 'variants']
    });
  }

  async findById(id: string): Promise<CartItem> {
    return await this.repository.findOne({
      where: { id: Equal(id) },
      select: ['id', 'customer_id', 'item_id', 'variants']
    });
  }

  async findByCustomerId(
    customerId: string,
    options: { take: number }
  ): Promise<CartItem[]> {
    return this.dataSource
      .createQueryBuilder(CartItem, 'cart_item')
      .where('cart_item.customer_id = :customerId', { customerId })
      .andWhere('cart_item.deleted_at IS NULL')
      .select([
        'cart_item.id',
        'cart_item.customer_id',
        'cart_item.item_id',
        'cart_item.restaurant_id',
        'cart_item.created_at',
        'cart_item.updated_at'
      ])
      .take(options.take)
      .useIndex('idx_cart_items_customer_id')
      .getMany();
  }

  async findOne(query: Record<string, any>): Promise<CartItem> {
    const { where } = query;
    return await this.repository.findOne({
      where: where || query,
      select: ['id', 'customer_id', 'item_id', 'variants']
    });
  }

  async update(id: string, updateDto: UpdateCartItemDto): Promise<CartItem> {
    await this.repository.update(id, {
      ...updateDto,
      updated_at: Math.floor(Date.now() / 1000)
    });
    const updatedItem = await this.findById(id);
    // Invalidate cache
    if (updatedItem) {
      await redis.del(`cart_items:${updatedItem.customer_id}`);
    }
    return updatedItem;
  }

  async remove(id: string): Promise<boolean> {
    const item = await this.findById(id);
    const result = await this.repository.delete(id);
    if (item) {
      await redis.del(`cart_items:${item.customer_id}`);
    }
    return result.affected > 0;
  }
}
