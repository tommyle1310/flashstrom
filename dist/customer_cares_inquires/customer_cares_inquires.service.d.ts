import { CustomerCareInquiriesRepository } from './customer_cares_inquires.repository';
import { CreateCustomerCareInquiryDto } from './dto/create-customer-care-inquiry.dto';
import { UpdateCustomerCareInquiryDto } from './dto/update-customer-care-inquiry.dto';
export declare class CustomerCareInquiriesService {
    private readonly repository;
    constructor(repository: CustomerCareInquiriesRepository);
    create(createDto: CreateCustomerCareInquiryDto): Promise<import("src/utils/createResponse").ApiResponse<any>>;
    findAll(): Promise<import("src/utils/createResponse").ApiResponse<any>>;
    findById(id: string): Promise<import("src/utils/createResponse").ApiResponse<any>>;
    update(id: string, updateDto: UpdateCustomerCareInquiryDto): Promise<import("src/utils/createResponse").ApiResponse<any>>;
    remove(id: string): Promise<import("src/utils/createResponse").ApiResponse<any>>;
}
