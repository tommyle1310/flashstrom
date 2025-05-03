import { Injectable } from '@nestjs/common';
import { CreateFAQDto } from './dto/create-faq.dto';
import { UpdateFAQDto } from './dto/update-faq.dto';
import { FAQ, FAQType } from './entities/faq.entity';
import { FAQsRepository } from './faq.repository';
import { createResponse } from 'src/utils/createResponse';
import { ApiResponse } from 'src/utils/createResponse';

@Injectable()
export class FAQsService {
  constructor(private readonly faqsRepository: FAQsRepository) {}

  async create(createFAQDto: CreateFAQDto): Promise<ApiResponse<FAQ>> {
    try {
      const savedFAQ = await this.faqsRepository.create({
        ...createFAQDto
      });
      return createResponse('OK', savedFAQ, 'FAQ created successfully');
    } catch (error: any) {
      console.log('error', error);
      return createResponse('ServerError', null, 'Error creating FAQ');
    }
  }

  async findAll(): Promise<ApiResponse<FAQ[]>> {
    try {
      const faqs = await this.faqsRepository.findAll();
      return createResponse('OK', faqs, 'FAQs retrieved successfully');
    } catch (error: any) {
      console.log('error', error);
      return createResponse('ServerError', null, 'Error fetching FAQs');
    }
  }

  async findActive(): Promise<ApiResponse<FAQ[]>> {
    try {
      const faqs = await this.faqsRepository.findActive();
      return createResponse('OK', faqs, 'Active FAQs retrieved successfully');
    } catch (error: any) {
      console.log('error', error);
      return createResponse('ServerError', null, 'Error fetching active FAQs');
    }
  }

  async findByType(type: FAQType): Promise<ApiResponse<FAQ[]>> {
    try {
      const faqs = await this.faqsRepository.findByType(type);
      return createResponse(
        'OK',
        faqs,
        `FAQs of type ${type} retrieved successfully`
      );
    } catch (error: any) {
      console.log('error', error);
      return createResponse(
        'ServerError',
        null,
        `Error fetching FAQs of type ${type}`
      );
    }
  }

  async findOne(id: string): Promise<ApiResponse<FAQ>> {
    try {
      const faq = await this.faqsRepository.findById(id);
      if (!faq) {
        return createResponse('NotFound', null, 'FAQ not found');
      }
      return createResponse('OK', faq, 'FAQ retrieved successfully');
    } catch (error: any) {
      console.log('error', error);
      return createResponse('ServerError', null, 'Error fetching FAQ');
    }
  }

  async update(
    id: string,
    updateFAQDto: UpdateFAQDto
  ): Promise<ApiResponse<FAQ>> {
    try {
      const faq = await this.faqsRepository.findById(id);
      if (!faq) {
        return createResponse('NotFound', null, 'FAQ not found');
      }
      await this.faqsRepository.update(id, updateFAQDto);
      const updatedFAQ = await this.faqsRepository.findById(id);
      return createResponse('OK', updatedFAQ, 'FAQ updated successfully');
    } catch (error: any) {
      console.log('error', error);
      return createResponse('ServerError', null, 'Error updating FAQ');
    }
  }

  async remove(id: string): Promise<ApiResponse<null>> {
    try {
      const result = await this.faqsRepository.delete(id);
      if (result.affected === 0) {
        return createResponse('NotFound', null, 'FAQ not found');
      }
      return createResponse('OK', null, 'FAQ deleted successfully');
    } catch (error: any) {
      console.log('error', error);
      return createResponse('ServerError', null, 'Error deleting FAQ');
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
      items: FAQ[];
    }>
  > {
    try {
      const skip = (page - 1) * limit;
      const [faqs, total] = await this.faqsRepository.findAllPaginated(
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
          items: faqs
        },
        'Fetched paginated FAQs'
      );
    } catch (error: any) {
      console.error('Error fetching paginated FAQs:', error);
      return createResponse(
        'ServerError',
        null,
        'Error fetching paginated FAQs'
      );
    }
  }
}
