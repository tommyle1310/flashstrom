import { CreateCustomerCareInquiryDto } from 'src/customer_cares_inquires/dto/create-customer-care-inquiry.dto';
import { Repository } from 'typeorm';
import { CustomerCare } from 'src/customer_cares/entities/customer_care.entity';
import { Order } from 'src/orders/entities/order.entity';
import { CustomerCareInquiry } from 'src/customer_cares_inquires/entities/customer_care_inquiry.entity';
export declare function getPriorityPoints(priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'): number;
export declare function calculateInquiryPriority(dto: CreateCustomerCareInquiryDto, orderRepository: Repository<Order>): Promise<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>;
export declare function findAvailableCustomerCare(customerCareRepository: Repository<CustomerCare>, inquiryRepository: Repository<CustomerCareInquiry>): Promise<string | null>;
