import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CartItem } from './entities/cart_item.entity';
import { CreateCartItemDto } from './dto/create-cart_item.dto';
import { UpdateCartItemDto } from './dto/update-cart_item.dto';
import { Equal } from 'typeorm';
import { createClient } from 'redis';

const logger = new Logger('CartItemsRepository');

// FIXED: Improved Redis connection handling with timeout and error handling
const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    connectTimeout: 5000, // 5 second timeout
    reconnectStrategy: retries => {
      if (retries > 3) {
        logger.warn(
          'Redis connection failed after multiple attempts, giving up'
        );
        return new Error('Redis connection failed');
      }
      return Math.min(retries * 100, 3000); // Increasing backoff
    }
  }
});

// Track Redis connection state
let redisConnected = false;

// Connect to Redis with proper error handling
redis
  .connect()
  .then(() => {
    redisConnected = true;
    logger.log('Redis connected successfully');
  })
  .catch(err => {
    redisConnected = false;
    logger.error('Redis connection error:', err);
  });

// Handle disconnection events
redis.on('error', err => {
  redisConnected = false;
  logger.error('Redis error:', err);
});

redis.on('connect', () => {
  redisConnected = true;
  logger.log('Redis connected');
});

// Safe Redis operations that won't hang
async function safeRedisDelete(key: string): Promise<void> {
  if (!redisConnected) return;
  try {
    await Promise.race([
      redis.del(key),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redis operation timed out')), 1000)
      )
    ]);
  } catch (error) {
    logger.warn(`Redis del operation failed for key ${key}:`, error);
  }
}

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
      // Invalidate cache safely
      await safeRedisDelete(`cart_items:${createDto.customer_id}`);
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
      // Invalidate cache safely
      if (updatedItem) {
        await safeRedisDelete(`cart_items:${updatedItem.customer_id}`);
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
        await safeRedisDelete(`cart_items:${item.customer_id}`);
      }
      return result.affected > 0;
    } catch (error) {
      logger.error('Error removing cart item:', error);
      throw error;
    }
  }
}
