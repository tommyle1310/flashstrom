import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/user/user.schema';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { createResponse } from 'src/utils/createResponse';
import { Customer } from 'src/customers/customer.schema';
import { Driver } from 'src/drivers/drivers.schema';
import {
  BasePayload,
  CustomerPayload,
  DriverPayload,
  Enum_UserType,
  FWalletPayload,
  Payload,
} from 'src/types/Payload';
import { FWallet } from 'src/fwallets/fwallets.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel('User') private readonly userModel: Model<User>,
    @InjectModel('Customer') private readonly customerModel: Model<Customer>,
    @InjectModel('Driver') private readonly driverModel: Model<Driver>,
    @InjectModel('FWallet') private readonly fWalletModel: Model<FWallet>,
    private readonly jwtService: JwtService,
  ) {}
  async register(userData: any, type: Enum_UserType): Promise<any> {
    const { email, password, phone } = userData;

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
      // If the user exists, check if they already have the specified user_type
      if (existingUser.user_type.includes(type)) {
        return createResponse(
          'DuplicatedRecord',
          null,
          `${type} with the same email already exists`,
        );
      }

      // If the user exists and does not have the same type, create the customer or driver
      let newUserWithRole;

      switch (type) {
        case 'CUSTOMER':
          // Create a new customer object and link to the existing user
          newUserWithRole = new this.customerModel({
            ...userData,
            password: existingUser.password, // Use the existing user's password
            user_id: existingUser.id, // Link the customer to the existing user
          });
          break;

        case 'DRIVER':
          // Create a new driver object and link to the existing user
          newUserWithRole = new this.driverModel({
            ...userData,
            password: existingUser.password, // Use the existing user's password
            user_id: existingUser.id, // Link the driver to the existing user
          });
          break;

        case 'F_WALLET':
          // Create the wallet with the temporary wallet balance
          newUserWithRole = new this.fWalletModel({
            ...userData,
            password: existingUser.password, // Use the existing user's password
            user_id: existingUser.id, // Link the wallet to the existing user
            balance: existingUser.temporary_wallet_balance, // Transfer balance
          });

          // Clear the temporary_wallet_balance and save the user document
          existingUser.temporary_wallet_balance = 0;
          await existingUser.save(); // Save after resetting the temporary balance
          break;

        default:
          return createResponse(
            'Unauthorized',
            null,
            'Invalid user type provided',
          );
      }

      // Save the new user role (customer, driver, or wallet) to the database
      await newUserWithRole.save();

      // Update the user_type to include the new type if not already present
      if (!existingUser.user_type.includes(type)) {
        existingUser.user_type.push(type); // Only add type if it doesn't already exist
        await existingUser.save(); // Save the updated user document
      }

      return createResponse(
        'OK',
        {
          id: existingUser.id,
          email: existingUser.email,
          first_name: existingUser.first_name,
          last_name: existingUser.last_name,
          user_type: existingUser.user_type, // Return updated user_type
          data: newUserWithRole,
        },
        `${type} created successfully with existing user`,
      );
    } 

    // If no user exists, create a new user
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new this.userModel({
      ...userData,
      phone,
      password: hashedPassword,
      user_type: [type], // Set user_type as 'CUSTOMER' or 'DRIVER'
    });

    // Save the new user to the database
    await newUser.save();

    let newUserWithRole;

    // Create the correct user role (customer or driver) based on the user type
    switch (type) {
      case 'CUSTOMER':
        newUserWithRole = new this.customerModel({
          ...userData,
          password: hashedPassword,
          user_id: newUser.id, // Link the customer to the new user
        });
        break;

      case 'DRIVER':
        newUserWithRole = new this.driverModel({
          ...userData,
          password: hashedPassword,
          user_id: newUser.id, // Link the driver to the new user
        });
        break;
      case 'F_WALLET':
        newUserWithRole = new this.fWalletModel({
          ...userData,
          password: hashedPassword,
          user_id: newUser.id, // Link the wallet to the new user
        });
        break;

      default:
        return createResponse(
          'Unauthorized',
          null,
          'Invalid user type provided',
        );
    }

    // Save the new user role (customer or driver) to the database
    await newUserWithRole.save();

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
        data: newUserWithRole,
      },
      `${type} registered successfully`,
    );
  }

  // Login an existing user
  async login(
    { email, password }: { email: string; password: string },
    type: Enum_UserType,
  ): Promise<any> {
    if (!email || !password) {
      return createResponse(
        'MissingInput',
        null,
        'Email & Password cannot be empty',
      );
    }

    // Find the user by email
    const user = await this.userModel.findOne({ email });
    if (!user) {
      return createResponse('NotFound', null, 'User not found with this email');
    }

    // Validate the password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return createResponse('Unauthorized', null, 'Invalid credentials');
    }

    // Initialize the payload with basic user info
    let payload: BasePayload = {
      userId: user.id,
      email: user.email,
      user_type: user.user_type,
      first_name: user.first_name,
      last_name: user.last_name,
      app_preferences: user.app_preferences, // App preferences are common to both users
    };

    let userWithRole;
    let accessToken: string;

    // Switch based on user type (DRIVER or CUSTOMER)
    switch (type) {
      case 'DRIVER':
        // Fetch additional fields from the driver collection
        userWithRole = await this.driverModel.findOne({ user_id: user.id });
        if (!userWithRole) {
          return createResponse('NotFound', null, 'Driver not found');
        }

        // Expand payload for DRIVER type
        const driverPayload: DriverPayload = {
          ...payload,
          contact_email: userWithRole.contact_email,
          contact_phone: userWithRole.contact_phone,
          vehicle: userWithRole.vehicle,
          current_location: userWithRole.current_location,
          avatar: userWithRole.avatar,
          available_for_work: userWithRole.available_for_work,
        };

        // Generate JWT token with the extended payload
        accessToken = this.jwtService.sign(driverPayload);

        // Return the access token along with the user data
        return createResponse(
          'OK',
          {
            access_token: accessToken,
            user_data: userWithRole,
          },
          'Login successful',
        );
      case 'CUSTOMER':
        // Fetch additional fields from the customer collection
        userWithRole = await this.customerModel.findOne({ user_id: user.id });
        if (!userWithRole) {
          return createResponse('NotFound', null, 'Customer not found');
        }

        // Expand payload for CUSTOMER type
        const customerPayload: CustomerPayload = {
          ...payload,
          preferred_category: userWithRole.preferred_category,
          favorite_restaurants: userWithRole.favorite_restaurants,
          favorite_items: userWithRole.favorite_items,
          support_tickets: userWithRole.support_tickets,
        };

        // Generate JWT token with the extended payload
        accessToken = this.jwtService.sign(customerPayload);

        // Return the access token along with the user data
        return createResponse(
          'OK',
          {
            access_token: accessToken,
            // user_data: userWithRole,
          },
          'Login successful',
        );
      case 'F_WALLET':
        // Fetch additional fields from the FWallet collection
        userWithRole = await this.fWalletModel.findOne({ user_id: user.id });
        if (!userWithRole) {
          return createResponse('NotFound', null, 'FWallet not found');
        }

        // Expand payload for FWallet type
        const fWalletPayload: FWalletPayload = {
          ...payload,
          balance: userWithRole.balance,
          fWallet_id: userWithRole.id
        };

        // Generate JWT token with the extended payload
        accessToken = this.jwtService.sign(fWalletPayload);

        // Return the access token along with the user data
        return createResponse(
          'OK',
          {
            access_token: accessToken,
            // user_data: userWithRole,
          },
          'Login successful',
        );
      default:
        return createResponse('Unauthorized', null, 'Invalid user type');
    }
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
