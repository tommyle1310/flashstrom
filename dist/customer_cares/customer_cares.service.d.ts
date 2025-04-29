import { CreateCustomerCareDto } from './dto/create-customer_cares.dto';
import { UpdateCustomerCareDto } from './dto/update-customer_cares.dto';
import { ApiResponse } from 'src/utils/createResponse';
import { CustomerCaresRepository } from './customer_cares.repository';
import { CustomerCareInquiriesRepository } from 'src/customer_cares_inquires/customer_cares_inquires.repository';
import { RedisService } from 'src/redis/redis.service';
import { DataSource } from 'typeorm';
export declare class CustomerCareService {
    private readonly repository;
    private readonly inquiryRepository;
    private readonly redisService;
    private readonly dataSource;
    constructor(repository: CustomerCaresRepository, inquiryRepository: CustomerCareInquiriesRepository, redisService: RedisService, dataSource: DataSource);
    create(createCustomerCareDto: CreateCustomerCareDto): Promise<any>;
    findAll(): Promise<any>;
    findAllInquiriesByCCId(id: string): Promise<ApiResponse<any>>;
    findCustomerCareById(id: string): Promise<any>;
    findOne(conditions: object): Promise<any>;
    update(id: string, updateCustomerCareDto: UpdateCustomerCareDto): Promise<any>;
    setAvailability(id: string): Promise<any>;
    remove(id: string): Promise<any>;
    updateEntityAvatar(uploadResult: {
        url: string;
        public_id: string;
    }, entityId: string): Promise<ApiResponse<any>>;
}
