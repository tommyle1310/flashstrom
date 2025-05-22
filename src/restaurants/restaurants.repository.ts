import { Injectable } from '@nestjs/common';
import { Repository, DeepPartial } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Restaurant } from './entities/restaurant.entity';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { FoodCategory } from '../food_categories/entities/food_category.entity';
import { createResponse } from 'src/utils/createResponse';
import { UserRepository } from 'src/users/users.repository';
import { AddressBookRepository } from 'src/address_book/address_book.repository';
import { Promotion } from 'src/promotions/entities/promotion.entity';
import { createClient } from 'redis';
import { Logger } from '@nestjs/common';

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redis.connect().catch(err => console.error('Redis connection error:', err));

const logger = new Logger('RestaurantsRepository');

@Injectable()
export class RestaurantsRepository {
  constructor(
    @InjectRepository(Restaurant)
    public repository: Repository<Restaurant>,
    @InjectRepository(FoodCategory)
    private foodCategoryRepository: Repository<FoodCategory>,
    private userRepository: UserRepository,
    private addressRepository: AddressBookRepository
  ) {}

  async findOne(conditions: any): Promise<Restaurant> {
    console.log(
      'Restaurant findOne conditions:',
      JSON.stringify(conditions, null, 2)
    );
    const { where, relations } = conditions; // Tách where và relations
    const result = await this.repository.findOne({
      where: where || conditions, // Nếu không có where, dùng conditions (hỗ trợ cú pháp cũ)
      relations: relations || ['promotions', 'promotions.food_categories'] // Default relations
    });
    console.log('Restaurant findOne result:', JSON.stringify(result, null, 2));
    return result;
  }

  async create(
    createDto: CreateRestaurantDto & { specialize_in?: FoodCategory[] }
  ): Promise<any> {
    const owner = await this.userRepository.findById(createDto.owner_id);
    if (!owner) return createResponse('NotFound', null, 'Owner not found');

    // const address = await this.addressRepository.findById(createDto.address_id);
    // if (!address) return createResponse('NotFound', null, 'Address not found');

    const specialize_in = createDto.specialize_in || [];
    const promotions =
      createDto.promotions && createDto.promotions.length > 0
        ? await this.repository.manager
            .getRepository(Promotion)
            .findByIds(createDto.promotions)
        : [];

    const restaurantData: DeepPartial<Restaurant> = {
      owner_id: createDto.owner_id,
      owner_name: createDto.owner_name,
      // address_id: createDto?.address_id || undefined,
      restaurant_name: createDto.restaurant_name,
      description: createDto.description,
      contact_email: createDto.contact_email,
      contact_phone: createDto.contact_phone,
      avatar: createDto.avatar,
      images_gallery: createDto.images_gallery || [],
      status: createDto.status,
      promotions,
      ratings: createDto.ratings,
      opening_hours: createDto.opening_hours,
      specialize_in,
      created_at: Math.floor(Date.now() / 1000),
      updated_at: Math.floor(Date.now() / 1000)
    };
    console.log('restaurantData', restaurantData);

    const restaurant = this.repository.create(restaurantData);
    const savedRestaurant = await this.repository.save(restaurant, {
      reload: true
    });
    return savedRestaurant;
  }

  async findAll(): Promise<Restaurant[]> {
    const result = await this.repository
      .createQueryBuilder('restaurant')
      .leftJoin(
        'banned_accounts',
        'ban',
        'ban.entity_id = restaurant.id AND ban.entity_type = :entityType',
        {
          entityType: 'Restaurant'
        }
      )
      .addSelect(
        'CASE WHEN ban.id IS NOT NULL THEN true ELSE false END',
        'restaurant_is_banned'
      )
      .leftJoinAndSelect('restaurant.owner', 'owner')
      .leftJoinAndSelect('restaurant.address', 'address')
      .leftJoinAndSelect('restaurant.specialize_in', 'specialize_in')
      .getRawAndEntities();

    return result.entities.map((restaurant, index) => {
      (restaurant as any).is_banned =
        result.raw[index]?.restaurant_is_banned || false;
      return restaurant;
    });
  }

