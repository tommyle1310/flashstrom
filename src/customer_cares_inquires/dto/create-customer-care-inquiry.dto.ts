import { IsString, IsEnum, IsOptional, IsArray } from 'class-validator';

export class CreateCustomerCareInquiryDto {
  @IsString()
  customer_id: string;

  @IsString()
  subject: string;

  @IsString()
  description: string;

  @IsEnum([
    'ACCOUNT',
    'PAYMENT',
    'PRODUCT',
    'DELIVERY',
    'REFUND',
    'TECHNICAL',
    'OTHER'
  ])
  @IsOptional()
  issue_type?:
    | 'ACCOUNT'
    | 'PAYMENT'
    | 'PRODUCT'
    | 'DELIVERY'
    | 'REFUND'
    | 'TECHNICAL'
    | 'OTHER' = 'OTHER';

  @IsEnum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ESCALATE'])
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'ESCALATE';

  @IsString()
  @IsOptional()
  order_id?: string;

  @IsString()
  @IsOptional()
  assigned_to?: string;

  @IsEnum(['ADMIN', 'CUSTOMER_CARE'])
  @IsOptional()
  assignee_type?: 'ADMIN' | 'CUSTOMER_CARE' = 'CUSTOMER_CARE';

  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  @IsOptional()
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

  @IsEnum([
    'REFUND',
    'REPLACEMENT',
    'INVESTIGATING',
    'ACCOUNT_FIX',
    'TECHNICAL_SUPPORT',
    'OTHER'
  ])
  @IsOptional()
  resolution_type?:
    | 'REFUND'
    | 'REPLACEMENT'
    | 'INVESTIGATING'
    | 'ACCOUNT_FIX'
    | 'TECHNICAL_SUPPORT'
    | 'OTHER';

  @IsString()
  @IsOptional()
  resolution_notes?: string;

  @IsArray()
  @IsOptional()
  escalation_history?: Array<{
    customer_care_id: string;
    reason: string;
    timestamp: number;
    escalated_to: 'ADMIN' | 'CUSTOMER_CARE';
    escalated_to_id: string;
  }>;

  @IsArray()
  @IsOptional()
  rejection_history?: Array<{
    customer_care_id: string;
    reason: string;
    timestamp: number;
  }>;

  @IsArray()
  @IsOptional()
  transfer_history?: Array<{
    from_customer_care_id: string;
    to_customer_care_id: string;
    reason: string;
    timestamp: number;
  }>;
}
