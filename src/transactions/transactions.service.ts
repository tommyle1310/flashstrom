import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateTransactionDto } from './dto/create-transaction.dto'; // Import DTO
import { UpdateTransactionDto } from './dto/update-transaction.dto'; // Import DTO
import { Transaction } from './transactions.schema'; // Assuming Transaction schema is defined
import { createResponse } from 'src/utils/createResponse'; // Utility for creating responses
import { User } from 'src/user/user.schema';
import { FWallet } from 'src/fwallets/fwallets.schema';

@Injectable()
export class TransactionService {
  constructor(
    @InjectModel('Transaction')
    private readonly transactionModel: Model<Transaction>,
    @InjectModel('User') private readonly userModel: Model<User>,
    @InjectModel('FWallet') private readonly fWalletModel: Model<FWallet>,
  ) {}

  // Create a new transaction
  async create(createTransactionDto: CreateTransactionDto): Promise<any> {
    const {
      user_id,
      fwallet_id,
      transaction_type,
      amount,
      balance_after,
      status,
      source,
      destination,
    } = createTransactionDto;

      // Check if the user exists before proceeding with the transaction
      const userExists = await this.userModel.findById(user_id).exec();
      if (!userExists) {
        return createResponse('NotFound', null, 'User not found');
      }

      // Check if the source wallet exists for withdrawal or purchase
      const sourceWallet = await this.fWalletModel.findOne({ user_id }).exec();
      if (
        !sourceWallet &&
        (transaction_type === 'WITHDRAW' || transaction_type === 'PURCHASE')
      ) {
        return createResponse('NotFound', null, 'Source wallet not found');
      }

      if (transaction_type === 'WITHDRAW' || transaction_type === 'PURCHASE') {
        if (sourceWallet.balance < +amount) {
          return createResponse(
            'InsufficientBalance',
            null,
            'Insufficient balance in the source wallet',
          );
        }

        // Update the source wallet balance (subtract the amount)
        sourceWallet.balance -= +amount;
        await sourceWallet.save();
      }

      let destinationWallet;

      // Handling deposit or purchase to a destination wallet
      if (transaction_type === 'DEPOSIT' || transaction_type === 'PURCHASE') {
        destinationWallet = await this.fWalletModel
          .findById(destination)
          .exec();

        if (!destinationWallet) {
          // If destination wallet doesn't exist, add amount to the user's temporary wallet balance
          destinationWallet = await this.userModel.findById(destination).exec();
          if (!destinationWallet) {
            return createResponse(
              'NotFound',
              null,
              'Destination wallet or user not found',
            );
          }

          // Increase the temporary wallet balance
          destinationWallet.temporary_wallet_balance =
            (destinationWallet.temporary_wallet_balance || 0) + +amount;
          await destinationWallet.save();
        } else {
          // If destination wallet exists, update the balance in the wallet
          destinationWallet.balance += +amount;
          await destinationWallet.save();
        }
      }

      // Create new transaction entry
      const newTransaction = new this.transactionModel({
        user_id,
        fwallet_id,
        transaction_type,
        amount: +amount,
        balance_after: +balance_after,
        status: status || 'PENDING', // Default status is 'PENDING'
        source,
        destination,
      });

      // Save the new transaction and return success response
      await newTransaction.save();
      return createResponse(
        'OK',
        newTransaction,
        'Transaction created successfully',
      );

  }

  // Get all transactions
  async findAll(): Promise<any> {
    try {
      const transactions = await this.transactionModel.find().exec();
      return createResponse('OK', transactions, 'Fetched all transactions');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while fetching transactions',
      );
    }
  }

  // Get a transaction by ID
  async findTransactionById(id: string): Promise<any> {
    try {
      const transaction = await this.transactionModel.findById(id).exec();
      if (!transaction) {
        return createResponse('NotFound', null, 'Transaction not found');
      }
      return createResponse(
        'OK',
        transaction,
        'Fetched transaction successfully',
      );
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while fetching the transaction',
      );
    }
  }

  // Find one transaction by dynamic field and value
  async findOne(conditions: object): Promise<any> {
    try {
      const transaction = await this.transactionModel
        .findOne(conditions)
        .exec();
      if (!transaction) {
        return createResponse('NotFound', null, 'Transaction not found');
      }
      return createResponse(
        'OK',
        transaction,
        'Fetched transaction successfully',
      );
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while fetching the transaction',
      );
    }
  }

  // Update a transaction by ID
  async update(
    id: string,
    updateTransactionDto: UpdateTransactionDto,
  ): Promise<any> {
    try {
      const updatedTransaction = await this.transactionModel
        .findByIdAndUpdate(id, updateTransactionDto, { new: true })
        .exec();

      if (!updatedTransaction) {
        return createResponse('NotFound', null, 'Transaction not found');
      }

      return createResponse(
        'OK',
        updatedTransaction,
        'Transaction updated successfully',
      );
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while updating the transaction',
      );
    }
  }

  // Delete a transaction by ID
  async remove(id: string): Promise<any> {
    try {
      const deletedTransaction = await this.transactionModel
        .findByIdAndDelete(id)
        .exec();

      if (!deletedTransaction) {
        return createResponse('NotFound', null, 'Transaction not found');
      }

      return createResponse('OK', null, 'Transaction deleted successfully');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while deleting the transaction',
      );
    }
  }
}
