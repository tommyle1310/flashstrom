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
  RestaurantOwnerPayload
} from 'src/types/Payload';
import { FWallet } from 'src/fwallets/fwallets.schema';
import { Restaurant } from 'src/restaurants/restaurants.schema';
import { CartItem } from 'src/cart_items/cart_items.schema';
import { CartItemsService } from 'src/cart_items/cart_items.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel('User') private readonly userModel: Model<User>,
    @InjectModel('Customer') private readonly customerModel: Model<Customer>,
    @InjectModel('Driver') private readonly driverModel: Model<Driver>,
    @InjectModel('FWallet') private readonly fWalletModel: Model<FWallet>,
    @InjectModel('Restaurant')
    private readonly restaurantModel: Model<Restaurant>,
    private readonly jwtService: JwtService,
    private readonly cartItemService: CartItemsService
  ) {}

  async register(userData: any, type: Enum_UserType): Promise<any> {
    const { email, password, phone } = userData;

    // Validate input fields
    if (!email || !password) {
      return createResponse(
        'InvalidFormatInput',
        null,
        'Email & Password cannot be empty'
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
          `${type} with the same email already exists`
        );
      }

      // If the user exists and does not have the same type, create the customer, driver, or restaurant
      let newUserWithRole;

      switch (type) {
        case 'CUSTOMER':
          // Create a new customer object and link to the existing user
          newUserWithRole = new this.customerModel({
            ...userData,
            password: existingUser.password, // Use the existing user's password
            user_id: existingUser.id // Link the customer to the existing user
          });
          break;

        case 'DRIVER':
          // Create a new driver object and link to the existing user
          newUserWithRole = new this.driverModel({
            ...userData,
            password: existingUser.password, // Use the existing user's password
            user_id: existingUser.id, // Link the driver to the existing user
            available_for_work: false
          });
          break;

        case 'F_WALLET':
          // Create the wallet with the temporary wallet balance
          newUserWithRole = new this.fWalletModel({
            ...userData,
            password: existingUser.password, // Use the existing user's password
            user_id: existingUser.id, // Link the wallet to the existing user
            balance: existingUser.temporary_wallet_balance // Transfer balance
          });

          // Clear the temporary_wallet_balance and save the user document
          existingUser.temporary_wallet_balance = 0;
          await existingUser.save(); // Save after resetting the temporary balance
          break;

        case 'RESTAURANT_OWNER':
          // Create a new restaurant object and link to the existing user
          // Pass the user_id as owner_id in the restaurant
          newUserWithRole = new this.restaurantModel({
            ...userData,
            password: existingUser.password, // Use the existing user's password
            owner_id: existingUser.id // Set the restaurant owner to the user's id
          });
          break;

        default:
          return createResponse(
            'Unauthorized',
            null,
            'Invalid user type provided'
          );
      }

      // Save the new user role (customer, driver, restaurant, or wallet) to the database
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
          user_id: existingUser.id,
          email: existingUser.email,
          first_name: existingUser.first_name,
          last_name: existingUser.last_name,
          user_type: existingUser.user_type, // Return updated user_type
          data: newUserWithRole
        },
        `${type} created successfully with existing user`
      );
    }

    // If no user exists, create a new user
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new this.userModel({
      ...userData,
      phone,
      password: hashedPassword,
      user_type: [type] // Set user_type as 'CUSTOMER', 'DRIVER', or 'RESTAURANT'
    });

    // Save the new user to the database
    await newUser.save();

    let newUserWithRole;

    // Create the correct user role (customer, driver, restaurant, or wallet) based on the user type
    switch (type) {
      case 'CUSTOMER':
        newUserWithRole = new this.customerModel({
          ...userData,
          password: hashedPassword,
          user_id: newUser.id // Link the customer to the new user
        });
        break;

      case 'DRIVER':
        newUserWithRole = new this.driverModel({
          ...userData,
          password: hashedPassword,
          user_id: newUser.id // Link the driver to the new user
        });
        break;

      case 'F_WALLET':
        newUserWithRole = new this.fWalletModel({
          ...userData,
          password: hashedPassword,
          user_id: newUser.id // Link the wallet to the new user
        });
        break;

      case 'RESTAURANT_OWNER':
        // For restaurant type, make sure to pass user_id to owner_id
        newUserWithRole = new this.restaurantModel({
          ...userData,
          password: hashedPassword,
          user_id: newUser.id, // Link the restaurant to the new user
          owner_id: newUser.id // Set the owner_id to the new user's id
        });
        break;

      default:
        return createResponse(
          'Unauthorized',
          null,
          'Invalid user type provided'
        );
    }

    // Save the new user role (customer, driver, restaurant, or wallet) to the database
    await newUserWithRole.save();

    // Return a response with the user data
    return createResponse(
      'OK',
      {
        id: newUser.id,
        user_id: newUser.id,
        phone,
        email: newUser.email,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        user_type: newUser.user_type,
        data: newUserWithRole
      },
      `${type} registered successfully`
    );
  }

  // Login an existing user
  async login(
    { email, password }: { email: string; password: string },
    type: Enum_UserType
  ): Promise<any> {
    if (!email || !password) {
      return createResponse(
        'MissingInput',
        null,
        'Email & Password cannot be empty'
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
    const payload: BasePayload = {
      user_id: user.id,
      email: user.email,
      user_type: user.user_type,
      first_name: user.first_name,
      last_name: user.last_name,
      app_preferences: user.app_preferences // App preferences are common to both users
    };

    let userWithRole;
    let accessToken: string;

    // Switch based on user type (DRIVER or CUSTOMER)
    switch (type) {
      case 'DRIVER':
        // Fetch additional fields from the driver collection
        userWithRole = await this.driverModel.findOne({ user_id: user.id });
        console.log('check suer', user.id, userWithRole);

        if (!userWithRole) {
          return createResponse('NotFound', null, 'Driver not found');
        }

        // Fetch FWallet info where user_id matches
        const fWalletData = await this.fWalletModel.findOne({
          user_id: user.id
        });
        if (!fWalletData) {
          return createResponse('NotFound', null, 'Driver not found');
        }

        // Expand payload for DRIVER type
        const driverPayload: DriverPayload = {
          ...payload,
          user_id: userWithRole.user_id,
          driver_id: userWithRole.id,
          contact_email: userWithRole.contact_email,
          contact_phone: userWithRole.contact_phone,
          vehicle: userWithRole.vehicle,
          current_location: userWithRole.current_location,
          avatar: userWithRole.avatar,
          available_for_work: userWithRole.available_for_work,
          fWallet_id: fWalletData.id, // Only include the fWallet ID in payload
          fWallet_balance: fWalletData.balance // Only include the fWallet ID in payload
        };

        // Generate JWT token with the extended payload
        accessToken = this.jwtService.sign(driverPayload);

        // Return the access token along with the user data
        return createResponse(
          'OK',
          {
            access_token: accessToken,
            user_data: userWithRole
          },
          'Login successful'
        );

      case 'CUSTOMER':
        // Fetch additional fields from the customer collection
        userWithRole = await this.customerModel
          .findOne({ user_id: user.id })
          .populate('address');
        if (!userWithRole) {
          return createResponse('NotFound', null, 'Customer not found');
        }

        // Fetch the cart items for the customer using the cartItemService
        const cartItems = await this.cartItemService.findAll({
          customer_id: userWithRole._id
        });

        // Expand payload for CUSTOMER type and include cart items
        const customerPayload: CustomerPayload = {
          ...payload,
          preferred_category: userWithRole.preferred_category,
          favorite_restaurants: userWithRole.favorite_restaurants,
          favorite_items: userWithRole.favorite_items,
          user_id: userWithRole._id,
          avatar: userWithRole?.avatar,
          support_tickets: userWithRole.support_tickets,
          address: userWithRole?.address,
          cart_items: cartItems.data // Include cart items in the payload
        };
        // Generate JWT token with the extended payload
        accessToken = this.jwtService.sign(customerPayload);

        // Return the access token along with the user data
        return createResponse(
          'OK',
          {
            access_token: accessToken
          },
          'Login successful'
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
            access_token: accessToken
          },
          'Login successful'
        );
      case 'RESTAURANT_OWNER':
        // Fetch restaurant info
        userWithRole = await this.restaurantModel.findOne({
          owner_id: user.id
        });
        if (!userWithRole) {
          return createResponse('NotFound', null, 'Restaurant owner not found');
        }

        // Expand payload for RESTAURANT_OWNER
        const restaurantPayload: RestaurantOwnerPayload = {
          ...payload,
          owner_id: userWithRole.owner_id,
          owner_name: userWithRole.owner_name,
          restaurant_id: userWithRole._id ?? userWithRole.id,
          address: userWithRole.address,
          restaurant_name: userWithRole.restaurant_name,
          contact_email: userWithRole.contact_email,
          contact_phone: userWithRole.contact_phone,
          created_at: userWithRole.created_at,
          updated_at: userWithRole.updated_at,
          avatar: userWithRole.avatar,
          images_gallery: userWithRole.images_gallery,
          status: userWithRole.status,
          promotions: userWithRole.promotions,
          ratings: userWithRole.ratings,
          specialize_in: userWithRole.specialize_in,
          opening_hours: userWithRole.opening_hours
        };

        // Generate JWT token for the restaurant owner
        accessToken = this.jwtService.sign(restaurantPayload);

        return createResponse(
          'OK',
          {
            access_token: accessToken,
            user_data: userWithRole // Include restaurant data in response
          },
          'Login successful'
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
