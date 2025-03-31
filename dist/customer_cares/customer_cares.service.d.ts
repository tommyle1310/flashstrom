import { CreateCustomerCareDto } from './dto/create-customer_cares.dto';
import { UpdateCustomerCareDto } from './dto/update-customer_cares.dto';
import { CustomerCaresRepository } from './customer_cares.repository';
export declare class CustomerCareService {
    private readonly repository;
    constructor(repository: CustomerCaresRepository);
    create(createCustomerCareDto: CreateCustomerCareDto): Promise<any>;
    findAll(): Promise<any>;
    findCustomerCareById(id: string): Promise<any>;
    findOne(conditions: object): Promise<any>;
    update(id: string, updateCustomerCareDto: UpdateCustomerCareDto): Promise<any>;
    setAvailability(id: string): Promise<any>;
    remove(id: string): Promise<any>;
    updateEntityAvatar(uploadResult: {
        url: string;
        public_id: string;
    }, entityId: string): Promise<import("src/utils/createResponse").ApiResponse<any>>;
}
