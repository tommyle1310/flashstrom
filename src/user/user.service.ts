import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { createResponse } from 'src/utils/createResponse'; // Import the createResponse function

@Injectable()
export class UserService {
  constructor(@InjectModel('User') private readonly userModel: Model<User>) {}

  // Create a new user
  async createUser(createUserDto: CreateUserDto): Promise<any> {
    const {
      first_name,
      last_name,
      email,
      phone,
      user_type,
      address,
      created_at,
      updated_at,
      last_login,
      avatar,
      is_verified,
    } = createUserDto;

    // Check if user already exists by email (or other criteria)
    const existingUser = await this.userModel.findOne({ email }).exec();
    if (existingUser) {
      return createResponse(
        'DuplicatedRecord',
        null,
        'User with this email already exists',
      );
    }
    try {
      // Create new user
      const newUser = new this.userModel({
        first_name,
        last_name,
        email,
        phone,
        user_type,
        address,
        created_at,
        updated_at,
        last_login,
        avatar,
        is_verified,
      });

      // Save and return success response
      await newUser.save();
      return createResponse('OK', newUser, 'User created successfully');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while creating the user',
      );
    }
  }

  // Get all users
  async getAllUsers(): Promise<any> {
    try {
      const users = await this.userModel.find().exec();
      return createResponse('OK', users, 'Fetched all users');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while fetching users',
      );
    }
  }

  // Find a user by a specific condition (e.g., any field)
async findOne(conditions: object): Promise<any> {
  const user = await this.userModel.findOne(conditions).exec();
  if (!user) {
    return createResponse('NotFound', null, 'User not found');
  }
  try {
    return createResponse('OK', user, 'Fetched user successfully');
  } catch (error) {
    return createResponse(
      'ServerError',
      null,
      'An error occurred while fetching the user',
    );
  }
}


  // Get a user by ID
  async getUserById(id: string): Promise<any> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      return createResponse('NotFound', null, 'User not found');
    }
    try {
      return createResponse('OK', user, 'Fetched user successfully');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while fetching the user',
      );
    }
  }

  // Update an existing user by ID
  async updateUser(id: string, updateUserDto: UpdateUserDto): Promise<any> {
    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .exec();
    if (!updatedUser) {
      return createResponse('NotFound', null, 'User not found');
    }
    try {
      return createResponse('OK', updatedUser, 'User updated successfully');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while updating the user',
      );
    }
  }

  // Delete a user by ID
  async deleteUser(id: string): Promise<any> {
    const deletedUser = await this.userModel.findByIdAndDelete(id).exec();
    if (!deletedUser) {
      return createResponse('NotFound', null, 'User not found');
    }
    try {
      return createResponse('OK', null, 'User deleted successfully');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while deleting the user',
      );
    }
  }
}
