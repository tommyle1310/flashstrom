import { PartialType } from '@nestjs/mapped-types';
import { CreateCustomerCareInquiryDto } from './create-customer-care-inquiry.dto';
import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsArray
} from 'class-validator';

export class UpdateCustomerCareInquiryDto extends PartialType(
  CreateCustomerCareInquiryDto
) {
  @IsOptional()
  assigned_customer_care_id?: string;

  @IsOptional()
  @IsString()
  subject?: string; // Updated subject of the inquiry

  @IsOptional()
  @IsString()
  description?: string; // Updated description of the inquiry

  @IsOptional()
  @IsEnum([
    'ACCOUNT',
    'PAYMENT',
    'PRODUCT',
    'DELIVERY',
    'REFUND',
    'TECHNICAL',
    'OTHER'
  ])
  issue_type?:
    | 'ACCOUNT'
    | 'PAYMENT'
    | 'PRODUCT'
    | 'DELIVERY'
    | 'REFUND'
    | 'TECHNICAL'
    | 'OTHER';

  @IsOptional()
  @IsEnum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ESCALATE'])
  status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'ESCALATE'; // Updated status

  @IsOptional()
  @IsString()
  assigned_to?: string; // Updated assigned agent ID

  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'; // Updated priority level

  @IsOptional()
  @IsEnum([
    'REFUND',
    'REPLACEMENT',
    'INVESTIGATING',
    'ACCOUNT_FIX',
    'TECHNICAL_SUPPORT',
    'OTHER'
  ])
  resolution_type?:
    | 'REFUND'
    | 'REPLACEMENT'
    | 'INVESTIGATING'
    | 'ACCOUNT_FIX'
    | 'TECHNICAL_SUPPORT'
    | 'OTHER';

  @IsOptional()
  @IsNumber()
  resolved_at?: number; // Updated resolution timestamp

  @IsOptional()
  @IsString()
  resolution_notes?: string; // Updated resolution notes

  @IsOptional()
  @IsEnum(['ADMIN', 'CUSTOMER_CARE'])
  assignee_type?: 'ADMIN' | 'CUSTOMER_CARE';

  @IsOptional()
  @IsArray()
  escalation_history?: Array<{
    customer_care_id: string;
    reason: string;
    timestamp: number;
    escalated_to: 'ADMIN' | 'CUSTOMER_CARE';
    escalated_to_id: string;
  }>;

  @IsOptional()
  @IsArray()
  rejection_history?: Array<{
    customer_care_id: string;
    reason: string;
    timestamp: number;
  }>;

  @IsOptional()
  @IsArray()
  transfer_history?: Array<{
    from_customer_care_id: string;
    to_customer_care_id: string;
    reason: string;
    timestamp: number;
  }>;

  @IsOptional()
  @IsNumber()
  escalation_count?: number;

  @IsOptional()
  @IsNumber()
  rejection_count?: number;

  @IsOptional()
  @IsNumber()
  transfer_count?: number;

  @IsOptional()
  @IsNumber()
  response_time?: number;

  @IsOptional()
  @IsNumber()
  resolution_time?: number;

  @IsOptional()
  @IsNumber()
  first_response_at?: number;

  @IsOptional()
  @IsNumber()
  last_response_at?: number;
}
