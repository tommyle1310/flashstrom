import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CartItem } from './entities/cart_item.entity';
import { CreateCartItemDto } from './dto/create-cart_item.dto';
import { UpdateCartItemDto } from './dto/update-cart_item.dto';
import { Equal } from 'typeorm';
import { createClient } from 'redis';

const logger = new Logger('CartItemsRepository');

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redis.connect().catch(err => logger.error('Redis connection error:', err));

@Injectable()
export class CartItemsRepository {
  constructor(
    @InjectRepository(CartItem)
    private repository: Repository<CartItem>,
    private readonly dataSource: DataSource
  ) {}

  async create(createDto: CreateCartItemDto): Promise<CartItem> {
    try {
      const cartItem = this.repository.create(createDto);
      const savedItem = await this.repository.save(cartItem);
      // Invalidate cache
      await redis.del(`cart_items:${createDto.customer_id}`);
      return savedItem;
    } catch (error) {
      logger.error('Error creating cart item:', error);
      throw error;
    }
  }

  async findAll(query: Record<string, any> = {}): Promise<CartItem[]> {
    try {
      return await this.repository.find({
        where: query,
        relations: ['customer', 'item', 'restaurant'],
        select: ['id', 'customer_id', 'item_id', 'variants', 'restaurant_id']
      });
    } catch (error) {
      logger.error('Error finding all cart items:', error);
      throw error;
    }
  }

  async findById(id: string): Promise<CartItem> {
    try {
      return await this.repository.findOne({
        where: { id: Equal(id) },
        relations: ['customer', 'item', 'restaurant'],
        select: ['id', 'customer_id', 'item_id', 'variants', 'restaurant_id']
      });
    } catch (error) {
      logger.error('Error finding cart item by id:', error);
      throw error;
    }
  }

  async findByCustomerId(
    customerId: string,
    options: { take: number }
  ): Promise<CartItem[]> {
    try {
      return this.dataSource
        .createQueryBuilder(CartItem, 'cart_item')
        .leftJoinAndSelect('cart_item.customer', 'customer')
        .leftJoinAndSelect('cart_item.item', 'item')
        .leftJoinAndSelect('cart_item.restaurant', 'restaurant')
        .where('cart_item.customer_id = :customerId', { customerId })
        .andWhere('cart_item.deleted_at IS NULL')
        .select([
          'cart_item.id',
          'cart_item.customer_id',
          'cart_item.item_id',
          'cart_item.restaurant_id',
          'cart_item.variants',
          'cart_item.created_at',
          'cart_item.updated_at'
        ])
        .take(options.take)
        .useIndex('idx_cart_items_customer_id')
        .getMany();
    } catch (error) {
      logger.error('Error finding cart items by customer id:', error);
      throw error;
    }
  }

  async findOne(query: Record<string, any>): Promise<CartItem> {
    try {
      const { where } = query;
      return await this.repository.findOne({
        where: where || query,
        relations: ['customer', 'item', 'restaurant'],
        select: ['id', 'customer_id', 'item_id', 'variants', 'restaurant_id']
      });
    } catch (error) {
      logger.error('Error finding one cart item:', error);
      throw error;
    }
  }

  async update(id: string, updateDto: UpdateCartItemDto): Promise<CartItem> {
    try {
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
    } catch (error) {
      logger.error('Error updating cart item:', error);
      throw error;
    }
  }

  async remove(id: string): Promise<boolean> {
    try {
      const item = await this.findById(id);
      const result = await this.repository.delete(id);
      if (item) {
        await redis.del(`cart_items:${item.customer_id}`);
      }
      return result.affected > 0;
    } catch (error) {
      logger.error('Error removing cart item:', error);
      throw error;
    }
  }
}
