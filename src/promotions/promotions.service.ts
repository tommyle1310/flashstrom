import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { Promotion } from './promotions.schema'; // Assuming Promotion schema is similar to the one we've defined earlier
import { createResponse } from 'src/utils/createResponse'; // Utility for creating responses

@Injectable()
export class PromotionsService {
  constructor(
    @InjectModel('Promotion') private readonly promotionModel: Model<Promotion>,
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
    } = createPromotionDto;

    // Check if the promotion already exists by name or other unique fields
    const existingPromotion = await this.promotionModel
      .findOne({ name })
      .exec();
    if (existingPromotion) {
      return createResponse(
        'DuplicatedRecord',
        null,
        'Promotion with this name already exists',
      );
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
      created_at: new Date().getTime(),
      updated_at: new Date().getTime(),
    });

    // Save the promotion and return the success response
    await newPromotion.save();
    return createResponse('OK', newPromotion, 'Promotion created successfully');
  }

  // Get all promotions
  async findAll(): Promise<any> {
    try {
      const promotions = await this.promotionModel.find().exec();
      return createResponse('OK', promotions, 'Fetched all promotions');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while fetching promotions',
      );
    }
  }

  // Get a promotion by ID
  async findOne(id: string): Promise<any> {
    const promotion = await this.promotionModel.findById(id).exec();
    if (!promotion) {
      return createResponse('NotFound', null, 'Promotion not found');
    }

    try {
      return createResponse('OK', promotion, 'Fetched promotion successfully');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while fetching the promotion',
      );
    }
  }

  // Update a promotion by ID
  async update(
    id: string,
    updatePromotionDto: UpdatePromotionDto,
  ): Promise<any> {
    const updatedPromotion = await this.promotionModel
      .findByIdAndUpdate(id, updatePromotionDto, { new: true })
      .exec();

    if (!updatedPromotion) {
      return createResponse('NotFound', null, 'Promotion not found');
    }

    try {
      return createResponse(
        'OK',
        updatedPromotion,
        'Promotion updated successfully',
      );
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while updating the promotion',
      );
    }
  }

  // Delete a promotion by ID
  async remove(id: string): Promise<any> {
    const deletedPromotion = await this.promotionModel
      .findByIdAndDelete(id)
      .exec();

    if (!deletedPromotion) {
      return createResponse('NotFound', null, 'Promotion not found');
    }

    try {
      return createResponse('OK', null, 'Promotion deleted successfully');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while deleting the promotion',
      );
    }
  }
}
