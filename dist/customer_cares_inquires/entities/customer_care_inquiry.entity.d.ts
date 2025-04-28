import { Customer } from 'src/customers/entities/customer.entity';
import { Admin } from 'src/admin/entities/admin.entity';
import { CustomerCare } from 'src/customer_cares/entities/customer_care.entity';
import { Order } from 'src/orders/entities/order.entity';
export declare class CustomerCareInquiry {
    id: string;
    customer_id: string;
    customer: Customer;
    assigned_admin: Admin;
    assigned_customer_care: CustomerCare;
    assignee_type: 'ADMIN' | 'CUSTOMER_CARE';
    subject: string;
    description: string;
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'ESCALATE';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    order: Order;
    resolution_notes: string;
    created_at: number;
    updated_at: number;
    resolved_at: number;
    generateId(): void;
}
