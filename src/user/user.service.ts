import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { User } from './user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { createResponse } from 'src/utils/createResponse';
import { ApiResponse } from 'src/utils/createResponse';

@Injectable()
export class UserService {
  constructor(@InjectModel('User') private readonly userModel: Model<User>) {}

  async createUser(createUserDto: CreateUserDto): Promise<ApiResponse<User>> {
    try {
      const existingUser = await this.findUserByEmail(createUserDto.email);
      if (existingUser) {
        return this.handleDuplicateUser();
      }

      const newUser = await this.saveNewUser(createUserDto);
      return createResponse('OK', newUser, 'User created successfully');
    } catch (error) {
      return this.handleError('Error creating user:', error);
    }
  }

  async getAllUsers(): Promise<ApiResponse<User[]>> {
    try {
      const users = await this.userModel.find().exec();
      return createResponse('OK', users, 'Users retrieved successfully');
    } catch (error) {
      return this.handleError('Error fetching users:', error);
    }
  }

  async findOne(conditions: FilterQuery<User>): Promise<ApiResponse<User>> {
    try {
      const user = await this.userModel.findOne(conditions).exec();
      return this.handleUserResponse(user);
    } catch (error) {
      return this.handleError('Error fetching user:', error);
    }
  }

  async getUserById(id: string): Promise<ApiResponse<User>> {
    try {
      const user = await this.userModel.findById(id).exec();
      return this.handleUserResponse(user);
    } catch (error) {
      return this.handleError('Error fetching user by id:', error);
    }
  }

  async updateUser(
    id: string,
    updateUserDto: UpdateUserDto
  ): Promise<ApiResponse<User>> {
    try {
      const updatedUser = await this.userModel
        .findByIdAndUpdate(id, updateUserDto, { new: true })
        .exec();
      return this.handleUserResponse(updatedUser);
    } catch (error) {
      return this.handleError('Error updating user:', error);
    }
  }

  async deleteUser(id: string): Promise<ApiResponse<null>> {
    try {
      const deletedUser = await this.userModel.findByIdAndDelete(id).exec();
      if (!deletedUser) {
        return createResponse('NotFound', null, 'User not found');
      }
      return createResponse('OK', null, 'User deleted successfully');
    } catch (error) {
      return this.handleError('Error deleting user:', error);
    }
  }

  // Private helper methods
  private async findUserByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  private async saveNewUser(userData: CreateUserDto): Promise<User> {
    const newUser = new this.userModel(userData);
    return newUser.save();
  }

  private handleDuplicateUser(): ApiResponse<null> {
    return createResponse(
      'DuplicatedRecord',
      null,
      'User with this email already exists'
    );
  }

  private handleUserResponse(user: User | null): ApiResponse<User> {
    if (!user) {
      return createResponse('NotFound', null, 'User not found');
    }
    return createResponse('OK', user, 'User retrieved successfully');
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
