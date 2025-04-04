import { CustomerCareService } from './customer_cares.service';
import { CreateCustomerCareDto } from './dto/create-customer_cares.dto';
import { UpdateCustomerCareDto } from './dto/update-customer_cares.dto';
export declare class CustomerCareController {
    private readonly customerCareService;
    constructor(customerCareService: CustomerCareService);
    create(createCustomerCareDto: CreateCustomerCareDto): Promise<any>;
    findAll(): Promise<any>;
    findCustomerCareById(id: string): Promise<any>;
    findOne(field: string, value: string): Promise<any>;
    update(id: string, updateCustomerCareDto: UpdateCustomerCareDto): Promise<any>;
    setAvailability(id: string): Promise<any>;
    remove(id: string): Promise<any>;
}
