import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { Restaurant } from './restaurants.schema'; // Assuming the restaurant schema
import { Promotion } from 'src/promotions/promotions.schema';
import { User } from 'src/user/user.schema';
import { createResponse } from 'src/utils/createResponse';
import { AddressBook } from 'src/address_book/address_book.schema';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectModel('Restaurant')
    private readonly restaurantModel: Model<Restaurant>,
    @InjectModel('User') private readonly userModel: Model<User>,
    @InjectModel('Promotion') private readonly promotionModel: Model<Promotion>,
    @InjectModel('AddressBook')
    private readonly addressbookModel: Model<AddressBook>,
  ) {}

  // Create a new restaurant
  async create(createRestaurantDto: CreateRestaurantDto): Promise<any> {
    const { owner_id, promotions, address } = createRestaurantDto;

    // Check if owner_id exists in the User collection
    const owner = await this.userModel.findById(owner_id).exec();
    console.log('check', owner, owner_id);
    
    if (!owner) {
      return createResponse('NotFound', null, 'Owner not found');
    }

    // Check if the address exists in the AddressBook collection
    const addressBookEntry = await this.addressbookModel
      .findById(address)
      .exec();
    if (!addressBookEntry) {
      return createResponse(
        'NotFound',
        null,
        'Address not found in address book',
      );
    }

    if (promotions) {
      // Check if promotions exist in the Promotion collection
      for (const promotionId of promotions) {
        const promotion = await this.promotionModel
          .findById(promotionId)
          .exec();
        if (!promotion) {
          return createResponse(
            'NotFound',
            null,
            `Promotion with ID ${promotionId} not found`,
          );
        }
      }
    }

    // Create a new restaurant
    const newRestaurant = new this.restaurantModel(createRestaurantDto);
    await newRestaurant.save();

    return createResponse(
      'OK',
      newRestaurant,
      'Restaurant created successfully',
    );
  }

  // Update a restaurant
  async update(
    id: string,
    updateRestaurantDto: UpdateRestaurantDto,
  ): Promise<any> {
    const { owner_id, promotions, address } = updateRestaurantDto;

    try {
      // Check if owner_id exists in the User collection
      if (owner_id) {
        const owner = await this.userModel.findById(owner_id).exec();
        if (!owner) {
          return createResponse('NotFound', null, 'Owner not found');
        }
      }

      // Check if the address exists in the AddressBook collection (if address is provided)
      if (address) {
        const addressBookEntry = await this.addressbookModel
          .findById(address)
          .exec();
        if (!addressBookEntry) {
          return createResponse(
            'NotFound',
            null,
            'Address not found in address book',
          );
        }
      }

      // Check if promotions exist in the Promotion collection (if promotions are provided)
      if (promotions) {
        for (const promotionId of promotions) {
          const promotion = await this.promotionModel
            .findById(promotionId)
            .exec();
          if (!promotion) {
            return createResponse(
              'NotFound',
              null,
              `Promotion with ID ${promotionId} not found`,
            );
          }
        }
      }

      // Update the restaurant
      const updatedRestaurant = await this.restaurantModel
        .findByIdAndUpdate(id, updateRestaurantDto, { new: true })
        .exec();

      if (!updatedRestaurant) {
        return createResponse('NotFound', null, 'Restaurant not found');
      }

      return createResponse(
        'OK',
        updatedRestaurant,
        'Restaurant updated successfully',
      );
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while updating the restaurant',
      );
    }
  }

  // Get all restaurants
  async findAll(): Promise<any> {
    try {
      const restaurants = await this.restaurantModel.find().exec();
      return createResponse('OK', restaurants, 'Fetched all restaurants');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while fetching restaurants',
      );
    }
  }

  // Get a restaurant by ID
  async findOne(id: string): Promise<any> {
    try {
      const restaurant = await this.restaurantModel.findById(id).exec();
      if (!restaurant) {
        return createResponse('NotFound', null, 'Restaurant not found');
      }
      return createResponse(
        'OK',
        restaurant,
        'Fetched restaurant successfully',
      );
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while fetching the restaurant',
      );
    }
  }

  // Delete a restaurant by ID
  async remove(id: string): Promise<any> {
    try {
      const deletedRestaurant = await this.restaurantModel
        .findByIdAndDelete(id)
        .exec();
      if (!deletedRestaurant) {
        return createResponse('NotFound', null, 'Restaurant not found');
      }
      return createResponse('OK', null, 'Restaurant deleted successfully');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while deleting the restaurant',
      );
    }
  }
}
