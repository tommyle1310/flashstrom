import { Injectable, Logger } from '@nestjs/common';
import { CustomerCareInquiriesRepository } from './customer_cares_inquires.repository';
import { CreateCustomerCareInquiryDto } from './dto/create-customer-care-inquiry.dto';
import { UpdateCustomerCareInquiryDto } from './dto/update-customer-care-inquiry.dto';
import { ApiResponse, createResponse } from 'src/utils/createResponse';
import { RedisService } from 'src/redis/redis.service';
import { CustomerCareInquiry } from './entities/customer_care_inquiry.entity';

const logger = new Logger('CustomerCareInquiriesService');

@Injectable()
export class CustomerCareInquiriesService {
  constructor(
    private readonly repository: CustomerCareInquiriesRepository,
    private readonly redisService: RedisService
  ) {}

  async create(createDto: CreateCustomerCareInquiryDto) {
    const start = Date.now();
    try {
      if (!createDto.assignee_type) {
        createDto.assignee_type = 'ADMIN'; // or 'CUSTOMER_CARE' if that's your default
      }
      const inquiry = await this.repository.create(createDto);

      // Invalidate relevant caches
      if (inquiry.assigned_customer_care) {
        await this.redisService.del(
          `inquiries:customer_care:${inquiry.assigned_customer_care.id}`
        );
      }
      await this.redisService.del('inquiries:all');

      logger.log(`Created inquiry in ${Date.now() - start}ms`);
      return createResponse('OK', inquiry, 'Inquiry created successfully');
    } catch (error: any) {
      logger.error('Error creating inquiry:', error);
      return createResponse('ServerError', null, 'Failed to create inquiry');
    }
  }

  async findAll() {
    const start = Date.now();
    const cacheKey = 'inquiries:all';

    try {
      // Try to get from Redis cache first
      const cachedInquiries = await this.redisService.get(cacheKey);
      if (cachedInquiries) {
        logger.log('Cache hit for all inquiries');
        return createResponse(
          'OK',
          JSON.parse(cachedInquiries),
          'Fetched inquiries (from cache)'
        );
      }

      logger.log('Cache miss for all inquiries');
      const inquiries = await this.repository.findAll();

      // Cache the results for 5 minutes (300 seconds)
      await this.redisService.set(cacheKey, JSON.stringify(inquiries), 300);

      logger.log(`Fetched all inquiries in ${Date.now() - start}ms`);
      return createResponse('OK', inquiries, 'Inquiries fetched successfully');
    } catch (error: any) {
      logger.error('Error fetching inquiries:', error);
      return createResponse('ServerError', null, 'Failed to fetch inquiries');
    }
  }

  async findById(id: string) {
    const start = Date.now();
    const cacheKey = `inquiry:${id}`;

    try {
      // Try to get from Redis cache first
      const cachedInquiry = await this.redisService.get(cacheKey);
      if (cachedInquiry) {
        logger.log(`Cache hit for inquiry ${id}`);
        return createResponse(
          'OK',
          JSON.parse(cachedInquiry),
          'Fetched inquiry (from cache)'
        );
      }

      logger.log(`Cache miss for inquiry ${id}`);
      const inquiry = await this.repository.findById(id);

      if (!inquiry) {
        return createResponse('NotFound', null, 'Inquiry not found');
      }

      // Cache the result for 5 minutes (300 seconds)
      await this.redisService.set(cacheKey, JSON.stringify(inquiry), 300);

      logger.log(`Fetched inquiry ${id} in ${Date.now() - start}ms`);
      return createResponse('OK', inquiry, 'Inquiry fetched successfully');
    } catch (error: any) {
      logger.error(`Error fetching inquiry ${id}:`, error);
      return createResponse('ServerError', null, 'Failed to fetch inquiry');
    }
  }

  async findAllInquiriesByCCId(id: string) {
    const start = Date.now();
    const cacheKey = `inquiries:customer_care:${id}`;

    try {
      // Try to get from Redis cache first
      const cachedInquiries = await this.redisService.get(cacheKey);
      if (cachedInquiries) {
        logger.log(`Cache hit for customer care ${id} inquiries`);
        return createResponse(
          'OK',
          JSON.parse(cachedInquiries),
          'Fetched inquiries (from cache)'
        );
      }

      logger.log(`Cache miss for customer care ${id} inquiries`);
      const inquiries = await this.repository.findAllInquiriesByCCId(id);

      if (!inquiries) {
        return createResponse('NotFound', null, 'Inquiries not found');
      }

      // Cache the results for 5 minutes (300 seconds)
      await this.redisService.set(cacheKey, JSON.stringify(inquiries), 300);

      logger.log(
        `Fetched inquiries for customer care ${id} in ${Date.now() - start}ms`
      );
      return createResponse('OK', inquiries, 'Inquiries fetched successfully');
    } catch (error: any) {
      logger.error(`Error fetching inquiries for customer care ${id}:`, error);
      return createResponse('ServerError', null, 'Failed to fetch inquiries');
    }
  }

