import { CustomerCareInquiriesService } from './customer_cares_inquires.service';
import { CreateCustomerCareInquiryDto } from './dto/create-customer-care-inquiry.dto';
import { UpdateCustomerCareInquiryDto } from './dto/update-customer-care-inquiry.dto';
export declare class CustomerCareInquiriesController {
    private readonly service;
    constructor(service: CustomerCareInquiriesService);
    create(createDto: CreateCustomerCareInquiryDto): Promise<import("../utils/createResponse").ApiResponse<any>>;
    findAll(): Promise<import("../utils/createResponse").ApiResponse<any>>;
    findOne(id: string): Promise<import("../utils/createResponse").ApiResponse<any>>;
    update(id: string, updateDto: UpdateCustomerCareInquiryDto): Promise<import("../utils/createResponse").ApiResponse<any>>;
    remove(id: string): Promise<import("../utils/createResponse").ApiResponse<any>>;
}
