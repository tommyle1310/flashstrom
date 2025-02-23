import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateFWalletDto } from './dto/create-fwallet.dto';
import { UpdateFwalletDto } from './dto/update-fwallet.dto';
import { FWallet } from './fwallets.schema'; // Assuming an FWallet schema similar to Driver schema
import { createResponse } from 'src/utils/createResponse'; // Utility for creating responses
import { ApiResponse } from 'src/utils/createResponse';

@Injectable()
export class FWalletService {
  constructor(
    @InjectModel('FWallet') private readonly fWalletModel: Model<FWallet> // Injecting FWallet model
  ) {}

  // Create a new FWallet
  async create(
    createFWalletDto: CreateFWalletDto
  ): Promise<ApiResponse<FWallet>> {
    try {
      const existingWallet = await this.findWalletByUserId(
        createFWalletDto.user_id
      );
      if (existingWallet) {
        return this.handleDuplicateWallet();
      }

      const newWallet = await this.saveNewWallet(createFWalletDto);
      return createResponse('OK', newWallet, 'Wallet created successfully');
    } catch (error) {
      return this.handleError('Error creating wallet:', error);
    }
  }

  // Get all FWallets
  async findAll(): Promise<ApiResponse<FWallet[]>> {
    try {
      const wallets = await this.fWalletModel.find().exec();
      return createResponse('OK', wallets, 'Fetched all wallets');
    } catch (error) {
      return this.handleError('Error fetching wallets:', error);
    }
  }

  // Get an FWallet by ID
  async findFWalletById(id: string): Promise<ApiResponse<FWallet>> {
    try {
      const wallet = await this.fWalletModel.findById(id).exec();
      return this.handleWalletResponse(wallet);
    } catch (error) {
      return this.handleError('Error fetching wallet:', error);
    }
  }

  // Find one wallet by dynamic field and value
  async findOne(conditions: object): Promise<ApiResponse<FWallet>> {
    try {
      const wallet = await this.fWalletModel.findOne(conditions).exec();
      return this.handleWalletResponse(wallet);
    } catch (error) {
      return this.handleError('Error fetching wallet:', error);
    }
  }

  // Update an FWallet by ID
  async update(
    id: string,
    updateFWalletDto: UpdateFwalletDto
  ): Promise<ApiResponse<FWallet>> {
    try {
      const updatedWallet = await this.fWalletModel
        .findByIdAndUpdate(id, updateFWalletDto, { new: true })
        .exec();
      return this.handleWalletResponse(updatedWallet);
    } catch (error) {
      return this.handleError('Error updating wallet:', error);
    }
  }

  // Delete an FWallet by ID
  async remove(id: string): Promise<ApiResponse<null>> {
    try {
      const deletedWallet = await this.fWalletModel
        .findByIdAndDelete(id)
        .exec();
      if (!deletedWallet) {
        return createResponse('NotFound', null, 'Wallet not found');
      }
      return createResponse('OK', null, 'Wallet deleted successfully');
    } catch (error) {
      return this.handleError('Error deleting wallet:', error);
    }
  }

  // Private helper methods
  private async findWalletByUserId(userId: string): Promise<FWallet | null> {
    return this.fWalletModel.findOne({ user_id: userId }).exec();
  }

  private async saveNewWallet(walletData: CreateFWalletDto): Promise<FWallet> {
    const newWallet = new this.fWalletModel({
      ...walletData,
      balance: +walletData.balance
    });
    return newWallet.save();
  }

  private handleDuplicateWallet(): ApiResponse<null> {
    return createResponse(
      'DuplicatedRecord',
      null,
      'Wallet for this user already exists'
    );
  }

  private handleWalletResponse(wallet: FWallet | null): ApiResponse<FWallet> {
    if (!wallet) {
      return createResponse('NotFound', null, 'Wallet not found');
    }
    return createResponse('OK', wallet, 'Wallet retrieved successfully');
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
