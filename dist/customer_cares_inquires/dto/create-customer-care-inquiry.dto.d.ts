export declare class CreateCustomerCareInquiryDto {
    customer_id: string;
    subject: string;
    description: string;
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'ESCALATE';
    order_id?: string;
    assigned_to?: string;
    assignee_type?: 'ADMIN' | 'CUSTOMER_CARE';
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    resolution_notes?: string;
}
