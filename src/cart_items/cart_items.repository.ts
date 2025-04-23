import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
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
    private repository: Repository<CartItem>
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

  async findByCustomerId(customerId: string): Promise<CartItem[]> {
    const cacheKey = `cart_items:${customerId}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    const items = await this.repository.find({
      where: { customer_id: Equal(customerId) },
      select: ['id', 'customer_id', 'item_id', 'variants'],
      take: 50 // Giới hạn 50 bản ghi
    });
    await redis.setEx(cacheKey, 600, JSON.stringify(items));
    return items;
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
