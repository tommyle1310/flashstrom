import { Repository } from 'typeorm';
import { CustomerCareInquiry } from './entities/customer_care_inquiry.entity';
import { CreateCustomerCareInquiryDto } from './dto/create-customer-care-inquiry.dto';
import { UpdateCustomerCareInquiryDto } from './dto/update-customer-care-inquiry.dto';
export declare class CustomerCareInquiriesRepository {
    private repository;
    constructor(repository: Repository<CustomerCareInquiry>);
    create(createDto: CreateCustomerCareInquiryDto): Promise<CustomerCareInquiry>;
    findById(id: string): Promise<CustomerCareInquiry>;
    findAll(): Promise<CustomerCareInquiry[]>;
    update(id: string, updateDto: UpdateCustomerCareInquiryDto): Promise<CustomerCareInquiry>;
    remove(id: string): Promise<boolean>;
}
