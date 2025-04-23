import { Injectable, Logger } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { Transaction } from './entities/transaction.entity';
import { createResponse, ApiResponse } from 'src/utils/createResponse';
import { UserRepository } from 'src/users/users.repository';
import { FWalletsRepository } from 'src/fwallets/fwallets.repository';
import { TransactionsRepository } from './transactions.repository';
import { FWallet } from 'src/fwallets/entities/fwallet.entity';
import { DataSource, EntityManager } from 'typeorm';
import { createClient } from 'redis';

const logger = new Logger('TransactionService');

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redis.connect().catch(err => logger.error('Redis connection error:', err));

@Injectable()
export class TransactionService {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly userRepository: UserRepository,
    private readonly fWalletsRepository: FWalletsRepository,
    private readonly dataSource: DataSource
  ) {}

  async create(
    createTransactionDto: CreateTransactionDto,
    manager?: EntityManager
  ): Promise<ApiResponse<Transaction>> {
    const start = Date.now();
    try {
      logger.log('check transaction dto', createTransactionDto);

      // Dùng manager từ param hoặc tạo mới trong transaction
      const txManager = manager || this.dataSource.createEntityManager();
      const isExternalManager = !!manager;

      const result = isExternalManager
        ? await this.processTransaction(createTransactionDto, txManager)
        : await this.dataSource.transaction(async txManager =>
            this.processTransaction(createTransactionDto, txManager)
          );

      logger.log(`Transaction service took ${Date.now() - start}ms`);
      return result;
    } catch (error) {
      logger.error('Error creating transaction:', error);
      return createResponse('ServerError', null, 'Error creating transaction');
    }
  }

  private async processTransaction(
    createTransactionDto: CreateTransactionDto,
    manager: EntityManager
  ): Promise<ApiResponse<Transaction>> {
    const { transaction_type, amount, fwallet_id, destination } =
      createTransactionDto;

    // Validate
    const validationResult = await this.validateTransaction(
      createTransactionDto,
      manager
    );
    if (validationResult !== true) {
      return validationResult;
    }

    // Xử lý source wallet (WITHDRAW, PURCHASE)
    let sourceWallet: FWallet | null = null;
    if (transaction_type === 'WITHDRAW' || transaction_type === 'PURCHASE') {
      sourceWallet = await manager.findOne(FWallet, {
        where: { id: fwallet_id },
        lock: { mode: 'optimistic', version: createTransactionDto.version || 0 }
      });
      logger.log('check sourcewallet', sourceWallet);
      if (!sourceWallet) {
        return createResponse('NotFound', null, 'Source wallet not found');
      }
      await this.handleSourceWalletTransaction(sourceWallet, amount, manager);
    }

    // Xử lý destination wallet (DEPOSIT, PURCHASE)
    if (transaction_type === 'DEPOSIT' || transaction_type === 'PURCHASE') {
      await this.handleDestinationWalletTransaction(
        destination,
        amount,
        manager
      );
    }

    // Tạo transaction
    const newTransaction = await this.transactionsRepository.create(
      createTransactionDto,
      manager
    );
    logger.log('Transaction prepared:', newTransaction);

    // Cập nhật Redis cache cho source wallet
    if (sourceWallet) {
      await redis.setEx(
        `fwallet:${sourceWallet.id}`,
        3600,
        JSON.stringify(sourceWallet)
      );
    }

    return createResponse(
      'OK',
      newTransaction,
      'Transaction created successfully'
    );
  }

  async findAll(): Promise<ApiResponse<Transaction[]>> {
    try {
      const transactions = await this.transactionsRepository.findAll();
      return createResponse('OK', transactions, 'Fetched all transactions');
    } catch (error) {
      return this.handleError('Error fetching transactions:', error);
    }
  }

  async findTransactionById(id: string): Promise<ApiResponse<Transaction>> {
    try {
      const transaction = await this.transactionsRepository.findById(id);
      return this.handleTransactionResponse(transaction);
    } catch (error) {
      return this.handleError('Error fetching transaction:', error);
    }
  }

  async findOne(conditions: object): Promise<ApiResponse<Transaction>> {
    try {
      const transaction =
        await this.transactionsRepository.findByCondition(conditions);
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
      const updatedTransaction = await this.transactionsRepository.update(
        id,
        updateTransactionDto
      );
      return this.handleTransactionResponse(updatedTransaction);
    } catch (error) {
      return this.handleError('Error updating transaction:', error);
    }
  }

  async remove(id: string): Promise<ApiResponse<null>> {
    try {
      const result = await this.transactionsRepository.remove(id);
      if (!result) {
        return createResponse('NotFound', null, 'Transaction not found');
      }
      return createResponse('OK', null, 'Transaction deleted successfully');
    } catch (error) {
      return this.handleError('Error deleting transaction:', error);
    }
  }

  // Private helper methods
  private async validateTransaction(
    createTransactionDto: CreateTransactionDto,
    manager: EntityManager
  ): Promise<true | ApiResponse<null>> {
    const { user_id, transaction_type, amount, fwallet_id } =
      createTransactionDto;

    logger.log('check create dto transaction service', createTransactionDto);

    const userResponse = await manager
      .getRepository('User')
      .findOne({ where: { id: user_id } });
    if (!userResponse) {
      return createResponse('NotFound', null, 'User not found');
    }

    if (transaction_type === 'WITHDRAW' || transaction_type === 'PURCHASE') {
      const sourceWallet = await manager.findOne(FWallet, {
        where: { id: fwallet_id }
      });
      if (!sourceWallet) {
        return createResponse('NotFound', null, 'Source wallet not found');
      }

      const currentBalance = Number(sourceWallet.balance);
      if (currentBalance < amount) {
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
    amount: number,
    manager: EntityManager
  ): Promise<void> {
    logger.log('check sourcewallet', sourceWallet);
    const currentBalance = Number(sourceWallet.balance);
    logger.log('debug here', currentBalance, '-??', amount);
    const newBalance = Number((currentBalance - amount).toFixed(2));
    logger.log('check balance before update', newBalance);

    const updateResult = await manager.update(
      FWallet,
      { id: sourceWallet.id, version: sourceWallet.version || 0 },
      {
        balance: newBalance,
        updated_at: Math.floor(Date.now() / 1000)
      }
    );
    logger.log('repository update result', updateResult);

    if (updateResult.affected === 0) {
      throw new Error(
        `Failed to update wallet ${sourceWallet.id} due to version conflict`
      );
    }

    sourceWallet.balance = newBalance;
    sourceWallet.updated_at = Math.floor(Date.now() / 1000);
    logger.log('check wallet after update', sourceWallet);
  }

  private async handleDestinationWalletTransaction(
    destination: string,
    amount: number,
    manager: EntityManager
  ): Promise<void> {
    const destinationWallet = await manager.findOne(FWallet, {
      where: { id: destination }
    });
    if (destinationWallet) {
      const currentBalance = Number(destinationWallet.balance);
      const newBalance = Number((currentBalance + amount).toFixed(2));
      destinationWallet.balance = newBalance;
      destinationWallet.updated_at = Math.floor(Date.now() / 1000);

      const updateResult = await manager.update(
        FWallet,
        { id: destinationWallet.id },
        {
          balance: newBalance,
          updated_at: Math.floor(Date.now() / 1000)
        }
      );
      logger.log('check update result', updateResult);

      if (updateResult.affected === 0) {
        throw new Error(`Failed to update wallet ${destinationWallet.id}`);
      }

      await redis.setEx(
        `fwallet:${destinationWallet.id}`,
        3600,
        JSON.stringify(destinationWallet)
      );
    } else {
      const destinationUser = await manager
        .getRepository('User')
        .findOne({ where: { id: destination } });
      if (destinationUser) {
        const currentBalance = Number(destinationUser.balance || 0);
        const newBalance = Number((currentBalance + amount).toFixed(2));
        const updateResult = await manager.update(
          'User',
          { id: destination },
          {
            balance: newBalance,
            updated_at: Math.floor(Date.now() / 1000)
          }
        );
        if (updateResult.affected === 0) {
          throw new Error(`Failed to update user ${destination}`);
        }
      }
    }
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
    logger.error(message, error);
    return createResponse(
      'ServerError',
      null,
      'An error occurred while processing your request'
    );
  }
}
