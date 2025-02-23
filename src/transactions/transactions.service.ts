import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { Transaction } from './transactions.schema';
import { createResponse } from 'src/utils/createResponse';
import { ApiResponse } from 'src/utils/createResponse';
import { User } from 'src/user/user.schema';
import { FWallet } from 'src/fwallets/fwallets.schema';

@Injectable()
export class TransactionService {
  constructor(
    @InjectModel('Transaction')
    private readonly transactionModel: Model<Transaction>,
    @InjectModel('User') private readonly userModel: Model<User>,
    @InjectModel('FWallet') private readonly fWalletModel: Model<FWallet>
  ) {}

  async create(
    createTransactionDto: CreateTransactionDto
  ): Promise<ApiResponse<Transaction>> {
    try {
      const validationResult =
        await this.validateTransaction(createTransactionDto);
      if (validationResult !== true) {
        return validationResult;
      }

      const { transaction_type, amount, source, destination } =
        createTransactionDto;

      if (transaction_type === 'WITHDRAW' || transaction_type === 'PURCHASE') {
        const sourceWallet = await this.fWalletModel
          .findOne({ user_id: source })
          .exec();
        await this.handleSourceWalletTransaction(sourceWallet, amount);
      }

      if (transaction_type === 'DEPOSIT' || transaction_type === 'PURCHASE') {
        await this.handleDestinationWalletTransaction(destination, amount);
      }

      const newTransaction =
        await this.saveNewTransaction(createTransactionDto);
      return createResponse(
        'OK',
        newTransaction,
        'Transaction created successfully'
      );
    } catch (error) {
      return this.handleError('Error creating transaction:', error);
    }
  }

  async findAll(): Promise<ApiResponse<Transaction[]>> {
    try {
      const transactions = await this.transactionModel.find().exec();
      return createResponse('OK', transactions, 'Fetched all transactions');
    } catch (error) {
      return this.handleError('Error fetching transactions:', error);
    }
  }

  async findTransactionById(id: string): Promise<ApiResponse<Transaction>> {
    try {
      const transaction = await this.transactionModel.findById(id).exec();
      return this.handleTransactionResponse(transaction);
    } catch (error) {
      return this.handleError('Error fetching transaction:', error);
    }
  }

  async findOne(conditions: object): Promise<ApiResponse<Transaction>> {
    try {
      const transaction = await this.transactionModel
        .findOne(conditions)
        .exec();
      return this.handleTransactionResponse(transaction);
    } catch (error) {
      return this.handleError('Error fetching transaction:', error);
    }
  }

  async update(
    id: string,
    updateTransactionDto: UpdateTransactionDto
  ): Promise<ApiResponse<Transaction>> {
    try {
      const updatedTransaction = await this.transactionModel
        .findByIdAndUpdate(id, updateTransactionDto, { new: true })
        .exec();
      return this.handleTransactionResponse(updatedTransaction);
    } catch (error) {
      return this.handleError('Error updating transaction:', error);
    }
  }

  async remove(id: string): Promise<ApiResponse<null>> {
    try {
      const deletedTransaction = await this.transactionModel
        .findByIdAndDelete(id)
        .exec();
      if (!deletedTransaction) {
        return createResponse('NotFound', null, 'Transaction not found');
      }
      return createResponse('OK', null, 'Transaction deleted successfully');
    } catch (error) {
      return this.handleError('Error deleting transaction:', error);
    }
  }

  // Private helper methods
  private async validateTransaction(
    createTransactionDto: CreateTransactionDto
  ): Promise<true | ApiResponse<null>> {
    const { user_id, transaction_type, amount, source } = createTransactionDto;

    const user = await this.userModel.findById(user_id).exec();
    if (!user) {
      return createResponse('NotFound', null, 'User not found');
    }

    if (transaction_type === 'WITHDRAW' || transaction_type === 'PURCHASE') {
      const sourceWallet = await this.fWalletModel
        .findOne({ user_id: source })
        .exec();
      if (!sourceWallet) {
        return createResponse('NotFound', null, 'Source wallet not found');
      }

      if (sourceWallet.balance < +amount) {
        return createResponse(
          'InsufficientBalance',
          null,
          'Insufficient balance in the source wallet'
        );
      }
    }

    return true;
  }

  private async handleSourceWalletTransaction(
    sourceWallet: FWallet,
    amount: number
  ): Promise<void> {
    sourceWallet.balance -= +amount;
    await sourceWallet.save();
  }

  private async handleDestinationWalletTransaction(
    destination: string,
    amount: number
  ): Promise<void> {
    const destinationWallet = await this.fWalletModel
      .findById(destination)
      .exec();

    if (destinationWallet) {
      destinationWallet.balance += +amount;
      await destinationWallet.save();
    } else {
      const destinationUser = await this.userModel.findById(destination).exec();
      if (destinationUser) {
        destinationUser.temporary_wallet_balance =
          (destinationUser.temporary_wallet_balance || 0) + +amount;
        await destinationUser.save();
      }
    }
  }

  private async saveNewTransaction(
    transactionData: CreateTransactionDto
  ): Promise<Transaction> {
    const newTransaction = new this.transactionModel({
      ...transactionData,
      amount: +transactionData.amount,
      balance_after: +transactionData.balance_after,
      status: transactionData.status || 'PENDING'
    });
    return newTransaction.save();
  }

  private handleTransactionResponse(
    transaction: Transaction | null
  ): ApiResponse<Transaction> {
    if (!transaction) {
      return createResponse('NotFound', null, 'Transaction not found');
    }
    return createResponse(
      'OK',
      transaction,
      'Transaction retrieved successfully'
    );
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
