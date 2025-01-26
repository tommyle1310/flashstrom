import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer } from './customer.schema'; // Assuming a Customer schema similar to User schema
import { createResponse } from 'src/utils/createResponse'; // Importing the utility for response creation
import { User } from 'src/user/user.schema';
import { Restaurant } from 'src/restaurants/restaurants.schema';
import { AddressBook } from 'src/address_book/address_book.schema';
import { FoodCategory } from 'src/food_categories/food_categories.schema';

export interface AddressPopulate {
  _id?: string;
  street?: string;
  city?: string;
  postal_code?: number;
  location?: {
    lat?: number;
    lon?: number;
  };
}

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel('Customer') private readonly customerModel: Model<Customer>,
    @InjectModel('Restaurant')
    private readonly restaurantModel: Model<Restaurant>,
    @InjectModel('User') private readonly userModel: Model<User>,
    @InjectModel('FoodCategory')
    private readonly FoodCategoryModel: Model<FoodCategory>,
    @InjectModel('AddressBook')
    private readonly addressBookModel: Model<AddressBook>,
  ) {}

  // Create a new customer
  async create(createCustomerDto: CreateCustomerDto): Promise<any> {
    const {
      user_id,
      first_name,
      last_name,
      avatar,
      preferred_category,
      favorite_restaurants,
      favorite_items,
      support_tickets,
      app_preferences,
      created_at,
      updated_at,
    } = createCustomerDto;

    // Check if the customer already exists by user ID or email (or other criteria)
    const existingUser = await this.userModel.findOne({ user_id }).exec();
    if (existingUser) {
      return createResponse(
        'DuplicatedRecord',
        null,
        'This userId is not existed',
      );
    }
    const existingCustomer = await this.customerModel
      .findOne({ user_id })
      .exec();
    if (existingCustomer) {
      return createResponse(
        'DuplicatedRecord',
        null,
        'Customer with this user ID already exists',
      );
    }

    try {
      // Create new customer
      const newCustomer = new this.customerModel({
        user_id,
        first_name,
        last_name,
        avatar,
        preferred_category,
        favorite_restaurants,
        favorite_items,
        support_tickets,
        app_preferences,
        created_at,
        updated_at,
      });

      // Save the new customer and return a success response
      await newCustomer.save();
      return createResponse('OK', newCustomer, 'Customer created successfully');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while creating the customer',
      );
    }
  }

  // Get all customers
  async findAll(): Promise<any> {
    try {
      const customers = await this.customerModel.find().exec();
      return createResponse('OK', customers, 'Fetched all customers');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while fetching customers',
      );
    }
  }

  // Get a customer by ID
  async findCustomerById(id: string): Promise<any> {
    const customer = await this.customerModel.findById(id).exec();
    if (!customer) {
      return createResponse('NotFound', null, 'Customer not found');
    }

    try {
      return createResponse('OK', customer, 'Fetched customer successfully');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while fetching the customer',
      );
    }
  }

  async findOne(conditions: object): Promise<any> {
    const customer = await this.customerModel.findOne(conditions).exec();
    if (!customer) {
      return createResponse('NotFound', null, 'Customer not found');
    }
    try {
      return createResponse('OK', customer, 'Fetched customer successfully');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while fetching the customer',
      );
    }
  }

  // Update a customer by ID
  async update(id: string, updateCustomerDto: UpdateCustomerDto): Promise<any> {
    // Retrieve the customer from the database
    const customer = await this.customerModel.findById(id).exec();
    if (!customer) {
      return createResponse('NotFound', null, 'Customer not found');
    }

    // Check if the provided address exists in the AddressModel
    if (updateCustomerDto.address) {
      const addressExists = await this.addressBookModel
        .findById(updateCustomerDto.address)
        .exec();

      // If the address does not exist in the AddressModel, return a not found response
      if (!addressExists) {
        return createResponse(
          'NotFound',
          null,
          'Address not found in the address model',
        );
      }

      // Toggle the address in the customer's address array
      const addressIndex = customer.address.indexOf(updateCustomerDto.address);
      if (addressIndex !== -1) {
        // If the address exists, remove it
        customer.address.splice(addressIndex, 1);
      } else {
        // If the address doesn't exist, push it
        customer.address.push(updateCustomerDto.address);
      }
    }

    // Check if the provided favorite_restaurants exists in the RestaurantModel
    if (updateCustomerDto.favorite_restaurants) {
      const restaurantExists = await this.restaurantModel
        .findById(updateCustomerDto.favorite_restaurants)
        .exec();

      // If the restaurant does not exist in the RestaurantModel, return a not found response
      if (!restaurantExists) {
        return createResponse(
          'NotFound',
          null,
          'Restaurant not found in the restaurant model',
        );
      }

      // Toggle the restaurant in the customer's favorite_restaurants array
      const restaurantIndex = customer.favorite_restaurants.indexOf(
        updateCustomerDto.favorite_restaurants,
      );
      if (restaurantIndex !== -1) {
        // If the restaurant exists, remove it
        customer.favorite_restaurants.splice(restaurantIndex, 1);
      } else {
        // If the restaurant doesn't exist, push it
        customer.favorite_restaurants.push(
          updateCustomerDto.favorite_restaurants,
        );
      }
    }

    // Check if the provided preferred_category exists in the FoodCategoryModel
    if (updateCustomerDto.preferred_category) {
      const categoryExists = await this.FoodCategoryModel.findById(
        updateCustomerDto.preferred_category,
      ).exec();

      // If the preferred category does not exist in the FoodCategoryModel, return a not found response
      if (!categoryExists) {
        return createResponse(
          'NotFound',
          null,
          'Preferred category not found in the food category model',
        );
      }

      // Toggle the preferred category in the customer's preferred_category array
      const categoryIndex = customer.preferred_category.indexOf(
        updateCustomerDto.preferred_category,
      );
      if (categoryIndex !== -1) {
        // If the preferred category exists, remove it
        customer.preferred_category.splice(categoryIndex, 1);
      } else {
        // If the preferred category doesn't exist, push it
        customer.preferred_category.push(updateCustomerDto.preferred_category);
      }
    }

    // Save the updated customer with the new address, favorite restaurant, and/or preferred category (if applicable)
    const updatedCustomer = await customer.save();

    return createResponse(
      'OK',
      updatedCustomer,
      'Customer updated successfully',
    );
  }

  // Delete a customer by ID
  async remove(id: string): Promise<any> {
    const deletedCustomer = await this.customerModel
      .findByIdAndDelete(id)
      .exec();

    if (!deletedCustomer) {
      return createResponse('NotFound', null, 'Customer not found');
    }

    try {
      return createResponse('OK', null, 'Customer deleted successfully');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while deleting the customer',
      );
    }
  }

  async updateEntityAvatar(
    uploadResult: { url: string; public_id: string },
    entityId: string,
  ) {
    const customer = await this.customerModel.findByIdAndUpdate(
      entityId,
      { avatar: { url: uploadResult.url, key: uploadResult.public_id } },
      { new: true },
    );

    if (!customer) {
      return createResponse('NotFound', null, 'Customer not found');
    }

    return createResponse(
      'OK',
      customer,
      'Customer avatar updated successfully',
    );
  }

  // Helper function to check if a restaurant is open based on the current time
  private isRestaurantOpen(restaurant: Restaurant): boolean {
    const currentDay = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentTime = new Date().getHours() * 60 + new Date().getMinutes(); // Convert current time to minutes

    const openingHours = restaurant.opening_hours;
    const dayOfWeek = Object.keys(openingHours)[currentDay]; // Get the opening hours for today

    if (openingHours[dayOfWeek]) {
      const { from, to } = openingHours[dayOfWeek];
      return currentTime >= from && currentTime <= to;
    }
    return false;
  }

  // Haversine formula to calculate the distance between two lat/lon points (in km)
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  }

  async getAllRestaurants(customerId: string): Promise<any> {
    try {
      // Fetch customer data to get preferences and restaurant history
      const customer = await this.customerModel
        .findById(customerId)
        .populate('address', '-created_at -updated_at') // Populate address field
        .exec();

      if (!customer) {
        return createResponse('NotFound', null, 'Customer not found');
      }

      const {
        preferred_category,
        restaurant_history,
        address: customerAddress, // customerAddress should be populated now
      } = customer;

      // Make sure the customer address is treated as an array of AddressPopulate objects
      const customerAddressArray = customerAddress as AddressPopulate[];

      // Fetch all restaurants
      const restaurants = await this.restaurantModel
        .find()
        .populate('address', '-created_at -updated_at') // Populate restaurant address
        .populate('promotions', '-created_at -updated_at')
        .populate('specialize_in', '-created_at -updated_at')
        .exec();

      // Prioritize restaurants based on the preferred categories, restaurant history, and distance
      const prioritizedRestaurants = restaurants
        .map((restaurant) => {
          // Type assertion to treat customerAddress as an array of objects and each with a location
          const customerLocation = (customerAddressArray &&
            customerAddressArray[0]?.location) as
            | AddressPopulate['location']
            | undefined;

          // Ensure restaurant.address is treated as an AddressPopulate object
          const restaurantAddress = restaurant.address as
            | AddressPopulate
            | undefined;

          // If either location is missing, return the restaurant with a priority score of 0
          if (!customerLocation || !restaurantAddress?.location) {
            return { ...restaurant.toObject(), priorityScore: 0 }; // Default score if no address or location
          }

          const restaurantLocation = restaurantAddress.location;

          // Check if the restaurant matches the customer's preferred category
          const isPreferred = restaurant.specialize_in.some((category) =>
            preferred_category.includes(category),
          );

          // Find how many times the customer has visited this restaurant
          const visitHistory = restaurant_history.find(
            (history) => history.restaurant_id === restaurant.id,
          );
          const visitCount = visitHistory ? visitHistory.count : 0;

          // Calculate distance between customer and restaurant (in km)
          const distance = this.calculateDistance(
            customerLocation.lat,
            customerLocation.lon,
            restaurantLocation.lat,
            restaurantLocation.lon,
          );

          // Adjust how much distance impacts the score
          const distanceWeight = 1 / (distance + 1); // The closer, the higher the weight

          // Create a prioritization score (higher is better)
          const priorityScore =
            (isPreferred ? 1 : 0) * 3 + visitCount * 2 + distanceWeight * 5; // Add distance weighting here

          return {
            ...restaurant.toObject(),
            priorityScore, // Add the score to the restaurant object
          };
        })
        .sort((a, b) => b.priorityScore - a.priorityScore); // Sort by the priority score in descending order

      // Return sorted list of restaurants (still includes all restaurants, just sorted)
      return createResponse(
        'OK',
        prioritizedRestaurants,
        'Fetched and prioritized restaurants successfully',
      );
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while fetching restaurants',
      );
    }
  }
}
