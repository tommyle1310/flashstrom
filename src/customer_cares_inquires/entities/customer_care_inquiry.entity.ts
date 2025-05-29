import {
  Entity,
  Column,
  PrimaryColumn,
  BeforeInsert,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Customer } from 'src/customers/entities/customer.entity';
import { Admin } from 'src/admin/entities/admin.entity';
import { CustomerCare } from 'src/customer_cares/entities/customer_care.entity';
import { Order } from 'src/orders/entities/order.entity';

@Entity('customer_care_inquiries')
export class CustomerCareInquiry {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column()
  customer_id: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ nullable: true })
  assigned_admin_id: string;

  @ManyToOne(() => Admin, { nullable: true })
  @JoinColumn({ name: 'assigned_admin_id', referencedColumnName: 'id' })
  assigned_admin: Admin;

  @Column({ nullable: true })
  assigned_customer_care_id: string;

  @ManyToOne(() => CustomerCare, { nullable: true })
  @JoinColumn({ name: 'assigned_customer_care_id', referencedColumnName: 'id' })
  assigned_customer_care: CustomerCare;

  @Column({
    type: 'enum',
    enum: ['ADMIN', 'CUSTOMER_CARE'],
    default: 'CUSTOMER_CARE'
  })
  assignee_type: 'ADMIN' | 'CUSTOMER_CARE';

  @Column()
  subject: string;

  @Column()
  description: string;

  @Column({
    type: 'enum',
    enum: [
      'ACCOUNT',
      'PAYMENT',
      'PRODUCT',
      'DELIVERY',
      'REFUND',
      'TECHNICAL',
      'OTHER'
    ],
    default: 'OTHER'
  })
  issue_type:
    | 'ACCOUNT'
    | 'PAYMENT'
    | 'PRODUCT'
    | 'DELIVERY'
    | 'REFUND'
    | 'TECHNICAL'
    | 'OTHER';

  @Column({
    type: 'enum',
    enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ESCALATE'],
    default: 'OPEN'
  })
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'ESCALATE';

  @Column({
    type: 'enum',
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    default: 'MEDIUM'
  })
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

  @Column({
    type: 'enum',
    enum: [
      'REFUND',
      'REPLACEMENT',
      'INVESTIGATING',
      'ACCOUNT_FIX',
      'TECHNICAL_SUPPORT',
      'OTHER'
    ],
    nullable: true
  })
  resolution_type:
    | 'REFUND'
    | 'REPLACEMENT'
    | 'INVESTIGATING'
    | 'ACCOUNT_FIX'
    | 'TECHNICAL_SUPPORT'
    | 'OTHER';

  @Column({ type: 'json', nullable: true })
  escalation_history: Array<{
    customer_care_id: string;
    reason: string;
    timestamp: number;
    escalated_to: 'ADMIN' | 'CUSTOMER_CARE';
    escalated_to_id: string;
  }>;

  @Column({ type: 'json', nullable: true })
  rejection_history: Array<{
    customer_care_id: string;
    reason: string;
    timestamp: number;
  }>;

  @Column({ type: 'json', nullable: true })
  transfer_history: Array<{
    from_customer_care_id: string;
    to_customer_care_id: string;
    reason: string;
    timestamp: number;
  }>;

  @Column({ type: 'int', default: 0 })
  escalation_count: number;

  @Column({ type: 'int', default: 0 })
  rejection_count: number;

  @Column({ type: 'int', default: 0 })
  transfer_count: number;

  @Column({ type: 'int', default: 0 })
  response_time: number;

  @Column({ type: 'int', default: 0 })
  resolution_time: number;

  @Column({ nullable: true })
  order_id: string;

  @ManyToOne(() => Order, { nullable: true })
  @JoinColumn({ name: 'order_id', referencedColumnName: 'id' })
  order: Order;

  @Column({ type: 'text', nullable: true })
  resolution_notes: string;

  @Column()
  created_at: number;

  @Column()
  updated_at: number;

  @Column({ nullable: true })
  resolved_at: number;

  @Column({ nullable: true })
  first_response_at: number;

  @Column({ nullable: true })
  last_response_at: number;

  @BeforeInsert()
  generateId() {
    this.id = `FF_INQ_${uuidv4()}`;
    const now = Math.floor(Date.now() / 1000);
    this.created_at = now;
    this.updated_at = now;
  }
}
