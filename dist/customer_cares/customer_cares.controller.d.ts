import { CustomerCareService } from './customer_cares.service';
import { CreateCustomerCareDto } from './dto/create-customer_cares.dto';
import { UpdateCustomerCareDto } from './dto/update-customer_cares.dto';
export declare class CustomerCareController {
    private readonly customerCareService;
    constructor(customerCareService: CustomerCareService);
    resetInquiriesCache(): Promise<import("../utils/createResponse").ApiResponse<any>>;
    create(createCustomerCareDto: CreateCustomerCareDto): Promise<any>;
    findAll(): Promise<any>;
    findAllInquiriesByCCId(ccId: string): Promise<import("../utils/createResponse").ApiResponse<any>>;
    findCustomerCareById(id: string): Promise<any>;
    findOne(field: string, value: string): Promise<any>;
    update(id: string, updateCustomerCareDto: UpdateCustomerCareDto): Promise<import("../utils/createResponse").ApiResponse<any>>;
    setAvailability(id: string): Promise<any>;
    remove(id: string): Promise<any>;
}
