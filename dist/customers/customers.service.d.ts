import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer } from './entities/customer.entity';
import { ApiResponse } from 'src/utils/createResponse';
import { UserRepository } from '../users/users.repository';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { RestaurantsRepository } from 'src/restaurants/restaurants.repository';
import { CustomersRepository } from './customers.repository';
import { DataSource } from 'typeorm';
export interface AddressPopulate {
    id?: string;
    street?: string;
    city?: string;
    postal_code?: number;
    location?: {
        lat?: number;
        lng?: number;
    };
}
export declare class CustomersService {
    private readonly restaurantRepository;
    private readonly userRepository;
    private readonly dataSource;
    private readonly customerRepository;
    constructor(restaurantRepository: RestaurantsRepository, userRepository: UserRepository, dataSource: DataSource, customerRepository: CustomersRepository);
    create(createCustomerDto: CreateCustomerDto): Promise<ApiResponse<Customer>>;
    searchRestaurantsByKeyword(keyword: string, page?: number, limit?: number): Promise<ApiResponse<Restaurant[]>>;
    findAll(): Promise<ApiResponse<Customer[]>>;
    findCustomerById(id: string): Promise<ApiResponse<any>>;
    update(id: string, updateCustomerDto: UpdateCustomerDto): Promise<ApiResponse<Customer>>;
    remove(id: string): Promise<ApiResponse<null>>;
    updateEntityAvatar(uploadResult: {
        url: string;
        public_id: string;
    }, entityId: string): Promise<ApiResponse<any>>;
    private isRestaurantOpen;
    calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number;
    getAllRestaurants(customerId: string): Promise<any>;
    getAllOrders(customerId: string): Promise<any>;
    findOne(conditions: Partial<Customer>): Promise<ApiResponse<Customer>>;
}
