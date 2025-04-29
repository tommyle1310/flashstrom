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
            : null
      };

      // Create the basic inquiry
      const inquiry: CustomerCareInquiry = this.repository.create(inquiryData);

      // Save without loading relations first
      const savedInquiry: CustomerCareInquiry =
        await this.repository.save(inquiry);
      console.log(`Saved inquiry with ID: ${savedInquiry.id}`);

      // Load the complete inquiry with appropriate relations
      const result = await this.repository.findOne({
        where: { id: savedInquiry.id },
        relations: [
          'customer',
          createDto.assignee_type === 'ADMIN'
            ? 'assigned_admin'
            : 'assigned_customer_care'
        ]
      });

      if (!result) {
        throw new Error('Failed to load saved inquiry');
      }

      return result;
    } catch (error: any) {
      console.error('Repository create error:', error);
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
}
