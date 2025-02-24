import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Restaurant } from './restaurants.schema';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

@Injectable()
export class RestaurantRepository {
  constructor(
    @InjectModel('Restaurant')
    private readonly restaurantModel: Model<Restaurant>
  ) {}

  async create(createRestaurantDto: CreateRestaurantDto): Promise<Restaurant> {
    const newRestaurant = new this.restaurantModel(createRestaurantDto);
    return await newRestaurant.save();
  }

  async findById(id: string): Promise<Restaurant> {
    return await this.restaurantModel
      .findById(id)
      .populate('promotions', '-created_at -updated_at')
      .populate('specialize_in', '-created_at -updated_at')
      .populate('address', '-created_at -updated_at')
      .exec();
  }

  async findAll(): Promise<Restaurant[]> {
    return await this.restaurantModel
      .find()
      .populate('address', '-created_at -updated_at')
      .populate('promotions', '-created_at -updated_at')
      .populate('specialize_in', '-created_at -updated_at')
      .exec();
  }

  async update(
    id: string,
    updateData: UpdateRestaurantDto
  ): Promise<Restaurant> {
    return await this.restaurantModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
  }

  async delete(id: string): Promise<Restaurant> {
    return await this.restaurantModel.findByIdAndDelete(id).exec();
  }
}
