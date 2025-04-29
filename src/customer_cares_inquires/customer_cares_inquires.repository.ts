import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CustomerCareInquiry } from './entities/customer_care_inquiry.entity';
import { CreateCustomerCareInquiryDto } from './dto/create-customer-care-inquiry.dto';
import { UpdateCustomerCareInquiryDto } from './dto/update-customer-care-inquiry.dto';
import {
  calculateInquiryPriority,
  findAvailableCustomerCare,
  getPriorityPoints
} from 'src/utils/rules/inquiries';
import { Order } from 'src/orders/entities/order.entity';
import { CustomerCare } from 'src/customer_cares/entities/customer_care.entity';

@Injectable()
export class CustomerCareInquiriesRepository {
  constructor(
    @InjectRepository(CustomerCareInquiry)
    private repository: Repository<CustomerCareInquiry>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(CustomerCare)
    private customerCareRepository: Repository<CustomerCare>
  ) {}

  async create(
    createDto: CreateCustomerCareInquiryDto
  ): Promise<CustomerCareInquiry> {
    try {
      // Validation assignee_type
      if (!['ADMIN', 'CUSTOMER_CARE'].includes(createDto.assignee_type)) {
        throw new Error(`Invalid assignee_type: ${createDto.assignee_type}`);
      }

      // Tính priority tự động
      const priority = await calculateInquiryPriority(
        createDto,
        this.orderRepository
      );
      console.log(`Calculated priority: ${priority}`);

      // Tìm CustomerCare có ít inquiry active nhất nếu assignee_type là CUSTOMER_CARE
      let assignedCustomerCareId: string | null = null;
      if (
        createDto.assignee_type === 'CUSTOMER_CARE' &&
        !createDto.assigned_to
      ) {
        assignedCustomerCareId = await findAvailableCustomerCare(
          this.customerCareRepository,
          this.repository
        );
        console.log(`Assigned CustomerCare ID: ${assignedCustomerCareId}`);
        if (assignedCustomerCareId) {
          // Tăng active_point và active_workload
          const points = getPriorityPoints(priority);
          await this.customerCareRepository.increment(
            { id: assignedCustomerCareId },
            'active_point',
            points
          );
          await this.customerCareRepository.increment(
            { id: assignedCustomerCareId },
            'active_workload',
            1
          );
          console.log(
            `Incremented active_point by ${points} and active_workload by 1 for CustomerCare: ${assignedCustomerCareId}`
          );
        } else {
          console.warn('No CustomerCare assigned, falling back to ADMIN');
          createDto.assignee_type = 'ADMIN';
          createDto.assigned_to = 'DEFAULT_ADMIN_ID'; // Thay bằng ID admin mặc định
        }
      }

      // Map DTO và priority vào entity
      const inquiryData = {
        ...createDto,
        priority,
        assigned_admin_id:
          createDto.assignee_type === 'ADMIN' ? createDto.assigned_to : null,
        assigned_customer_care:
          createDto.assignee_type === 'CUSTOMER_CARE' && assignedCustomerCareId
            ? { id: assignedCustomerCareId }
            : null,
        order: createDto.order_id ? { id: createDto.order_id } : null, // Gán quan hệ order
        escalation_history: createDto.escalation_history || [],
        rejection_history: createDto.rejection_history || [],
        transfer_history: createDto.transfer_history || [],
        escalation_count: 0,
        rejection_count: 0,
        transfer_count: 0,
        first_response_at: null,
        last_response_at: null
      };
      console.log(
        'Final inquiryData before create:',
        JSON.stringify(inquiryData, null, 2)
      );

      // Create the basic inquiry
      const inquiry: CustomerCareInquiry = this.repository.create(inquiryData);

      // Save without loading relations first
      const savedInquiry: CustomerCareInquiry =
        await this.repository.save(inquiry);
      console.log('Saved inquiry:', JSON.stringify(savedInquiry, null, 2));

      // Load the complete inquiry with appropriate relations
      const result = await this.repository.findOne({
        where: { id: savedInquiry.id },
        relations: [
          'customer',
          'assigned_admin',
          'assigned_customer_care',
          'order'
        ]
      });

      if (!result) {
        throw new Error('Failed to load saved inquiry');
      }

      return result;
    } catch (error) {
      console.error('Error in create method:', error);
      throw error;
    }
  }

  async update(
    id: string,
    updateDto: UpdateCustomerCareInquiryDto
  ): Promise<CustomerCareInquiry> {
    try {
      // Lấy inquiry hiện tại với quan hệ assigned_customer_care
      const currentInquiry = await this.repository.findOne({
        where: { id },
        relations: ['assigned_customer_care']
      });
      if (!currentInquiry) {
        throw new Error('Inquiry not found');
      }

      // Nếu status đổi thành RESOLVED hoặc CLOSED, giảm active_workload
      if (
        updateDto.status &&
        ['RESOLVED', 'CLOSED'].includes(updateDto.status) &&
        currentInquiry.assigned_customer_care?.id // Kiểm tra null
      ) {
        await this.customerCareRepository.decrement(
          { id: currentInquiry.assigned_customer_care.id },
          'active_workload',
          1
        );
        console.log(
          `Decremented active_workload for CustomerCare: ${currentInquiry.assigned_customer_care.id}`
        );
      }

      // Cập nhật inquiry
      await this.repository.update(id, {
        ...updateDto,
        updated_at: Math.floor(Date.now() / 1000)
      });

      return this.findById(id);
    } catch (error: any) {
      console.error('Repository update error:', error);
      throw error;
    }
  }

