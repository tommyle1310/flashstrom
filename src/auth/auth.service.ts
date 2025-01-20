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
    if (!email || !password) {
      return createResponse(
        'InvalidFormatInput',
        null,
        'Email & Password cannot be empty',
      );
    }

    // Check if the user already exists based on email
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      // If the user exists, check if they already have 'CUSTOMER' in user_type
      if (existingUser.user_type.includes(Enum_UserType.CUSTOMER)) {
        return createResponse(
          'DuplicatedRecord',
          null,
          'Customer with the same email already exists',
        );
      }

      // If user exists and does not have 'CUSTOMER', create the customer
      const newCustomer = new this.customerModel({
        ...userData,
        password: existingUser.password, // Use existing user's password
        user_id: existingUser.id, // Link the customer to the existing user
      });

      // Save the new customer to the database
      await newCustomer.save();

      return createResponse(
        'OK',
        {
          id: existingUser.id,
          email: existingUser.email,
          first_name: existingUser.first_name,
          last_name: existingUser.last_name,
          user_type: existingUser.user_type,
         data: existingUser
        },
        'Customer created successfully with existing user',
      );
    }

    // If no user exists, create a new user
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new this.userModel({
      ...userData,
      phone,
      password: hashedPassword,
      user_type: ['CUSTOMER'], // Set user_type as 'CUSTOMER'
    });

    // Save the new user to the database
    await newUser.save();

    // Create a new customer object, apply the user_id from the new user to the customer
    const newCustomer = new this.customerModel({
      ...userData,
      password: hashedPassword,
      user_id: newUser.id, // Set the user_id field to the user ID
    });

    // Save the new customer to the database
    await newCustomer.save();

    // Return a response with the user data
    return createResponse(
      'OK',
      {
        id: newUser.id,
        phone,
        email: newUser.email,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        user_type: newUser.user_type,
        data: newCustomer
      },
      'Customer registered successfully',
    );
  }

  // Login an existing user
  async login({
    email,
    password,
  }: {
    email: string;
    password: string;
  }): Promise<any> {
    if (!email || !password) {
      return createResponse(
        'MissingInput',
        null,
        'Email & Password cannot be empty',
      );
    }
    const user = await this.userModel.findOne({ email });
    if (!user) {
      return createResponse('NotFound', null, 'User not found with this email');
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
