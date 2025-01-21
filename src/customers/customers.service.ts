import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer } from './customer.schema'; // Assuming a Customer schema similar to User schema
import { createResponse } from 'src/utils/createResponse'; // Importing the utility for response creation
import { User } from 'src/user/user.schema';

@Injectable()
export class CustomersService {
constructor(
  @InjectModel('Customer') private readonly customerModel: Model<Customer>,
  @InjectModel('User') private readonly userModel: Model<User>
) {}


  // Create a new customer
  async create(createCustomerDto: CreateCustomerDto): Promise<any> {
    const {
      user_id,
      first_name, last_name,
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
    const existingCustomer = await this.customerModel.findOne({ user_id }).exec();
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
      first_name, last_name,
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
    const updatedCustomer = await this.customerModel
      .findByIdAndUpdate(id, updateCustomerDto, { new: true })
      .exec();

    if (!updatedCustomer) {
      return createResponse('NotFound', null, 'Customer not found');
    }

    try {
      return createResponse('OK', updatedCustomer, 'Customer updated successfully');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while updating the customer',
      );
    }
  }

  // Delete a customer by ID
  async remove(id: string): Promise<any> {
    const deletedCustomer = await this.customerModel.findByIdAndDelete(id).exec();

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
}
