import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, FindOptionsWhere, In } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { AddressBook } from 'src/address_book/entities/address_book.entity';
import { FoodCategory } from 'src/food_categories/entities/food_category.entity';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { createClient } from 'redis';

const logger = new Logger('OrdersService');

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

// Improved Redis connection handling
redis.connect().catch(err => {
  logger.error('Redis connection error:', err);
});

redis.on('error', err => {
  logger.error('Redis client error:', err);
});

redis.on('connect', () => {
  logger.log('Redis client connected');
});

redis.on('ready', () => {
  logger.log('Redis client ready');
});

@Injectable()
export class CustomersRepository {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(AddressBook)
    private readonly addressRepository: Repository<AddressBook>,
    @InjectRepository(FoodCategory)
    private readonly foodCategoryRepository: Repository<FoodCategory>,
    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,
    private readonly dataSource: DataSource
  ) {}

  async save(customer: Customer): Promise<Customer> {
    const savedCustomer = await this.customerRepository.save(customer);
    await redis.del(`customer:${customer.id}`);
    await redis.del(`customer:user:${customer.user_id}`);
    return savedCustomer;
  }

  async create(createCustomerDto: CreateCustomerDto): Promise<Customer> {
    const {
      address_ids = [],
      preferred_category_ids = [],
      favorite_restaurant_ids = [],
      ...customerData
    } = createCustomerDto;

    const customer = new Customer();
    Object.assign(customer, {
      ...customerData,
      address: [],
      preferred_category: [],
      favorite_restaurants: [],
      created_at: Math.floor(Date.now() / 1000),
      updated_at: Math.floor(Date.now() / 1000)
    });

    if (address_ids.length > 0) {
      const addresses = await this.addressRepository.findBy({
        id: In(address_ids)
      });
      customer.address = addresses;
    }

    if (preferred_category_ids.length > 0) {
      const categories = await this.foodCategoryRepository.findBy({
        id: In(preferred_category_ids)
      });
      customer.preferred_category = categories;
    }

    if (favorite_restaurant_ids.length > 0) {
      const restaurants = await this.restaurantRepository.findBy({
        id: In(favorite_restaurant_ids)
      });
      customer.favorite_restaurants = restaurants;
    }

    return await this.customerRepository.save(customer);
  }

  async findAll(): Promise<Customer[]> {
    return await this.customerRepository.find({
      select: {
        id: true,
        user_id: true,
        first_name: true,
        last_name: true,
        avatar: true,
        last_login: true,
        user: {
          email: true
        }
      },
      relations: ['user'],
      loadEagerRelations: true
    });
  }

  async findById(customerId: string): Promise<Customer | null> {
    return this.dataSource
      .createQueryBuilder(Customer, 'customer')
      .leftJoinAndSelect('customer.address', 'address')
      .leftJoinAndSelect('customer.preferred_category', 'preferred_category') // Added to load preferred_category
      .where('customer.id = :customerId', { customerId })
      .getOne();
  }
  async findByIdWithFavoriterRestaurants(
    customerId: string
  ): Promise<Customer | null> {
    return this.dataSource
      .createQueryBuilder(Customer, 'customer')
      .leftJoinAndSelect('customer.favorite_restaurants', 'favoriteRestaurants')
      .where('customer.id = :customerId', { customerId })
      .getOne();
  }

  async findByUserId(userId: string): Promise<Customer> {
    const cacheKey = `customer:user:${userId}`;

    try {
      // Check if Redis is connected before trying to use it
      if (redis.isReady) {
        const cached = await redis.get(cacheKey);
        console.log('check cached', cached);
        if (cached) {
          console.log('Returning customer from cache');
          return JSON.parse(cached);
        }
      } else {
        console.warn('Redis is not ready, skipping cache read');
      }
    } catch (cacheError) {
      console.warn('Redis cache read error:', cacheError);
      // Continue to database query if cache fails
    }

    console.log('Fetching customer from database for userId:', userId);
    const startTime = Date.now();

    try {
      const customer = await this.customerRepository.findOne({
        where: { user_id: userId }
        // Removed relations to speed up the query for login
        // relations: ['address']
      });

      const queryTime = Date.now() - startTime;
      console.log(
        `Database query completed in ${queryTime}ms for userId: ${userId}`
      );

      return await this.handleCustomerResult(customer, cacheKey, queryTime);
    } catch (dbError) {
      const queryTime = Date.now() - startTime;
      console.error(
        `Database query failed after ${queryTime}ms for userId: ${userId}`,
        dbError
      );
      throw dbError;
    }
  }

  private async handleCustomerResult(
    customer: Customer,
    cacheKey: string,
    queryTime: number
  ): Promise<Customer> {
    if (customer) {
      try {
        // Try to cache the result only if Redis is ready
        if (redis.isReady) {
          await redis.setEx(cacheKey, 3600, JSON.stringify(customer));
          console.log(
            `Customer cached successfully (query took ${queryTime}ms)`
          );
        } else {
          console.warn('Redis is not ready, skipping cache write');
        }
      } catch (cacheError) {
        console.warn('Redis cache write error:', cacheError);
        // Don't fail if caching fails
      }
    }

    console.log(
      `Returning customer from database (${queryTime}ms):`,
      customer ? 'Found' : 'Not found'
    );
    return customer;
  }

  async update(
    id: string,
    updateCustomerDto: UpdateCustomerDto
  ): Promise<Customer> {
    const customer = await this.findById(id);
    if (!customer) {
      return null;
    }

    const {
      address_ids,
      preferred_category_ids,
      favorite_restaurant_ids,
      ...updateData
    } = updateCustomerDto;

    if (address_ids?.length) {
      const addresses = await this.addressRepository.findBy({
        id: In(address_ids)
      });
      customer.address = addresses;
    }

    if (preferred_category_ids?.length) {
      const categories = await this.foodCategoryRepository.findBy({
        id: In(preferred_category_ids)
      });
      customer.preferred_category = categories;
    }

    if (favorite_restaurant_ids?.length) {
      const restaurants = await this.restaurantRepository.findBy({
        id: In(favorite_restaurant_ids)
      });
      customer.favorite_restaurants = restaurants;
    }

    Object.assign(customer, updateData);
    customer.updated_at = Math.floor(Date.now() / 1000);

    const updatedCustomer = await this.customerRepository.save(customer);
    await redis.del(`customer:${id}`);
    await redis.del(`customer:user:${customer.user_id}`);
    return updatedCustomer;
  }

  async remove(id: string): Promise<void> {
    const customer = await this.findById(id);
    await this.customerRepository.delete(id);
    if (customer) {
      await redis.del(`customer:${id}`);
      await redis.del(`customer:user:${customer.user_id}`);
    }
  }

  async findOneBy(conditions: Partial<Customer>): Promise<Customer | null> {
    return await this.customerRepository.findOne({
      where: conditions as unknown as FindOptionsWhere<Customer>,
      select: ['id', 'user_id']
    });
  }

  async findAllPaginated(
    skip: number,
    limit: number
  ): Promise<[Customer[], number]> {
    return await this.customerRepository.findAndCount({
      skip,
      take: limit,
      relations: ['user']
    });
  }
}
