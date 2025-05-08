// menu_items.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Equal, In } from 'typeorm';
import { MenuItem } from './entities/menu_item.entity';

@Injectable()
export class MenuItemsRepository {
  constructor(
    @InjectRepository(MenuItem)
    private menuItemRepository: Repository<MenuItem>
  ) {}

  async findByIds(ids: string[]): Promise<MenuItem[]> {
    return this.menuItemRepository.find({
      where: { id: In(ids) },
      select: ['id', 'price', 'restaurant_id', 'avatar', 'name', 'variants']
    });
  }

  async create(data: Partial<MenuItem>): Promise<MenuItem> {
    const menuItem = this.menuItemRepository.create(data);
    return this.menuItemRepository.save(menuItem);
  }

  async findById(id: string): Promise<MenuItem> {
    console.log('findById with id:', id);
    return this.menuItemRepository.findOne({
      where: { id: Equal(id) },
      relations: ['variants', 'restaurant']
    });
  }

  async findOne(conditions: any): Promise<MenuItem> {
    console.log('findOne conditions:', JSON.stringify(conditions, null, 2));
    const { where, relations } = conditions; // Tách where và relations
    const result = await this.menuItemRepository.findOne({
      where: where || conditions, // Nếu không có where, dùng conditions (cho trường hợp cũ)
      relations: relations || ['variants', 'restaurant'] // Default relations
    });
    console.log('findOne result:', JSON.stringify(result, null, 2));
    return result;
  }

  async findAll(): Promise<MenuItem[]> {
    return this.menuItemRepository.find({ relations: ['variants'] });
  }

  async findByRestaurantId(restaurantId: string): Promise<MenuItem[]> {
    console.log('Finding menu items for restaurant:', restaurantId);

    const result = await this.menuItemRepository
      .createQueryBuilder('menuItem')
      .leftJoinAndSelect('menuItem.variants', 'variants')
      .where('menuItem.restaurant_id = :restaurantId', { restaurantId })
      .getMany();

    console.log(
      `Found ${result?.length || 0} menu items for restaurant ${restaurantId}`
    );

    return result || [];
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

  async findAllPaginated(
    skip: number,
    limit: number
  ): Promise<[MenuItem[], number]> {
    return this.menuItemRepository.findAndCount({
      skip,
      take: limit,
      relations: ['variants', 'restaurant']
    });
  }
}
