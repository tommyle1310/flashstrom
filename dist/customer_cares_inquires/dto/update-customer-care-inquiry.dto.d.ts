import { CreateCustomerCareInquiryDto } from './create-customer-care-inquiry.dto';
declare const UpdateCustomerCareInquiryDto_base: import("@nestjs/mapped-types").MappedType<Partial<CreateCustomerCareInquiryDto>>;
export declare class UpdateCustomerCareInquiryDto extends UpdateCustomerCareInquiryDto_base {
    subject?: string;
    description?: string;
    status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
    assigned_to?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    resolved_at?: number;
    resolution_notes?: string;
    assignee_type?: 'ADMIN' | 'CUSTOMER_CARE';
}
export {};
