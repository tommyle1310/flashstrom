import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RatingsReview } from './entities/ratings_review.entity';
import { CreateRatingsReviewDto } from './dto/create-ratings_review.dto';
import { UpdateRatingsReviewDto } from './dto/update-ratings_review.dto';

@Injectable()
export class RatingsReviewsRepository {
  constructor(
    @InjectRepository(RatingsReview)
    private repository: Repository<RatingsReview>
  ) {}

  async create(createDto: CreateRatingsReviewDto): Promise<RatingsReview> {
    const review = this.repository.create(createDto);
    return await this.repository.save(review);
  }

  async findAll(query: Record<string, any> = {}): Promise<RatingsReview[]> {
    const whereClause: Record<string, any> = {};

    // Map the query parameters to the correct entity property names
    if (query.rr_recipient_driver_id) {
      whereClause.rr_recipient_driver_id = query.rr_recipient_driver_id;
    }
    if (query.rr_recipient_restaurant_id) {
      whereClause.rr_recipient_restaurant_id = query.rr_recipient_restaurant_id;
    }
    if (query.rr_recipient_customer_id) {
      whereClause.rr_recipient_customer_id = query.rr_recipient_customer_id;
    }
    if (query.rr_recipient_customercare_id) {
      whereClause.rr_recipient_customercare_id =
        query.rr_recipient_customercare_id;
    }
    if (query.recipient_type) {
      whereClause.recipient_type = query.recipient_type;
    }

    return await this.repository.find({
      where: whereClause,
      relations: [
        'reviewer_customer',
        'reviewer_restaurant',
        'reviewer_driver',
        'reviewer_customercare',
        'order'
      ]
    });
  }

  async findById(id: string): Promise<RatingsReview> {
    return await this.repository.findOne({ where: { id } });
  }

  async findOne(query: Record<string, any>): Promise<RatingsReview> {
    return await this.repository.findOne({ where: query });
  }

  async update(
    id: string,
    updateDto: UpdateRatingsReviewDto
  ): Promise<RatingsReview> {
    await this.repository.update(id, {
      ...updateDto,
      updated_at: Math.floor(Date.now() / 1000)
    });
    return await this.findById(id);
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected > 0;
  }
}