  async findAllInquiriesByCustomerId(customerId: string) {
    const start = Date.now();
    const cacheKey = `inquiries:customer:${customerId}`;

    try {
      // Try to get from Redis cache first
      const cachedInquiries = await this.redisService.get(cacheKey);
      if (cachedInquiries) {
        logger.log(`Cache hit for customer ${customerId} inquiries`);
        return createResponse(
          'OK',
          JSON.parse(cachedInquiries),
          'Fetched customer inquiries (from cache)'
        );
      }

      logger.log(`Cache miss for customer ${customerId} inquiries`);
      const inquiries =
        await this.repository.findAllInquiriesByCustomerId(customerId);

      if (!inquiries) {
        return createResponse('NotFound', null, 'Customer inquiries not found');
      }

      // Cache the results for 5 minutes (300 seconds)
      await this.redisService.set(cacheKey, JSON.stringify(inquiries), 300);

      logger.log(
        `Fetched inquiries for customer ${customerId} in ${Date.now() - start}ms`
      );
      return createResponse(
        'OK',
        inquiries,
        'Customer inquiries fetched successfully'
      );
    } catch (error: any) {
      logger.error(
        `Error fetching inquiries for customer ${customerId}:`,
        error
      );
      return createResponse(
        'ServerError',
        null,
        'Failed to fetch customer inquiries'
      );
    }
  }

  async update(id: string, updateDto: UpdateCustomerCareInquiryDto) {
    const start = Date.now();
    try {
      const inquiry = await this.repository.findById(id);
      if (!inquiry) {
        return createResponse('NotFound', null, 'Inquiry not found');
      }

      const updated = await this.repository.update(id, updateDto);

      // Invalidate relevant caches
      await this.redisService.del(`inquiry:${id}`);
      if (inquiry.assigned_customer_care) {
        await this.redisService.del(
          `inquiries:customer_care:${inquiry.assigned_customer_care.id}`
        );
      }
      await this.redisService.del('inquiries:all');

      logger.log(`Updated inquiry ${id} in ${Date.now() - start}ms`);
      return createResponse('OK', updated, 'Inquiry updated successfully');
    } catch (error: any) {
      logger.error(`Error updating inquiry ${id}:`, error);
      return createResponse('ServerError', null, 'Failed to update inquiry');
    }
  }

  async remove(id: string) {
    const start = Date.now();
    try {
      const inquiry = await this.repository.findById(id);
      if (!inquiry) {
        return createResponse('NotFound', null, 'Inquiry not found');
      }

      await this.repository.remove(id);

      // Invalidate relevant caches
      await this.redisService.del(`inquiry:${id}`);
      if (inquiry.assigned_customer_care) {
        await this.redisService.del(
          `inquiries:customer_care:${inquiry.assigned_customer_care.id}`
        );
      }
      await this.redisService.del('inquiries:all');

      logger.log(`Removed inquiry ${id} in ${Date.now() - start}ms`);
      return createResponse('OK', null, 'Inquiry deleted successfully');
    } catch (error: any) {
      logger.error(`Error removing inquiry ${id}:`, error);
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

  /**
   * Get all escalated inquiries
   */
  async findAllEscalatedInquiries() {
    const start = Date.now();
    const cacheKey = 'inquiries:escalated';

    try {
      // Try to get from Redis cache first
      const cachedInquiries = await this.redisService.get(cacheKey);
      if (cachedInquiries) {
        logger.log('Cache hit for escalated inquiries');
        return createResponse(
          'OK',
          JSON.parse(cachedInquiries),
          'Fetched escalated inquiries (from cache)'
        );
      }

      logger.log('Cache miss for escalated inquiries');
      const inquiries = await this.repository.findAllEscalatedInquiries();

      if (!inquiries) {
        return createResponse('NotFound', null, 'No escalated inquiries found');
      }

      // Cache the results for 5 minutes (300 seconds)
      await this.redisService.set(cacheKey, JSON.stringify(inquiries), 300);

      logger.log(`Fetched escalated inquiries in ${Date.now() - start}ms`);
      return createResponse(
        'OK',
        inquiries,
        'Escalated inquiries fetched successfully'
      );
    } catch (error: any) {
      logger.error('Error fetching escalated inquiries:', error);
      return createResponse(
        'ServerError',
        null,
        'Failed to fetch escalated inquiries'
      );
    }
  }

  async findAllPaginated(
    page: number = 1,
    limit: number = 10
  ): Promise<
    ApiResponse<{
      totalPages: number;
      currentPage: number;
      totalItems: number;
      items: CustomerCareInquiry[];
    }>
  > {
    try {
      const skip = (page - 1) * limit;
      const [inquiries, total] = await this.repository.findAllPaginated(
        skip,
        limit
      );
      const totalPages = Math.ceil(total / limit);

      return createResponse(
        'OK',
        {
          totalPages,
          currentPage: page,
          totalItems: total,
          items: inquiries
        },
        'Fetched paginated customer care inquiries'
      );
    } catch (error: any) {
      console.error('Error fetching paginated customer care inquiries:', error);
      return createResponse(
        'ServerError',
        null,
        'Error fetching paginated customer care inquiries'
      );
    }
  }
}
