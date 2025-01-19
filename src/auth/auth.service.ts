import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Enum_UserType, User } from 'src/user/user.schema';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { createResponse } from 'src/utils/createResponse';
import { Customer } from 'src/customers/customer.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel('User') private readonly userModel: Model<User>,
    @InjectModel('Customer') private readonly customerModel: Model<Customer>,
    private readonly jwtService: JwtService,
  ) {}

  async registerCustomer(userData: any): Promise<any> {
    const { email, password, first_name, last_name, phone } = userData;

    // Validate input fields
    if (!phone || !password) {
      return createResponse(
        'InvalidFormatInput',
        null,
        'Phone & Password cannot be empty',
      );
    }

    // Check if the user already exists based on phone number
    const existingUserPhone = await this.userModel.findOne({ phone });
    if (existingUserPhone) {
      return createResponse('DuplicatedRecord', null, 'Phone already in use');
    }

    // Check if the user already exists based on email
    const existingUserEmail = await this.userModel.findOne({ email });
    if (existingUserEmail) {
      return createResponse('DuplicatedRecord', null, 'Em ail already in use');
    }

    // Hash password before saving to DB
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user object
    const newUser = new this.userModel({
      ...userData,
      password: hashedPassword,
      user_type: ['CUSTOMER'], // Ensure user_type is an array of roles
      first_name,
      last_name,
      phone,
    });

    // Save the new user to the database
    await newUser.save();

    // Create a new customer object, apply the user_id from the new user to the customer
    const newCustomer = new this.customerModel({
      ...userData,
      password: hashedPassword,
      first_name,
      last_name,
      phone,
      user_id: newUser.id, // Set the user_id field to the user ID
    });

    // Save the new customer to the database
    await newCustomer.save();

    // Return a response with the user data
    return createResponse(
      'OK',
      {
        id: newUser.id,
        email: newUser.email,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        user_type: newUser.user_type,
      },
      'Customer registered successfully',
    );
  }

  // Login an existing user
  async login({phone, password}:{phone: string, password: string}): Promise<any> {
    if (!phone || !password) {
      return createResponse('MissingInput', null, 'Phone & Password cannot be empty');      
    }
    const user = await this.userModel.findOne({ phone });
    if (!user) {
      return createResponse('NotFound', null, 'User not found with this phone number');
    }

    // Validate the password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return createResponse('Unauthorized', null, 'Invalid credentials');
    }

    // Generate JWT token
    const payload = {
      userId: user.id,
      email: user.email,
      user_type: user.user_type,
    };
    const accessToken = this.jwtService.sign(payload);

    // Return the access token
    return createResponse(
      'OK',
      { access_token: accessToken },
      'Login successful',
    );
  }

  // Validate a user based on the JWT payload
  async validateUser(payload: any): Promise<User> {
    return this.userModel.findById(payload.userId);
  }

  // Check if the user has a specific role
  async hasRole(userId: string, role: Enum_UserType): Promise<boolean> {
    const user = await this.userModel.findById(userId);
    return user.user_type.includes(role); // Check if the user has the specified role
  }
}
