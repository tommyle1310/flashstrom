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
  // CustomerPayload,
  // DriverPayload,
  Enum_UserType
  // FWalletPayload,
  // Payload,
  // RestaurantOwnerPayload
} from 'src/types/Payload';
import { FWallet } from 'src/fwallets/fwallets.schema';
import { Restaurant } from 'src/restaurants/restaurants.schema';
// import { CartItem } from 'src/cart_items/cart_items.schema';
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

    if (!this.validateRegistrationInput(email, password)) {
      return createResponse(
        'InvalidFormatInput',
        null,
        'Email & Password cannot be empty'
      );
    }

    const existingUser = await this.findUserByEmail(email);
    if (existingUser) {
      return this.handleExistingUserRegistration(existingUser, userData, type);
    }

    return this.createNewUserRegistration(userData, type, phone);
  }

  async login(
    { email, password }: { email: string; password: string },
    type: Enum_UserType
  ): Promise<any> {
    if (!this.validateLoginInput(email, password)) {
      return createResponse(
        'MissingInput',
        null,
        'Email & Password cannot be empty'
      );
    }

    const user = await this.validateUserCredentials(email, password);
    if (!user) {
      return createResponse('Unauthorized', null, 'Invalid credentials');
    }

    const basePayload = this.createBasePayload(user);
    return this.handleUserTypeLogin(user, type, basePayload);
  }

  // Private helper methods
  private async validateRegistrationInput(
    email: string,
    password: string
  ): Promise<boolean> {
    return Boolean(email && password);
  }

  private async validateLoginInput(
    email: string,
    password: string
  ): Promise<boolean> {
    return Boolean(email && password);
  }

  private async findUserByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email });
  }

  private async validateUserCredentials(
    email: string,
    password: string
  ): Promise<User | null> {
    const user = await this.findUserByEmail(email);
    if (!user) return null;

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return null;

    return user;
  }

  private createBasePayload(user: User): BasePayload {
    return {
      user_id: user.id,
      email: user.email,
      user_type: user.user_type,
      first_name: user.first_name,
      last_name: user.last_name,
      app_preferences: user.app_preferences
    };
  }

  private async handleUserTypeLogin(
    user: User,
    type: Enum_UserType,
    basePayload: BasePayload
  ) {
    const loginHandlers = {
      DRIVER: () => this.handleDriverLogin(user, basePayload),
      CUSTOMER: () => this.handleCustomerLogin(user, basePayload),
      F_WALLET: () => this.handleFWalletLogin(user, basePayload),
      RESTAURANT_OWNER: () => this.handleRestaurantOwnerLogin(user, basePayload)
    };

    const handler = loginHandlers[type];
    if (!handler) {
      return createResponse('Unauthorized', null, 'Invalid user type');
    }

    return handler();
  }

  // Login handlers for each user type
  private async handleDriverLogin(user: User, basePayload: BasePayload) {
    const userWithRole = await this.driverModel.findOne({ user_id: user.id });
    if (!userWithRole) {
      return createResponse('NotFound', null, 'Driver not found');
    }

    const fWalletData = await this.fWalletModel.findOne({ user_id: user.id });
    console.log('check user id', fWalletData);

    if (!fWalletData) {
      return createResponse('NotFound', null, 'Driver not found');
    }

    const driverPayload = {
      ...basePayload,
      user_id: userWithRole.user_id,
      first_name: userWithRole.first_name,
      last_name: userWithRole.last_name,
      driver_id: userWithRole.id,
      contact_email: userWithRole.contact_email,
      contact_phone: userWithRole.contact_phone,
      vehicle: userWithRole.vehicle,
      current_location: userWithRole.current_location,
      avatar: userWithRole.avatar,
      available_for_work: userWithRole.available_for_work,
      fWallet_id: fWalletData.id,
      fWallet_balance: fWalletData.balance
    };

    const accessToken = this.jwtService.sign(driverPayload);
    return createResponse(
      'OK',
      {
        access_token: accessToken,
        user_data: userWithRole
      },
      'Login successful'
    );
  }

  private async handleCustomerLogin(user: User, basePayload: BasePayload) {
    const userWithRole = await this.customerModel
      .findOne({ user_id: user.id })
      .populate('address');
    if (!userWithRole) {
      return createResponse('NotFound', null, 'Customer not found');
    }

    const cartItems = await this.cartItemService.findAll({
      customer_id: userWithRole._id
    });

    const customerPayload = {
      ...basePayload,
      preferred_category: userWithRole.preferred_category,
      favorite_restaurants: userWithRole.favorite_restaurants,
      favorite_items: userWithRole.favorite_items,
      user_id: userWithRole._id,
      avatar: userWithRole?.avatar,
      support_tickets: userWithRole.support_tickets,
      address: userWithRole?.address,
      cart_items: cartItems.data
    };

    const accessToken = this.jwtService.sign(customerPayload);
    return createResponse(
      'OK',
      { access_token: accessToken },
      'Login successful'
    );
  }

  private async handleFWalletLogin(user: User, basePayload: BasePayload) {
    const userWithRole = await this.fWalletModel.findOne({ user_id: user.id });
    if (!userWithRole) {
      return createResponse('NotFound', null, 'FWallet not found');
    }

    const fWalletPayload = {
      ...basePayload,
      balance: userWithRole.balance,
      fWallet_id: userWithRole.id
    };

    const accessToken = this.jwtService.sign(fWalletPayload);
    return createResponse(
      'OK',
      { access_token: accessToken },
      'Login successful'
    );
  }

  private async handleRestaurantOwnerLogin(
    user: User,
    basePayload: BasePayload
  ) {
    const userWithRole = await this.restaurantModel.findOne({
      owner_id: user.id
    });
    if (!userWithRole) {
      return createResponse('NotFound', null, 'Restaurant owner not found');
    }

    const restaurantPayload = {
      ...basePayload,
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

    const accessToken = this.jwtService.sign(restaurantPayload);
    return createResponse(
      'OK',
      {
        access_token: accessToken,
        user_data: userWithRole
      },
      'Login successful'
    );
  }

  // Registration handlers
  private async handleExistingUserRegistration(
    existingUser: User,
    userData: any,
    type: Enum_UserType
  ) {
    if (existingUser.user_type.includes(type)) {
      return createResponse(
        'DuplicatedRecord',
        null,
        `${type} with the same email already exists`
      );
    }

    let newUserWithRole;
    let fWallet;

    switch (type) {
      case 'CUSTOMER':
        newUserWithRole = new this.customerModel({
          ...userData,
          password: existingUser.password,
          user_id: existingUser.id
        });
        break;

      case 'DRIVER':
      case 'RESTAURANT_OWNER':
        // Check if user already has an FWallet
        fWallet = await this.fWalletModel.findOne({ user_id: existingUser.id });

        if (!fWallet) {
          // Create FWallet if it doesn't exist
          fWallet = new this.fWalletModel({
            ...userData,
            password: existingUser.password,
            user_id: existingUser.id,
            balance: 0
          });
          await fWallet.save();

          // Add F_WALLET to user_type if not present
          if (!existingUser.user_type.includes(Enum_UserType.F_WALLET)) {
            existingUser.user_type.push(Enum_UserType.F_WALLET);
          }
        }

        if (type === 'DRIVER') {
          newUserWithRole = new this.driverModel({
            ...userData,
            password: existingUser.password,
            user_id: existingUser.id,
            available_for_work: false
          });
        } else {
          newUserWithRole = new this.restaurantModel({
            ...userData,
            password: existingUser.password,
            owner_id: existingUser.id
          });
        }
        break;

      case Enum_UserType.F_WALLET:
        newUserWithRole = new this.fWalletModel({
          ...userData,
          password: existingUser.password,
          user_id: existingUser.id,
          balance: existingUser.temporary_wallet_balance
        });
        existingUser.temporary_wallet_balance = 0;
        await existingUser.save();
        break;

      default:
        return createResponse(
          'Unauthorized',
          null,
          'Invalid user type provided'
        );
    }

    await newUserWithRole.save();
    if (!existingUser.user_type.includes(type)) {
      existingUser.user_type.push(type);
      await existingUser.save();
    }

    const responseData = {
      id: existingUser.id,
      user_id: existingUser.id,
      email: existingUser.email,
      first_name: existingUser.first_name,
      last_name: existingUser.last_name,
      user_type: existingUser.user_type,
      data: newUserWithRole
    };

    // Add fWallet info to response if it was created
    if (fWallet && (type === 'DRIVER' || type === 'RESTAURANT_OWNER')) {
      responseData['fWallet'] = fWallet;
    }

    return createResponse(
      'OK',
      responseData,
      `${type} created successfully with existing user`
    );
  }

  private async createNewUserRegistration(
    userData: any,
    type: Enum_UserType,
    phone: string
  ) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const newUser = new this.userModel({
      ...userData,
      phone,
      password: hashedPassword,
      user_type: [type]
    });

    await newUser.save();
    let newUserWithRole;
    let fWallet;

    switch (type) {
      case 'CUSTOMER':
        newUserWithRole = new this.customerModel({
          ...userData,
          password: hashedPassword,
          user_id: newUser.id
        });
        break;

      case 'DRIVER':
      case 'RESTAURANT_OWNER':
        // Create FWallet for new drivers and restaurant owners
        fWallet = new this.fWalletModel({
          ...userData,
          password: hashedPassword,
          user_id: newUser.id,
          balance: 0
        });
        await fWallet.save();

        // Add F_WALLET to user_type
        newUser.user_type.push(Enum_UserType.F_WALLET);
        await newUser.save();

        if (type === 'DRIVER') {
          newUserWithRole = new this.driverModel({
            ...userData,
            password: hashedPassword,
            user_id: newUser.id,
            available_for_work: false
          });
        } else {
          newUserWithRole = new this.restaurantModel({
            ...userData,
            password: hashedPassword,
            user_id: newUser.id,
            owner_id: newUser.id
          });
        }
        break;

      case 'F_WALLET':
        newUserWithRole = new this.fWalletModel({
          ...userData,
          password: hashedPassword,
          user_id: newUser.id,
          balance: 0
        });
        break;

      default:
        return createResponse(
          'Unauthorized',
          null,
          'Invalid user type provided'
        );
    }

    await newUserWithRole.save();

    const responseData = {
      id: newUser.id,
      user_id: newUser.id,
      phone,
      email: newUser.email,
      first_name: newUser.first_name,
      last_name: newUser.last_name,
      user_type: newUser.user_type,
      data: newUserWithRole
    };

    // Add fWallet info to response if it was created
    if (fWallet && (type === 'DRIVER' || type === 'RESTAURANT_OWNER')) {
      responseData['fWallet'] = fWallet;
    }

    return createResponse(
      'OK',
      responseData,
      `${type} registered successfully`
    );
  }

  // Utility methods
  async validateUser(payload: any): Promise<User> {
    return this.userModel.findById(payload.userId);
  }

  async hasRole(userId: string, role: Enum_UserType): Promise<boolean> {
    const user = await this.userModel.findById(userId);
    return user.user_type.includes(role);
  }
}
