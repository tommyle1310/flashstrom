import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promotion } from './entities/promotion.entity';
// import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

@Injectable()
export class PromotionsRepository {
  constructor(
    @InjectRepository(Promotion)
    private promotionRepository: Repository<Promotion>
  ) {}

  async create(promotionData: Partial<Promotion>): Promise<Promotion> {
    const newPromotion = this.promotionRepository.create(promotionData);
    return this.promotionRepository.save(newPromotion);
  }

  async findAll(): Promise<Promotion[]> {
    return this.promotionRepository.find();
  }

  async findById(id: string): Promise<Promotion | null> {
    return this.promotionRepository.findOne({ where: { id } });
  }

  async findByName(name: string): Promise<Promotion | null> {
    return this.promotionRepository.findOne({ where: { name } });
  }

  async update(id: string, updateData: UpdatePromotionDto): Promise<void> {
    await this.promotionRepository.update(id, updateData);
  }

  async delete(id: string): Promise<{ affected?: number }> {
    return this.promotionRepository.delete(id);
  }

  async findByIds(ids: string[]): Promise<Promotion[]> {
    return await this.promotionRepository.findByIds(ids);
  }
}
