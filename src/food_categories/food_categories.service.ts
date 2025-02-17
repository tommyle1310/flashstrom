import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateFoodCategoryDto } from './dto/create-food_category.dto';
import { UpdateFoodCategoryDto } from './dto/update-food_category.dto';
import { FoodCategory } from './food_categories.schema';
import { createResponse } from 'src/utils/createResponse';
import { ApiResponse } from 'src/utils/createResponse';

@Injectable()
export class FoodCategoriesService {
  constructor(
    @InjectModel('FoodCategory')
    private readonly foodCategoryModel: Model<FoodCategory>
  ) {}

  async create(
    createFoodCategoryDto: CreateFoodCategoryDto
  ): Promise<ApiResponse<FoodCategory>> {
    try {
      const existingCategory = await this.findCategoryByName(
        createFoodCategoryDto.name
      );
      if (existingCategory) {
        return this.handleDuplicateCategory();
      }

      const newCategory = await this.saveNewCategory(createFoodCategoryDto);
      return createResponse(
        'OK',
        newCategory,
        'Food category created successfully'
      );
    } catch (error) {
      return this.handleError('Error creating food category:', error);
    }
  }

  async findAll(): Promise<ApiResponse<FoodCategory[]>> {
    try {
      const categories = await this.foodCategoryModel.find().exec();
      return createResponse('OK', categories, 'Fetched all food categories');
    } catch (error) {
      return this.handleError('Error fetching food categories:', error);
    }
  }

  async findOne(id: string): Promise<ApiResponse<FoodCategory>> {
    try {
      const category = await this.foodCategoryModel.findById(id).exec();
      return this.handleCategoryResponse(category);
    } catch (error) {
      return this.handleError('Error fetching food category:', error);
    }
  }

  async update(
    id: string,
    updateFoodCategoryDto: UpdateFoodCategoryDto
  ): Promise<ApiResponse<FoodCategory>> {
    try {
      const updatedCategory = await this.foodCategoryModel
        .findByIdAndUpdate(id, updateFoodCategoryDto, { new: true })
        .exec();
      return this.handleCategoryResponse(updatedCategory);
    } catch (error) {
      return this.handleError('Error updating food category:', error);
    }
  }

  async remove(id: string): Promise<ApiResponse<null>> {
    try {
      const deletedCategory = await this.foodCategoryModel
        .findByIdAndDelete(id)
        .exec();
      if (!deletedCategory) {
        return createResponse('NotFound', null, 'Food category not found');
      }
      return createResponse('OK', null, 'Food category deleted successfully');
    } catch (error) {
      return this.handleError('Error deleting food category:', error);
    }
  }

  // Private helper methods
  private async findCategoryByName(name: string): Promise<FoodCategory | null> {
    return this.foodCategoryModel.findOne({ name }).exec();
  }

  private async saveNewCategory(
    categoryData: CreateFoodCategoryDto
  ): Promise<FoodCategory> {
    const newCategory = new this.foodCategoryModel({
      ...categoryData,
      created_at: new Date().getTime(),
      updated_at: new Date().getTime()
    });
    return newCategory.save();
  }

  private handleDuplicateCategory(): ApiResponse<null> {
    return createResponse(
      'DuplicatedRecord',
      null,
      'Food category with this name already exists'
    );
  }

  private handleCategoryResponse(
    category: FoodCategory | null
  ): ApiResponse<FoodCategory> {
    if (!category) {
      return createResponse('NotFound', null, 'Food category not found');
    }
    return createResponse(
      'OK',
      category,
      'Food category retrieved successfully'
    );
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
