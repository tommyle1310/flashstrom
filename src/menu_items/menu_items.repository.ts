// menu_items.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Equal } from 'typeorm';
import { MenuItem } from './entities/menu_item.entity';

@Injectable()
export class MenuItemsRepository {
  constructor(
    @InjectRepository(MenuItem)
    private menuItemRepository: Repository<MenuItem>
  ) {}

  async create(data: Partial<MenuItem>): Promise<MenuItem> {
    const menuItem = this.menuItemRepository.create(data);
    return this.menuItemRepository.save(menuItem);
  }

  async findById(id: string): Promise<MenuItem> {
    console.log('findById with id:', id);
    return this.menuItemRepository.findOne({
      where: { id: Equal(id) },
      relations: ['variants', 'restaurant'],
    });
  }

  async findOne(conditions: any): Promise<MenuItem> {
    console.log('findOne conditions:', JSON.stringify(conditions, null, 2));
    const { where, relations } = conditions; // Tách where và relations
    const result = await this.menuItemRepository.findOne({
      where: where || conditions, // Nếu không có where, dùng conditions (cho trường hợp cũ)
      relations: relations || ['variants', 'restaurant'], // Default relations
    });
    console.log('findOne result:', JSON.stringify(result, null, 2));
    return result;
  }

  async findAll(): Promise<MenuItem[]> {
    return this.menuItemRepository.find({ relations: ['variants'] });
  }

  async findByRestaurantId(restaurantId: string): Promise<MenuItem[]> {
    return this.menuItemRepository.find({
      where: { restaurant_id: Equal(restaurantId) },
      relations: ['variants'],
    });
  }

  async update(id: string, data: Partial<MenuItem>): Promise<MenuItem> {
    await this.menuItemRepository
      .createQueryBuilder()
      .update(MenuItem)
      .set(data)
      .where('id = :id', { id })
      .execute();
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.menuItemRepository.delete(id);
  }

  async save(menuItem: MenuItem): Promise<MenuItem> {
    return this.menuItemRepository.save(menuItem);
  }
}