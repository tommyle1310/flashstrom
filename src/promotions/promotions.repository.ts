import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promotion } from './entities/promotion.entity';
// import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';

@Injectable()
export class PromotionsRepository {
  constructor(
    @InjectRepository(Promotion)
    public promotionRepository: Repository<Promotion>
  ) {}

  async create(promotionData: Partial<Promotion>): Promise<Promotion> {
    const newPromotion = this.promotionRepository.create({
      ...promotionData,
      food_category_ids: promotionData.food_category_ids || []
    });
    return this.promotionRepository.save(newPromotion);
  }

  async findAll(options?: { relations?: string[] }): Promise<Promotion[]> {
    const queryBuilder =
      this.promotionRepository.createQueryBuilder('promotion');

    if (options?.relations?.includes('restaurants')) {
      queryBuilder
        .leftJoinAndSelect('promotion.restaurants', 'restaurants')
        .leftJoin('promotion.restaurants', 'restaurant_promotions'); // Đảm bảo join đúng bảng trung gian
    }

    return queryBuilder.getMany();
  }

  async findById(id: string): Promise<Promotion | null> {
    return this.promotionRepository.findOne({ where: { id } });
  }

  async findByIdWithRestaurants(id: string): Promise<Promotion | null> {
    const queryBuilder = this.promotionRepository
      .createQueryBuilder('promotion')
      .leftJoin('restaurant_promotions', 'rp', 'rp.promotion_id = promotion.id')
      .leftJoin(
        'restaurants',
        'restaurants',
        'restaurants.id = rp.restaurant_id'
      )
      .leftJoin(
        'address_books',
        'address',
        'address.id = restaurants.address_id'
      )
      .select([
        'promotion.id',
        'promotion.name',
        'promotion.description',
        'promotion.start_date',
        'promotion.end_date',
        'promotion.discount_type',
        'promotion.discount_value',
        'promotion.promotion_cost_price',
        'promotion.minimum_order_value',
        'promotion.avatar',
        'promotion.status',
        'promotion.bogo_details',
        'promotion.created_at',
        'promotion.updated_at',
        'restaurants.id',
        'restaurants.restaurant_name',
        'restaurants.avatar',
        'restaurants.ratings',
        'restaurants.status',
        'address.id',
        'address.street',
        'address.city',
        'address.nationality',
        'address.postal_code',
        'address.location',
        'address.title'
      ])
      .where('promotion.id = :id', { id });

    const { entities, raw } = await queryBuilder.getRawAndEntities();

    if (!entities.length) {
      return null;
    }

    const promotion = entities[0];
    const restaurants = raw
      .map(row => ({
        id: row.restaurants_id,
        restaurant_name: row.restaurants_restaurant_name,
        avatar: row.restaurants_avatar,
        ratings: row.restaurants_ratings,
        status: row.restaurants_status,
        address: row.address_id
          ? {
              id: row.address_id,
              street: row.address_street,
              city: row.address_city,
              nationality: row.address_nationality,
              postal_code: row.address_postal_code,
              location: row.address_location,
              title: row.address_title
            }
          : null
      }))
      .filter(restaurant => restaurant.id); // Filter out null restaurants

    return {
      ...promotion,
      restaurants: restaurants as Restaurant[]
    };
  }

  async findByName(name: string): Promise<Promotion | null> {
    return this.promotionRepository.findOne({ where: { name } });
  }

  async update(
    id: string,
    updatePromotionDto: UpdatePromotionDto
  ): Promise<Promotion | null> {
    await this.promotionRepository.update(id, {
      ...updatePromotionDto,
      food_category_ids: updatePromotionDto.food_category_ids
    });
    return this.findById(id);
  }

  async delete(id: string): Promise<{ affected?: number }> {
    return this.promotionRepository.delete(id);
  }

  async findByIds(ids: string[]): Promise<Promotion[]> {
    return await this.promotionRepository.findByIds(ids);
  }

  async findAllPaginated(
    skip: number,
    limit: number
  ): Promise<[Promotion[], number]> {
    return this.promotionRepository.findAndCount({
      skip,
      take: limit,
      relations: ['restaurants']
    });
  }
}
