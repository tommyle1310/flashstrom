import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateFWalletDto } from './dto/create-fwallet.dto';
import { UpdateFwalletDto } from './dto/update-fwallet.dto';
import { FWallet } from './fwallets.schema';  // Assuming an FWallet schema similar to Driver schema
import { createResponse } from 'src/utils/createResponse'; // Utility for creating responses

@Injectable()
export class FWalletService {
  constructor(
    @InjectModel('FWallet') private readonly fWalletModel: Model<FWallet>, // Injecting FWallet model
  ) {}

  // Create a new FWallet
  async create(createFWalletDto: CreateFWalletDto): Promise<any> {
    const { user_id, balance, first_name, last_name } = createFWalletDto;

    try {
      // Check if the wallet already exists for the user
      const existingFWallet = await this.fWalletModel.findOne({ user_id }).exec();
      if (existingFWallet) {
        return createResponse(
          'DuplicatedRecord',
          null,
          'Wallet for this user already exists',
        );
      }

      // Create new wallet entry
      const newFWallet = new this.fWalletModel({
        user_id,
        balance: +balance,
        first_name,
        last_name,
      });

      // Save the new wallet and return success response
      await newFWallet.save();
      return createResponse('OK', newFWallet, 'Wallet created successfully');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while creating the wallet',
      );
    }
  }

  // Get all FWallets
  async findAll(): Promise<any> {
    try {
      const wallets = await this.fWalletModel.find().exec();
      return createResponse('OK', wallets, 'Fetched all wallets');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while fetching wallets',
      );
    }
  }

  // Get an FWallet by ID
  async findFWalletById(id: string): Promise<any> {
    try {
      const fWallet = await this.fWalletModel.findById(id).exec();
      if (!fWallet) {
        return createResponse('NotFound', null, 'Wallet not found');
      }
      return createResponse('OK', fWallet, 'Fetched wallet successfully');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while fetching the wallet',
      );
    }
  }

  // Find one wallet by dynamic field and value
  async findOne(conditions: object): Promise<any> {
    try {
      const fWallet = await this.fWalletModel.findOne(conditions).exec();
      if (!fWallet) {
        return createResponse('NotFound', null, 'Wallet not found');
      }
      return createResponse('OK', fWallet, 'Fetched wallet successfully');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while fetching the wallet',
      );
    }
  }

  // Update an FWallet by ID
  async update(id: string, updateFWalletDto: UpdateFwalletDto): Promise<any> {
    try {
      const updatedFWallet = await this.fWalletModel
        .findByIdAndUpdate(id, updateFWalletDto, { new: true })
        .exec();

      if (!updatedFWallet) {
        return createResponse('NotFound', null, 'Wallet not found');
      }

      return createResponse('OK', updatedFWallet, 'Wallet updated successfully');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while updating the wallet',
      );
    }
  }

  // Delete an FWallet by ID
  async remove(id: string): Promise<any> {
    try {
      const deletedFWallet = await this.fWalletModel.findByIdAndDelete(id).exec();

      if (!deletedFWallet) {
        return createResponse('NotFound', null, 'Wallet not found');
      }

      return createResponse('OK', null, 'Wallet deleted successfully');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while deleting the wallet',
      );
    }
  }
}
