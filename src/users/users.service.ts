import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { Customer } from 'src/customers/entities/customer.entity';
import { Driver } from 'src/drivers/entities/driver.entity';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { CustomerCare } from 'src/customer_cares/entities/customer_care.entity';
import { Admin } from 'src/admin/entities/admin.entity';
import { createResponse, ApiResponse } from 'src/utils/createResponse';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRepository } from './users.repository';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { Enum_UserType } from 'src/types/Payload';

export interface SearchParams {
  query?: string;
  userType?: 'customer' | 'driver' | 'restaurant' | 'customer_care' | 'admin';
  page?: number;
  limit?: number;
}

export interface SearchResult {
  id: string;
  type: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  restaurant_name?: string;
  owner_name?: string;
  user_email?: string;
  created_at: number;
  last_login?: number;
}

@Injectable()
export class UsersService {
  constructor(
    private userRepository: UserRepository,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(Driver)
    private driverRepository: Repository<Driver>,
    @InjectRepository(Restaurant)
    private restaurantRepository: Repository<Restaurant>,
    @InjectRepository(CustomerCare)
    private customerCareRepository: Repository<CustomerCare>,
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>,
    private dataSource: DataSource
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<ApiResponse<User>> {
    try {
      const existingUser = await this.userRepository.findByEmail(
        createUserDto.email
      );

      if (existingUser) {
        return createResponse('DuplicatedRecord', null, 'User already exists');
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

      const savedUser = await this.userRepository.create({
        ...createUserDto,
        id: `USR_${uuidv4()}`,
        password: hashedPassword,
        verification_code: 0,
        user_type: createUserDto.user_type || [Enum_UserType.CUSTOMER]
      });

      return createResponse('OK', savedUser, 'User created successfully');
    } catch (error: any) {
      console.log('error', error);
      return createResponse('ServerError', null, 'Error creating user');
    }
  }

  async findAll(): Promise<ApiResponse<User[]>> {
    try {
      const users = await this.userRepository.findAll();
      return createResponse('OK', users, 'Users retrieved successfully');
    } catch (error: any) {
      console.log('error', error);
      return createResponse('ServerError', null, 'Error fetching users');
    }
  }

  async findById(id: string): Promise<ApiResponse<User>> {
    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        return createResponse('NotFound', null, 'User not found');
      }
      return createResponse('OK', user, 'User retrieved successfully');
    } catch (error: any) {
      console.log('error', error);
      return createResponse('ServerError', null, 'Error fetching user');
    }
  }

  async findByCondition(condition: {
    [key: string]: any;
  }): Promise<ApiResponse<User>> {
    try {
      const user = await this.userRepository.findOne({ where: condition });
      if (!user) {
        return createResponse('NotFound', null, 'User not found');
      }
      return createResponse('OK', user, 'User retrieved successfully');
    } catch (error: any) {
      console.log('error', error);
      return createResponse('ServerError', null, 'Error fetching user');
    }
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto
  ): Promise<ApiResponse<User>> {
    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        return createResponse('NotFound', null, 'User not found');
      }

