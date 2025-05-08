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
redis.connect().catch(err => logger.error('Redis connection error:', err));

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
    const cached = await redis.get(cacheKey);
    console.log('echck cached', cached);
    if (cached) {
      return JSON.parse(cached);
    }
    const customer = await this.customerRepository.findOne({
      where: { user_id: userId },
      relations: ['address']
      // select: ['id', 'user_id']
    });

    if (customer) {
      await redis.setEx(cacheKey, 3600, JSON.stringify(customer));
    }
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
