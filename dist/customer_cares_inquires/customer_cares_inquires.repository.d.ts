import { Repository } from 'typeorm';
import { CustomerCareInquiry } from './entities/customer_care_inquiry.entity';
import { CreateCustomerCareInquiryDto } from './dto/create-customer-care-inquiry.dto';
import { UpdateCustomerCareInquiryDto } from './dto/update-customer-care-inquiry.dto';
import { Order } from 'src/orders/entities/order.entity';
import { CustomerCare } from 'src/customer_cares/entities/customer_care.entity';
export declare class CustomerCareInquiriesRepository {
    private repository;
    private orderRepository;
    private customerCareRepository;
    constructor(repository: Repository<CustomerCareInquiry>, orderRepository: Repository<Order>, customerCareRepository: Repository<CustomerCare>);
    create(createDto: CreateCustomerCareInquiryDto): Promise<CustomerCareInquiry>;
    update(id: string, updateDto: UpdateCustomerCareInquiryDto): Promise<CustomerCareInquiry>;
    findById(id: string): Promise<CustomerCareInquiry>;
    findAll(): Promise<CustomerCareInquiry[]>;
    findAllInquiriesByCCId(customerCareId: string): Promise<CustomerCareInquiry[]>;
    remove(id: string): Promise<boolean>;
}
