import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateFoodCategoryDto } from './dto/create-food_category.dto';
import { UpdateFoodCategoryDto } from './dto/update-food_category.dto';
import { FoodCategory } from './food_categories.schema'; // Assuming a FoodCategory schema similar to your original schema
import { createResponse } from 'src/utils/createResponse'; // Utility for creating responses

@Injectable()
export class FoodCategoriesService {
  constructor(
    @InjectModel('FoodCategory')
    private readonly foodCategoryModel: Model<FoodCategory>,
  ) {}

  // Create a new food category
  async create(createFoodCategoryDto: CreateFoodCategoryDto): Promise<any> {
    const { name, description, avatar } = createFoodCategoryDto;

    // Check if the food category already exists
    const existingCategory = await this.foodCategoryModel
      .findOne({ name })
      .exec();
    if (existingCategory) {
      return createResponse(
        'DuplicatedRecord',
        null,
        'Food category with this name already exists',
      );
    }

    // Create a new food category
    const newFoodCategory = new this.foodCategoryModel({
      name,
      description,
      avatar,
      created_at: new Date().getTime(),
      updated_at: new Date().getTime(),
    });

    // Save the new food category and return a success response
    await newFoodCategory.save();
    return createResponse(
      'OK',
      newFoodCategory,
      'Food category created successfully',
    );
  }

  // Get all food categories
  async findAll(): Promise<any> {
    try {
      const foodCategories = await this.foodCategoryModel.find().exec();
      return createResponse(
        'OK',
        foodCategories,
        'Fetched all food categories',
      );
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while fetching food categories',
      );
    }
  }

  // Get a food category by ID
  async findOne(id: string): Promise<any> {
    const foodCategory = await this.foodCategoryModel.findById(id).exec();
    if (!foodCategory) {
      return createResponse('NotFound', null, 'Food category not found');
    }

    try {
      return createResponse(
        'OK',
        foodCategory,
        'Fetched food category successfully',
      );
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while fetching the food category',
      );
    }
  }

  // Update a food category by ID
  async update(
    id: string,
    updateFoodCategoryDto: UpdateFoodCategoryDto,
  ): Promise<any> {
    const updatedFoodCategory = await this.foodCategoryModel
      .findByIdAndUpdate(id, updateFoodCategoryDto, { new: true })
      .exec();

    if (!updatedFoodCategory) {
      return createResponse('NotFound', null, 'Food category not found');
    }

    try {
      return createResponse(
        'OK',
        updatedFoodCategory,
        'Food category updated successfully',
      );
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while updating the food category',
      );
    }
  }

  // Delete a food category by ID
  async remove(id: string): Promise<any> {
    const deletedFoodCategory = await this.foodCategoryModel
      .findByIdAndDelete(id)
      .exec();

    if (!deletedFoodCategory) {
      return createResponse('NotFound', null, 'Food category not found');
    }

    try {
      return createResponse('OK', null, 'Food category deleted successfully');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while deleting the food category',
      );
    }
  }
}