  async findById(id: string): Promise<CustomerCareInquiry> {
    const inquiry = await this.repository.findOne({
      where: { id }
    });

    if (!inquiry) {
      return null;
    }

    return await this.repository.findOne({
      where: { id },
      relations: [
        'customer',
        inquiry.assignee_type === 'ADMIN'
          ? 'assigned_admin'
          : 'assigned_customer_care'
      ]
    });
  }

  async findAll(): Promise<CustomerCareInquiry[]> {
    return await this.repository.find({
      relations: ['customer', 'assigned_admin', 'assigned_customer_care']
    });
  }

  async findAllInquiriesByCCId(
    customerCareId: string
  ): Promise<CustomerCareInquiry[]> {
    try {
      if (!customerCareId) {
        throw new Error('CustomerCare ID is required');
      }

      console.log(`Finding inquiries for CustomerCare ID: ${customerCareId}`);

      const inquiries = await this.repository.find({
        where: {
          assigned_customer_care: { id: customerCareId }
        },
        relations: ['customer', 'assigned_admin', 'assigned_customer_care']
      });

      console.log(
        `Found ${inquiries.length} inquiries for CustomerCare ID: ${customerCareId}`
      );

      return inquiries;
    } catch (error: any) {
      console.error(
        `Error finding inquiries for CustomerCare ID ${customerCareId}:`,
        error
      );
      throw error;
    }
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected > 0;
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
  ): Promise<CustomerCareInquiry> {
    const inquiry = await this.findById(id);
    if (!inquiry) {
      throw new Error(`Inquiry with ID ${id} not found`);
    }

    // Create escalation record
    const escalationRecord = {
      customer_care_id: customerCareId,
      reason,
      timestamp: Math.floor(Date.now() / 1000),
      escalated_to: escalatedTo,
      escalated_to_id: escalatedToId
    };

    // Update inquiry
    await this.repository.save({
      ...inquiry,
      status: 'ESCALATE',
      escalation_history: [
        ...(inquiry.escalation_history || []),
        escalationRecord
      ],
      escalation_count: (inquiry.escalation_count || 0) + 1,
      assignee_type: escalatedTo,
      assigned_admin_id: escalatedTo === 'ADMIN' ? escalatedToId : null,
      assigned_customer_care:
        escalatedTo === 'CUSTOMER_CARE' ? { id: escalatedToId } : null
    });

    return this.findById(id);
  }

  /**
   * Reject an inquiry
   */
  async rejectInquiry(
    id: string,
    customerCareId: string,
    reason: string
  ): Promise<CustomerCareInquiry> {
    const inquiry = await this.findById(id);
    if (!inquiry) {
      throw new Error(`Inquiry with ID ${id} not found`);
    }

    // Create rejection record
    const rejectionRecord = {
      customer_care_id: customerCareId,
      reason,
      timestamp: Math.floor(Date.now() / 1000)
    };

    // Update inquiry
    await this.repository.save({
      ...inquiry,
      rejection_history: [
        ...(inquiry.rejection_history || []),
        rejectionRecord
      ],
      rejection_count: (inquiry.rejection_count || 0) + 1
    });

    return this.findById(id);
  }

  /**
   * Transfer an inquiry to another customer care agent
   */
  async transferInquiry(
    id: string,
    fromCustomerCareId: string,
    toCustomerCareId: string,
    reason: string
  ): Promise<CustomerCareInquiry> {
    const inquiry = await this.findById(id);
    if (!inquiry) {
      throw new Error(`Inquiry with ID ${id} not found`);
    }

    // Create transfer record
    const transferRecord = {
      from_customer_care_id: fromCustomerCareId,
      to_customer_care_id: toCustomerCareId,
      reason,
      timestamp: Math.floor(Date.now() / 1000)
    };

    // Update inquiry
    await this.repository.save({
      ...inquiry,
      transfer_history: [...(inquiry.transfer_history || []), transferRecord],
      transfer_count: (inquiry.transfer_count || 0) + 1,
      assigned_customer_care: { id: toCustomerCareId }
    });

    return this.findById(id);
  }

  /**
   * Record a response to an inquiry
   */
  async recordResponse(id: string): Promise<CustomerCareInquiry> {
    const inquiry = await this.findById(id);
    if (!inquiry) {
      throw new Error(`Inquiry with ID ${id} not found`);
    }

    const now = Math.floor(Date.now() / 1000);

    // Calculate response time if this is the first response
    let responseTime = inquiry.response_time || 0;
    if (!inquiry.first_response_at) {
      responseTime = now - inquiry.created_at;
    }

    // Update inquiry
    await this.repository.save({
      ...inquiry,
      first_response_at: inquiry.first_response_at || now,
      last_response_at: now,
      response_time: responseTime
    });

    return this.findById(id);
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
  ): Promise<CustomerCareInquiry> {
    const inquiry = await this.findById(id);
    if (!inquiry) {
      throw new Error(`Inquiry with ID ${id} not found`);
    }

    const now = Math.floor(Date.now() / 1000);

    // Calculate resolution time
    const resolutionTime = now - inquiry.created_at;

    // Update inquiry
    await this.repository.save({
      ...inquiry,
      status: 'RESOLVED',
      resolution_type: resolutionType,
      resolution_notes: resolutionNotes || inquiry.resolution_notes,
      resolved_at: now,
      resolution_time: resolutionTime
    });

    return this.findById(id);
  }
}
