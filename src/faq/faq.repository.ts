import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FAQ, FAQStatus, FAQType } from './entities/faq.entity';
import { UpdateFAQDto } from './dto/update-faq.dto';

@Injectable()
export class FAQsRepository {
  constructor(
    @InjectRepository(FAQ)
    public faqRepository: Repository<FAQ>
  ) {}

  async create(faqData: Partial<FAQ>): Promise<FAQ> {
    const newFAQ = this.faqRepository.create(faqData);
    return this.faqRepository.save(newFAQ);
  }

  async findAll(): Promise<FAQ[]> {
    return this.faqRepository.find();
  }

  async findActive(): Promise<FAQ[]> {
    return this.faqRepository.find({ where: { status: FAQStatus.ACTIVE } });
  }

  async findByType(type: FAQType): Promise<FAQ[]> {
    return this.faqRepository.find({
      where: { type, status: FAQStatus.ACTIVE }
    });
  }

  async findById(id: string): Promise<FAQ | null> {
    return this.faqRepository.findOne({ where: { id } });
  }

  async update(id: string, updateData: UpdateFAQDto): Promise<void> {
    await this.faqRepository.update(id, updateData);
  }

  async delete(id: string): Promise<{ affected?: number }> {
    return this.faqRepository.delete(id);
  }

  async findAllPaginated(
    skip: number,
    limit: number
  ): Promise<[FAQ[], number]> {
    return await this.faqRepository.findAndCount({
      skip,
      take: limit
    });
  }
}
