import { Injectable } from '@nestjs/common';
import { CustomerCareInquiriesRepository } from './customer_cares_inquires.repository';
import { CreateCustomerCareInquiryDto } from './dto/create-customer-care-inquiry.dto';
import { UpdateCustomerCareInquiryDto } from './dto/update-customer-care-inquiry.dto';
import { createResponse } from 'src/utils/createResponse';

@Injectable()
export class CustomerCareInquiriesService {
  constructor(private readonly repository: CustomerCareInquiriesRepository) {}

  async create(createDto: CreateCustomerCareInquiryDto) {
    try {
      const inquiry = await this.repository.create(createDto);
      return createResponse('OK', inquiry, 'Inquiry created successfully');
    } catch (error: any) {
      console.error('Error creating inquiry:', error);
      return createResponse('ServerError', null, 'Failed to create inquiry');
    }
  }

  async findAll() {
    try {
      const inquiries = await this.repository.findAll();
      return createResponse('OK', inquiries, 'Inquiries fetched successfully');
    } catch (error: any) {
      console.error('Error fetching inquiries:', error);
      return createResponse('ServerError', null, 'Failed to fetch inquiries');
    }
  }

  async findById(id: string) {
    try {
      const inquiry = await this.repository.findById(id);
      if (!inquiry) {
        return createResponse('NotFound', null, 'Inquiry not found');
      }
      return createResponse('OK', inquiry, 'Inquiry fetched successfully');
    } catch (error: any) {
      console.error('Error fetching inquiry:', error);
      return createResponse('ServerError', null, 'Failed to fetch inquiry');
    }
  }

  async findAllInquiriesByCCId(id: string) {
    try {
      const inquiry = await this.repository.findAllInquiriesByCCId(id);
      if (!inquiry) {
        return createResponse('NotFound', null, 'Inquiry not found');
      }
      return createResponse('OK', inquiry, 'Inquiry fetched successfully');
    } catch (error: any) {
      console.error('Error fetching inquiry:', error);
      return createResponse('ServerError', null, 'Failed to fetch inquiry');
    }
  }

  async update(id: string, updateDto: UpdateCustomerCareInquiryDto) {
    try {
      const inquiry = await this.repository.findById(id);
      if (!inquiry) {
        return createResponse('NotFound', null, 'Inquiry not found');
      }

      const updated = await this.repository.update(id, updateDto);
      return createResponse('OK', updated, 'Inquiry updated successfully');
    } catch (error: any) {
      console.error('Error updating inquiry:', error);
      return createResponse('ServerError', null, 'Failed to update inquiry');
    }
  }

  async remove(id: string) {
    try {
      const deleted = await this.repository.remove(id);
      if (!deleted) {
        return createResponse('NotFound', null, 'Inquiry not found');
      }
      return createResponse('OK', null, 'Inquiry deleted successfully');
    } catch (error: any) {
      console.error('Error deleting inquiry:', error);
      return createResponse('ServerError', null, 'Failed to delete inquiry');
    }
  }

  /**
   * Escalate an inquiry to another agent or admin
   */
  async escalateInquiry(
    id: string,
    customerCareId: string,
    reason: string,
    escalatedTo: 'ADMIN' | 'CUSTOMER_CARE',
    escalatedToId: string
  ) {
    try {
      const inquiry = await this.repository.escalateInquiry(
        id,
        customerCareId,
        reason,
        escalatedTo,
        escalatedToId
      );
      return createResponse('OK', inquiry, 'Inquiry escalated successfully');
    } catch (error: any) {
      console.error('Error escalating inquiry:', error);
      return createResponse('ServerError', null, 'Failed to escalate inquiry');
    }
  }

  /**
   * Reject an inquiry
   */
  async rejectInquiry(id: string, customerCareId: string, reason: string) {
    try {
      const inquiry = await this.repository.rejectInquiry(
        id,
        customerCareId,
        reason
      );
      return createResponse('OK', inquiry, 'Inquiry rejected successfully');
    } catch (error: any) {
      console.error('Error rejecting inquiry:', error);
      return createResponse('ServerError', null, 'Failed to reject inquiry');
    }
  }

  /**
   * Transfer an inquiry to another customer care agent
   */
  async transferInquiry(
    id: string,
    fromCustomerCareId: string,
    toCustomerCareId: string,
    reason: string
  ) {
    try {
      const inquiry = await this.repository.transferInquiry(
        id,
        fromCustomerCareId,
        toCustomerCareId,
        reason
      );
      return createResponse('OK', inquiry, 'Inquiry transferred successfully');
    } catch (error: any) {
      console.error('Error transferring inquiry:', error);
      return createResponse('ServerError', null, 'Failed to transfer inquiry');
    }
  }

  /**
   * Record a response to an inquiry
   */
  async recordResponse(id: string) {
    try {
      const inquiry = await this.repository.recordResponse(id);
      return createResponse('OK', inquiry, 'Response recorded successfully');
    } catch (error: any) {
      console.error('Error recording response:', error);
      return createResponse('ServerError', null, 'Failed to record response');
    }
  }

  /**
   * Mark an inquiry as resolved
   */
  async resolveInquiry(
    id: string,
    resolutionType:
      | 'REFUND'
      | 'REPLACEMENT'
      | 'INVESTIGATING'
      | 'ACCOUNT_FIX'
      | 'TECHNICAL_SUPPORT'
      | 'OTHER',
    resolutionNotes?: string
  ) {
    try {
      const inquiry = await this.repository.resolveInquiry(
        id,
        resolutionType,
        resolutionNotes
      );
      return createResponse('OK', inquiry, 'Inquiry resolved successfully');
    } catch (error: any) {
      console.error('Error resolving inquiry:', error);
      return createResponse('ServerError', null, 'Failed to resolve inquiry');
    }
  }
}