  async findById(id: string): Promise<Restaurant> {
    const restaurant = await this.repository.findOne({
      where: { id },
      relations: ['owner', 'promotions', 'specialize_in']
    });

    if (restaurant) {
      logger.log('Restaurant found:', {
        id: restaurant.id,
        owner_id: restaurant.owner_id,
        owner: restaurant.owner
      });

      // Check banned status separately if needed
      const bannedResult = await this.repository
        .createQueryBuilder('restaurant')
        .leftJoin(
          'banned_accounts',
          'ban',
          'ban.entity_id = restaurant.id AND ban.entity_type = :entityType',
          {
            entityType: 'Restaurant'
          }
        )
        .addSelect(
          'CASE WHEN ban.id IS NOT NULL THEN true ELSE false END',
          'restaurant_is_banned'
        )
        .where('restaurant.id = :id', { id })
        .getRawOne();

      (restaurant as any).is_banned =
        bannedResult?.restaurant_is_banned || false;
    } else {
      logger.warn(`No restaurant found with id: ${id}`);
    }

    return restaurant || null;
  }

  async findByOwnerId(ownerId: string): Promise<Restaurant> {
    try {
      // First try with a simpler query without problematic relations
      return await this.repository.findOne({
        where: { owner_id: ownerId },
        relations: ['owner', 'address', 'specialize_in']
      });
    } catch (error) {
      console.error('Error in findByOwnerId:', error);
      // Fallback with just the minimal data needed
      return await this.repository.findOne({
        where: { owner_id: ownerId }
      });
    }
  }

  async update(
    id: string,
    updateDto: UpdateRestaurantDto & { specialize_in?: FoodCategory[] }
  ): Promise<Restaurant> {
    const specialize_in = updateDto.specialize_in;
    const promotions =
      updateDto.promotions && updateDto.promotions.length > 0
        ? await this.repository.manager
            .getRepository(Promotion)
            .findByIds(updateDto.promotions)
        : undefined;

    const updateData: DeepPartial<Restaurant> = {
      ...updateDto,
      promotions,
      updated_at: Math.floor(Date.now() / 1000)
    };

    delete updateData.address;
    delete updateData.owner;
    delete updateData.specialize_in;

    if (updateData.images_gallery === undefined)
      delete updateData.images_gallery;
    if (updateData.promotions === undefined) delete updateData.promotions;

    await this.repository.update(id, updateData);
    const updatedRestaurant = await this.findById(id);

    if (specialize_in && specialize_in.length > 0) {
      updatedRestaurant.specialize_in = specialize_in;
      await this.repository.save(updatedRestaurant);
    }

    return updatedRestaurant;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected > 0;
  }

  async findByCondition(condition: any): Promise<Restaurant> {
    return await this.repository.findOne({
      where: condition,
      relations: ['owner', 'address', 'specialize_in']
    });
  }

  async updateImgGallery(
    id: string,
    imagesGallery: Array<{ key: string; url: string }>
  ): Promise<Restaurant> {
    const restaurant = await this.findById(id);
    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    const updatedImagesGallery = [
      ...(Array.isArray(restaurant.images_gallery)
        ? restaurant.images_gallery
        : []),
      ...imagesGallery
    ];

    await this.repository.update(id, {
      images_gallery: updatedImagesGallery,
      updated_at: Math.floor(Date.now() / 1000)
    });

    return await this.findById(id);
  }

  // Hàm mới để tăng total_orders
  async incrementTotalOrders(restaurantId: string): Promise<void> {
    const restaurant = await this.repository.findOne({
      where: { id: restaurantId }
    });
    if (!restaurant) {
      throw new Error(`Restaurant with ID ${restaurantId} not found`);
    }
    await this.repository.update(restaurantId, {
      total_orders: restaurant.total_orders + 1,
      updated_at: Math.floor(Date.now() / 1000)
    });
  }

  async findAllPaginated(
    skip: number,
    limit: number
  ): Promise<[Restaurant[], number]> {
    const result = await this.repository
      .createQueryBuilder('restaurant')
      .leftJoin(
        'banned_accounts',
        'ban',
        'ban.entity_id = restaurant.id AND ban.entity_type = :entityType',
        {
          entityType: 'Restaurant'
        }
      )
      .addSelect(
        'CASE WHEN ban.id IS NOT NULL THEN true ELSE false END',
        'restaurant_is_banned'
      )
      .leftJoinAndSelect('restaurant.owner', 'owner')
      .leftJoinAndSelect('restaurant.address', 'address')
      .leftJoinAndSelect('restaurant.specialize_in', 'specialize_in')
      .skip(skip)
      .take(limit)
      .getRawAndEntities();

    const restaurants = result.entities.map((restaurant, index) => {
      (restaurant as any).is_banned =
        result.raw[index]?.restaurant_is_banned || false;
      return restaurant;
    });

    const total = await this.repository.count();
    return [restaurants, total];
  }
}
