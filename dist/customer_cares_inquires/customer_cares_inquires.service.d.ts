import { CustomerCareInquiriesRepository } from './customer_cares_inquires.repository';
import { CreateCustomerCareInquiryDto } from './dto/create-customer-care-inquiry.dto';
import { UpdateCustomerCareInquiryDto } from './dto/update-customer-care-inquiry.dto';
import { RedisService } from 'src/redis/redis.service';
export declare class CustomerCareInquiriesService {
    private readonly repository;
    private readonly redisService;
    constructor(repository: CustomerCareInquiriesRepository, redisService: RedisService);
    create(createDto: CreateCustomerCareInquiryDto): Promise<import("src/utils/createResponse").ApiResponse<any>>;
    findAll(): Promise<import("src/utils/createResponse").ApiResponse<any>>;
    findById(id: string): Promise<import("src/utils/createResponse").ApiResponse<any>>;
    findAllInquiriesByCCId(id: string): Promise<import("src/utils/createResponse").ApiResponse<any>>;
    update(id: string, updateDto: UpdateCustomerCareInquiryDto): Promise<import("src/utils/createResponse").ApiResponse<any>>;
    remove(id: string): Promise<import("src/utils/createResponse").ApiResponse<any>>;
    escalateInquiry(id: string, customerCareId: string, reason: string, escalatedTo: 'ADMIN' | 'CUSTOMER_CARE', escalatedToId: string): Promise<import("src/utils/createResponse").ApiResponse<any>>;
    rejectInquiry(id: string, customerCareId: string, reason: string): Promise<import("src/utils/createResponse").ApiResponse<any>>;
    transferInquiry(id: string, fromCustomerCareId: string, toCustomerCareId: string, reason: string): Promise<import("src/utils/createResponse").ApiResponse<any>>;
    recordResponse(id: string): Promise<import("src/utils/createResponse").ApiResponse<any>>;
    resolveInquiry(id: string, resolutionType: 'REFUND' | 'REPLACEMENT' | 'INVESTIGATING' | 'ACCOUNT_FIX' | 'TECHNICAL_SUPPORT' | 'OTHER', resolutionNotes?: string): Promise<import("src/utils/createResponse").ApiResponse<any>>;
}