      await this.userRepository.update(id, updateUserDto);
      const updatedUser = await this.userRepository.findById(id);
      return createResponse('OK', updatedUser, 'User updated successfully');
    } catch (error: any) {
      console.log('error', error);
      return createResponse('ServerError', null, 'Error updating user');
    }
  }

  async remove(id: string): Promise<ApiResponse<null>> {
    try {
      const result = await this.userRepository.delete(id);
      if (result.affected === 0) {
        return createResponse('NotFound', null, 'User not found');
      }
      return createResponse('OK', null, 'User deleted successfully');
    } catch (error: any) {
      console.log('error', error);
      return createResponse('ServerError', null, 'Error deleting user');
    }
  }

  async searchUsers(params: SearchParams): Promise<
    ApiResponse<{
      results: SearchResult[];
      totalCount: number;
      currentPage: number;
      totalPages: number;
    }>
  > {
    try {
      const { query = '', userType, page = 1, limit = 20 } = params;
      const offset = (page - 1) * limit;

      // If no query provided, return empty results
      if (!query.trim()) {
        return createResponse(
          'OK',
          {
            results: [],
            totalCount: 0,
            currentPage: page,
            totalPages: 0
          },
          'No search query provided'
        );
      }

      const searchTerm = `%${query.toLowerCase()}%`;
      let results: SearchResult[] = [];
      let totalCount = 0;

      if (!userType) {
        // Search all tables
        const [
          customerResults,
          driverResults,
          restaurantResults,
          customerCareResults,
          adminResults
        ] = await Promise.all([
          this.searchCustomers(searchTerm, offset, limit),
          this.searchDrivers(searchTerm, offset, limit),
          this.searchRestaurants(searchTerm, offset, limit),
          this.searchCustomerCares(searchTerm, offset, limit),
          this.searchAdmins(searchTerm, offset, limit)
        ]);

        results = [
          ...customerResults.results,
          ...driverResults.results,
          ...restaurantResults.results,
          ...customerCareResults.results,
          ...adminResults.results
        ];

        totalCount =
          customerResults.count +
          driverResults.count +
          restaurantResults.count +
          customerCareResults.count +
          adminResults.count;

        // Sort by relevance (exact matches first, then by creation date)
        results.sort((a, b) => {
          const aExactMatch = this.isExactMatch(a, query);
          const bExactMatch = this.isExactMatch(b, query);

          if (aExactMatch && !bExactMatch) return -1;
          if (!aExactMatch && bExactMatch) return 1;

          return b.created_at - a.created_at;
        });

        // Apply pagination to combined results
        results = results.slice(0, limit);
      } else {
        // Search specific table
        switch (userType) {
          case 'customer':
            const customerData = await this.searchCustomers(
              searchTerm,
              offset,
              limit
            );
            results = customerData.results;
            totalCount = customerData.count;
            break;
          case 'driver':
            const driverData = await this.searchDrivers(
              searchTerm,
              offset,
              limit
            );
            results = driverData.results;
            totalCount = driverData.count;
            break;
          case 'restaurant':
            const restaurantData = await this.searchRestaurants(
              searchTerm,
              offset,
              limit
            );
            results = restaurantData.results;
            totalCount = restaurantData.count;
            break;
          case 'customer_care':
            const customerCareData = await this.searchCustomerCares(
              searchTerm,
              offset,
              limit
            );
            results = customerCareData.results;
            totalCount = customerCareData.count;
            break;
          case 'admin':
            const adminData = await this.searchAdmins(
              searchTerm,
              offset,
              limit
            );
            results = adminData.results;
            totalCount = adminData.count;
            break;
        }
      }

      const totalPages = Math.ceil(totalCount / limit);

      return createResponse(
        'OK',
        {
          results,
          totalCount,
          currentPage: page,
          totalPages
        },
        `Found ${results.length} results`
      );
    } catch (error) {
      console.error('Error searching users:', error);
      return createResponse('ServerError', null, 'Error searching users');
    }
  }

  private async searchCustomers(
    searchTerm: string,
    offset: number,
    limit: number
  ): Promise<{ results: SearchResult[]; count: number }> {
    const queryBuilder = this.customerRepository
      .createQueryBuilder('customer')
      .leftJoinAndSelect('customer.user', 'user')
      .where(
        `(
        LOWER(customer.first_name) LIKE :searchTerm OR
        LOWER(customer.last_name) LIKE :searchTerm OR
        LOWER(customer.phone) LIKE :searchTerm OR
        LOWER(customer.id) LIKE :searchTerm OR
        LOWER(user.email) LIKE :searchTerm
      )`,
        { searchTerm }
      )
      .orderBy('customer.created_at', 'DESC');

    const [customers, count] = await queryBuilder
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    const results: SearchResult[] = customers.map(customer => ({
      id: customer.id,
      type: 'customer',
      first_name: customer.first_name,
      last_name: customer.last_name,
      phone: customer.phone,
      user_email: customer.user?.email,
      avatar: customer.avatar,
      created_at: customer.created_at,
      last_login: customer.last_login
    }));

    return { results, count };
  }

  private async searchDrivers(
    searchTerm: string,
    offset: number,
    limit: number
  ): Promise<{ results: SearchResult[]; count: number }> {
    const queryBuilder = this.driverRepository
      .createQueryBuilder('driver')
      .leftJoinAndSelect('driver.user', 'user')
      .where(
        `(
        LOWER(driver.first_name) LIKE :searchTerm OR
        LOWER(driver.last_name) LIKE :searchTerm OR
        LOWER(driver.id) LIKE :searchTerm OR
        LOWER(user.email) LIKE :searchTerm OR
        LOWER(driver.contact_phone::text) LIKE :searchTerm OR
        LOWER(driver.contact_email::text) LIKE :searchTerm
      )`,
        { searchTerm }
      )
      .orderBy('driver.created_at', 'DESC');

    const [drivers, count] = await queryBuilder
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    const results: SearchResult[] = drivers.map(driver => {
      const defaultPhone = driver.contact_phone?.find(
        p => p.is_default
      )?.number;
      const defaultEmail = driver.contact_email?.find(e => e.is_default)?.email;

      return {
        id: driver.id,
        type: 'driver',
        first_name: driver.first_name,
        last_name: driver.last_name,
        phone: defaultPhone,
        email: defaultEmail,
        user_email: driver.user?.email,
        created_at: driver.created_at,
        avatar: driver.avatar,
        last_login: driver.last_login
      };
    });

    return { results, count };
  }

  private async searchRestaurants(
    searchTerm: string,
    offset: number,
    limit: number
  ): Promise<{ results: SearchResult[]; count: number }> {
    const queryBuilder = this.restaurantRepository
      .createQueryBuilder('restaurant')
      .leftJoinAndSelect('restaurant.owner', 'user')
      .where(
        `(
        LOWER(restaurant.restaurant_name) LIKE :searchTerm OR
        LOWER(restaurant.owner_name) LIKE :searchTerm OR
        LOWER(restaurant.id) LIKE :searchTerm OR
        LOWER(user.email) LIKE :searchTerm OR
        LOWER(restaurant.contact_phone::text) LIKE :searchTerm OR
        LOWER(restaurant.contact_email::text) LIKE :searchTerm
      )`,
        { searchTerm }
      )
      .orderBy('restaurant.created_at', 'DESC');

    const [restaurants, count] = await queryBuilder
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    const results: SearchResult[] = restaurants.map(restaurant => {
      const defaultPhone = restaurant.contact_phone?.find(
        p => p.is_default
      )?.number;
      const defaultEmail = restaurant.contact_email?.find(
        e => e.is_default
      )?.email;

      return {
        id: restaurant.id,
        type: 'restaurant',
        restaurant_name: restaurant.restaurant_name,
        owner_name: restaurant.owner_name,
        phone: defaultPhone,
        email: defaultEmail,
        avatar: restaurant.avatar,

        user_email: restaurant.owner?.email,
        created_at: restaurant.created_at,
        last_login: restaurant.last_login
      };
    });

    return { results, count };
  }

  private async searchCustomerCares(
    searchTerm: string,
    offset: number,
    limit: number
  ): Promise<{ results: SearchResult[]; count: number }> {
    const queryBuilder = this.customerCareRepository
      .createQueryBuilder('customer_care')
      .leftJoinAndSelect('customer_care.user_id', 'user')
      .where(
        `(
        LOWER(customer_care.first_name) LIKE :searchTerm OR
        LOWER(customer_care.last_name) LIKE :searchTerm OR
        LOWER(customer_care.id) LIKE :searchTerm OR
        LOWER(user.email) LIKE :searchTerm OR
        LOWER(customer_care.contact_phone::text) LIKE :searchTerm OR
        LOWER(customer_care.contact_email::text) LIKE :searchTerm
      )`,
        { searchTerm }
      )
      .orderBy('customer_care.created_at', 'DESC');

    const [customerCares, count] = await queryBuilder
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    const results: SearchResult[] = customerCares.map(customerCare => {
      const defaultPhone = customerCare.contact_phone?.find(
        p => p.is_default
      )?.number;
      const defaultEmail = customerCare.contact_email?.find(
        e => e.is_default
      )?.email;

      return {
        id: customerCare.id,
        type: 'customer_care',
        first_name: customerCare.first_name,
        last_name: customerCare.last_name,
        phone: defaultPhone,
        avatar: customerCare.avatar,
        email: defaultEmail,
        user_email: customerCare.user_id?.email,
        created_at: customerCare.created_at,
        last_login: customerCare.last_login
      };
    });

    return { results, count };
  }

  private async searchAdmins(
    searchTerm: string,
    offset: number,
    limit: number
  ): Promise<{ results: SearchResult[]; count: number }> {
    const queryBuilder = this.adminRepository
      .createQueryBuilder('admin')
      .leftJoinAndSelect('admin.user', 'user')
      .where(
        `(
        LOWER(admin.first_name) LIKE :searchTerm OR
        LOWER(admin.last_name) LIKE :searchTerm OR
        LOWER(admin.id) LIKE :searchTerm OR
        LOWER(user.email) LIKE :searchTerm
      )`,
        { searchTerm }
      )
      .orderBy('admin.created_at', 'DESC');

    const [admins, count] = await queryBuilder
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    const results: SearchResult[] = admins.map(admin => ({
      id: admin.id,
      type: 'admin',
      first_name: admin.first_name,
      last_name: admin.last_name,
      user_email: admin.user?.email,
      avatar: admin.avatar,
      created_at: admin.created_at,
      last_login: admin.last_login
    }));

    return { results, count };
  }

  private isExactMatch(result: SearchResult, query: string): boolean {
    const lowerQuery = query.toLowerCase();
    return (
      result.first_name?.toLowerCase() === lowerQuery ||
      result.last_name?.toLowerCase() === lowerQuery ||
      result.email?.toLowerCase() === lowerQuery ||
      result.user_email?.toLowerCase() === lowerQuery ||
      result.phone === query ||
      result.id.toLowerCase() === lowerQuery ||
      result.restaurant_name?.toLowerCase() === lowerQuery
    );
  }
}
