import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { Promotion } from './promotions.schema'; // Assuming Promotion schema is similar to the one we've defined earlier
import { createResponse } from 'src/utils/createResponse'; // Utility for creating responses
import { ApiResponse } from 'src/utils/createResponse';

@Injectable()
export class PromotionsService {
  constructor(
    @InjectModel('Promotion') private readonly promotionModel: Model<Promotion>
  ) {}

  // Create a new promotion

  async create(createPromotionDto: CreatePromotionDto): Promise<any> {
    const {
      name,
      description,
      start_date,
      end_date,
      status,
      discount_type,
      discount_value,
      food_categories,
      minimum_order_value,
      promotion_cost_price,
      bogo_details,
    } = createPromotionDto;

  async create(
    createPromotionDto: CreatePromotionDto
  ): Promise<ApiResponse<Promotion>> {
    try {
      const existingPromotion = await this.findPromotionByName(
        createPromotionDto.name
      );
      if (existingPromotion) {
        return this.handleDuplicatePromotion();
      }


      const newPromotion = await this.saveNewPromotion(createPromotionDto);
      return createResponse(
        'OK',
        newPromotion,
        'Promotion created successfully'
      );
    } catch (error) {
      return this.handleError('Error creating promotion:', error);
    }


    // Create the new promotion
    const newPromotion = new this.promotionModel({
      name,
      description,
      start_date,
      end_date,
      status,
      discount_type,
      discount_value,
      food_categories,
      minimum_order_value,
      promotion_cost_price,
      bogo_details: discount_type === 'BOGO' ? bogo_details : undefined,
      created_at: Math.floor(Date.now() / 1000),
      updated_at: Math.floor(Date.now() / 1000),
    });

    // Save the promotion and return the success response
    await newPromotion.save();
    return createResponse('OK', newPromotion, 'Promotion created successfully');

  }

  // Get all promotions
  async findAll(): Promise<ApiResponse<Promotion[]>> {
    try {
      const promotions = await this.promotionModel.find().exec();
      return createResponse('OK', promotions, 'Fetched all promotions');
    } catch (error) {
      return this.handleError('Error fetching promotions:', error);
    }
  }

  // Get a promotion by ID
  async findOne(id: string): Promise<ApiResponse<Promotion>> {
    try {
      const promotion = await this.promotionModel.findById(id).exec();
      return this.handlePromotionResponse(promotion);
    } catch (error) {
      return this.handleError('Error fetching promotion:', error);
    }
  }

  // Update a promotion by ID
  async update(
    id: string,
    updatePromotionDto: UpdatePromotionDto
  ): Promise<ApiResponse<Promotion>> {
    try {
      const updatedPromotion = await this.promotionModel
        .findByIdAndUpdate(id, updatePromotionDto, { new: true })
        .exec();
      return this.handlePromotionResponse(updatedPromotion);
    } catch (error) {
      return this.handleError('Error updating promotion:', error);
    }
  }

  // Delete a promotion by ID
  async remove(id: string): Promise<ApiResponse<null>> {
    try {
      const deletedPromotion = await this.promotionModel
        .findByIdAndDelete(id)
        .exec();
      if (!deletedPromotion) {
        return createResponse('NotFound', null, 'Promotion not found');
      }
      return createResponse('OK', null, 'Promotion deleted successfully');
    } catch (error) {
      return this.handleError('Error deleting promotion:', error);
    }
  }

  // Private helper methods
  private async findPromotionByName(name: string): Promise<Promotion | null> {
    return this.promotionModel.findOne({ name }).exec();
  }

  private async saveNewPromotion(
    promotionData: CreatePromotionDto
  ): Promise<Promotion> {
    const newPromotion = new this.promotionModel({
      ...promotionData,
      created_at: new Date().getTime(),
      updated_at: new Date().getTime()
    });
    return newPromotion.save();
  }

  private handleDuplicatePromotion(): ApiResponse<null> {
    return createResponse(
      'DuplicatedRecord',
      null,
      'Promotion with this name already exists'
    );
  }

  private handlePromotionResponse(
    promotion: Promotion | null
  ): ApiResponse<Promotion> {
    if (!promotion) {
      return createResponse('NotFound', null, 'Promotion not found');
    }
    return createResponse('OK', promotion, 'Promotion retrieved successfully');
  }

  private handleError(message: string, error: any): ApiResponse<null> {
    console.error(message, error);
    return createResponse(
      'ServerError',
      null,
      'An error occurred while processing your request'
    );
  }
}
