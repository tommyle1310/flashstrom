import { Injectable, Logger } from '@nestjs/common';
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
import { ADMIN_MOCK } from 'src/utils/constants';

@Injectable()
export class CustomerCareInquiriesRepository {
  private readonly logger = new Logger(CustomerCareInquiriesRepository.name);

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

      // Calculate priority automatically
      const priority = await calculateInquiryPriority(
        createDto,
        this.orderRepository
      );
      console.log(`Calculated priority: ${priority}`);

      // Find CustomerCare with least active inquiries if assignee_type is CUSTOMER_CARE
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
          // Update CustomerCare's active_workload and is_assigned
          const points = getPriorityPoints(priority);
          await this.customerCareRepository.update(assignedCustomerCareId, {
            active_point: () => `active_point + ${points}`,
            active_workload: () => 'active_workload + 1',
            is_assigned: true
          });
          console.log(
            `Incremented active_point by ${points} and active_workload by 1 for CustomerCare: ${assignedCustomerCareId}`
          );
        } else {
          console.warn('No CustomerCare assigned, falling back to ADMIN');
          createDto.assignee_type = 'ADMIN';
          createDto.assigned_to = ADMIN_MOCK.admin_id; // Thay bằng ID admin mặc định
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
      const currentInquiry = await this.repository.findOne({
        where: { id },
        relations: ['assigned_customer_care']
      });
      if (!currentInquiry) {
        throw new Error('Inquiry not found');
      }

      // If status changes to RESOLVED or CLOSED, update CustomerCare's workload
      if (
        updateDto.status &&
        ['RESOLVED', 'CLOSED'].includes(updateDto.status) &&
        currentInquiry.assigned_customer_care?.id
      ) {
        const customerCareId = currentInquiry.assigned_customer_care.id;
        await this.customerCareRepository.update(customerCareId, {
          active_workload: () => 'active_workload - 1'
        });

        // Check if workload is 0 and update is_assigned
        const customerCare = await this.customerCareRepository.findOne({
          where: { id: customerCareId }
        });
        if (customerCare && customerCare.active_workload <= 0) {
          await this.customerCareRepository.update(customerCareId, {
            is_assigned: false
          });
        }
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
    try {
      return await this.repository
        .createQueryBuilder('inquiry')
        .leftJoinAndSelect('inquiry.customer', 'customer')
        .leftJoinAndSelect('inquiry.assigned_admin', 'assigned_admin')
        .leftJoinAndSelect(
          'inquiry.assigned_customer_care',
          'assigned_customer_care'
        )
        .leftJoinAndSelect('inquiry.order', 'order')
        .where('inquiry.id = :id', { id })
        .getOne();
    } catch (error) {
      this.logger.error(
        `Error finding inquiry by id: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  async findAll(): Promise<CustomerCareInquiry[]> {
    try {
      return await this.repository
        .createQueryBuilder('inquiry')
        .leftJoinAndSelect('inquiry.customer', 'customer')
        .leftJoinAndSelect('inquiry.assigned_admin', 'assigned_admin')
        .leftJoinAndSelect(
          'inquiry.assigned_customer_care',
          'assigned_customer_care'
        )
        .leftJoinAndSelect('inquiry.order', 'order')
        .orderBy('inquiry.created_at', 'DESC')
        .getMany();
    } catch (error) {
      this.logger.error(
        `Error finding all inquiries: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  async findAllInquiriesByCCId(
    customerCareId: string
  ): Promise<CustomerCareInquiry[]> {
    try {
      if (!customerCareId) {
        throw new Error('CustomerCare ID is required');
      }

      console.log(`Finding inquiries for CustomerCare ID: ${customerCareId}`);

      const inquiries = await this.repository
        .createQueryBuilder('inquiry')
        .leftJoinAndSelect('inquiry.customer', 'customer')
        .leftJoinAndSelect('inquiry.assigned_admin', 'assigned_admin')
        .leftJoinAndSelect(
          'inquiry.assigned_customer_care',
          'assigned_customer_care'
        )
        .leftJoinAndSelect('inquiry.order', 'order')
        .where('inquiry.assigned_customer_care_id = :id', {
          id: customerCareId
        })
        .orderBy('inquiry.created_at', 'DESC')
        .getMany();

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

  async findAllInquiriesByCustomerId(
    customerId: string
  ): Promise<CustomerCareInquiry[]> {
    try {
      if (!customerId) {
        throw new Error('Customer ID is required');
      }

      console.log(`Finding inquiries for Customer ID: ${customerId}`);

      const inquiries = await this.repository
        .createQueryBuilder('inquiry')
        .leftJoinAndSelect('inquiry.customer', 'customer')
        .leftJoinAndSelect('inquiry.assigned_admin', 'assigned_admin')
        .leftJoinAndSelect(
          'inquiry.assigned_customer_care',
          'assigned_customer_care'
        )
        .leftJoinAndSelect('inquiry.order', 'order')
        .where('inquiry.customer_id = :customerId', { customerId })
        .orderBy('inquiry.created_at', 'DESC')
        .getMany();

      console.log(
        `Found ${inquiries.length} inquiries for Customer ID: ${customerId}`
      );

      return inquiries;
    } catch (error: any) {
      console.error(
        `Error finding inquiries for Customer ID ${customerId}:`,
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
    try {
      const inquiry = await this.findById(id);
      if (!inquiry) {
        throw new Error('Inquiry not found');
      }

      const escalationHistory = inquiry.escalation_history || [];
      escalationHistory.push({
        customer_care_id: customerCareId,
        reason,
        timestamp: Math.floor(Date.now() / 1000),
        escalated_to: escalatedTo,
        escalated_to_id: escalatedToId
      });

      await this.update(id, {
        status: 'ESCALATE',
        escalation_history: escalationHistory,
        escalation_count: inquiry.escalation_count + 1
      });

      return await this.findById(id);
    } catch (error) {
      this.logger.error(
        `Error escalating inquiry: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  /**
   * Reject an inquiry
   */
  async rejectInquiry(
    id: string,
    customerCareId: string,
    reason: string
  ): Promise<CustomerCareInquiry> {
    try {
      const inquiry = await this.findById(id);
      if (!inquiry) {
        throw new Error('Inquiry not found');
      }

      const rejectionHistory = inquiry.rejection_history || [];
      rejectionHistory.push({
        customer_care_id: customerCareId,
        reason,
        timestamp: Math.floor(Date.now() / 1000)
      });

      await this.update(id, {
        rejection_history: rejectionHistory,
        rejection_count: inquiry.rejection_count + 1
      });

      return await this.findById(id);
    } catch (error) {
      this.logger.error(
        `Error rejecting inquiry: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
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
  ): Promise<CustomerCareInquiry> {
    try {
      const inquiry = await this.findById(id);
      if (!inquiry) {
        throw new Error('Inquiry not found');
      }

      const transferHistory = inquiry.transfer_history || [];
      transferHistory.push({
        from_customer_care_id: fromCustomerCareId,
        to_customer_care_id: toCustomerCareId,
        reason,
        timestamp: Math.floor(Date.now() / 1000)
      });

      await this.update(id, {
        assigned_customer_care_id: toCustomerCareId,
        transfer_history: transferHistory,
        transfer_count: inquiry.transfer_count + 1
      });

      return await this.findById(id);
    } catch (error) {
      this.logger.error(
        `Error transferring inquiry: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  /**
   * Record a response to an inquiry
   */
  async recordResponse(id: string): Promise<CustomerCareInquiry> {
    try {
      const inquiry = await this.findById(id);
      if (!inquiry) {
        throw new Error('Inquiry not found');
      }

      const now = Math.floor(Date.now() / 1000);
      const updates: Partial<CustomerCareInquiry> = {
        last_response_at: now
      };

      if (!inquiry.first_response_at) {
        updates.first_response_at = now;
        updates.response_time = now - inquiry.created_at;
      }

      await this.update(id, updates);
      return await this.findById(id);
    } catch (error) {
      this.logger.error(
        `Error recording response: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
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
  ): Promise<CustomerCareInquiry> {
    try {
      const inquiry = await this.findById(id);
      if (!inquiry) {
        throw new Error('Inquiry not found');
      }

      const now = Math.floor(Date.now() / 1000);
      await this.update(id, {
        status: 'RESOLVED',
        resolution_type: resolutionType,
        resolution_notes: resolutionNotes,
        resolved_at: now,
        resolution_time: now - inquiry.created_at
      });

      return await this.findById(id);
    } catch (error) {
      this.logger.error(
        `Error resolving inquiry: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  /**
   * Get all escalated inquiries
   */
  async findAllEscalatedInquiries(): Promise<CustomerCareInquiry[]> {
    try {
      return await this.repository
        .createQueryBuilder('inquiry')
        .leftJoinAndSelect('inquiry.customer', 'customer')
        .leftJoinAndSelect('inquiry.assigned_admin', 'assigned_admin')
        .leftJoinAndSelect(
          'inquiry.assigned_customer_care',
          'assigned_customer_care'
        )
        .leftJoinAndSelect('inquiry.order', 'order')
        .where('inquiry.status = :status', { status: 'ESCALATE' })
        .orderBy('inquiry.created_at', 'DESC')
        .getMany();
    } catch (error: any) {
      console.error('Error finding escalated inquiries:', error);
      throw error;
    }
  }

  async findAllPaginated(
    skip: number,
    limit: number
  ): Promise<[CustomerCareInquiry[], number]> {
    try {
      return await this.repository
        .createQueryBuilder('inquiry')
        .leftJoinAndSelect('inquiry.customer', 'customer')
        .leftJoinAndSelect('inquiry.assigned_admin', 'assigned_admin')
        .leftJoinAndSelect(
          'inquiry.assigned_customer_care',
          'assigned_customer_care'
        )
        .leftJoinAndSelect('inquiry.order', 'order')
        .orderBy('inquiry.created_at', 'DESC')
        .skip(skip)
        .take(limit)
        .getManyAndCount();
    } catch (error) {
      this.logger.error(
        `Error finding paginated inquiries: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }
}
