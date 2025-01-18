import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(@InjectModel('User') private readonly userModel: Model<User>) {}

  // Create a new user
  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const { first_name, last_name, email, phone, user_type, address, created_at, updated_at, last_login, avatar, is_verified } = createUserDto;

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

    return newUser.save();
  }

  // Get all users
  async getAllUsers(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  // Get a user by ID
  async getUserById(id: string): Promise<User> {
    return this.userModel.findById(id).exec();
  }

  // Update an existing user by ID
  async updateUser(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    return this.userModel.findByIdAndUpdate(id, updateUserDto, { new: true }).exec();
  }

  // Delete a user by ID
  async deleteUser(id: string): Promise<any> {
    return this.userModel.findByIdAndDelete(id).exec();
  }
}
