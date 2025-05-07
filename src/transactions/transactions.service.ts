import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { Transaction } from './entities/transaction.entity';
import { createResponse, ApiResponse } from 'src/utils/createResponse';
import { FWalletsRepository } from 'src/fwallets/fwallets.repository';
import { TransactionsRepository } from './transactions.repository';
import { FWallet } from 'src/fwallets/entities/fwallet.entity';
import { DataSource, EntityManager } from 'typeorm';
import { createClient } from 'redis';
import { OrdersService } from 'src/orders/orders.service';

const logger = new Logger('TransactionService');

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redis.connect().catch(err => logger.error('Redis connection error:', err));

@Injectable()
export class TransactionService {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly fWalletsRepository: FWalletsRepository,
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService
  ) {}

  async create(
    createTransactionDto: CreateTransactionDto,
    manager?: EntityManager
  ): Promise<ApiResponse<Transaction>> {
    const start = Date.now();
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.log(
          `Attempt ${attempt}: Creating transaction`,
          createTransactionDto
        );

        const txManager = manager || this.dataSource.createEntityManager();
        const isExternalManager = !!manager;

        const result = isExternalManager
          ? await this.processTransaction(createTransactionDto, txManager)
          : await this.dataSource.transaction(async txManager =>
              this.processTransaction(createTransactionDto, txManager)
            );

        logger.log(`Transaction service took ${Date.now() - start}ms`);
        return result;
      } catch (error: any) {
        if (
          error.name === 'OptimisticLockVersionMismatchError' &&
          attempt < maxRetries
        ) {
          logger.warn(
            `Optimistic lock failed on attempt ${attempt}, retrying...`,
            error
          );
          const wallet = await this.fWalletsRepository.findById(
            createTransactionDto.fwallet_id
          );
          if (wallet) {
            createTransactionDto.version = wallet.version || 0;
            createTransactionDto.balance_after =
              Number(wallet.balance) - createTransactionDto.amount;
            await redis.del(`fwallet:${createTransactionDto.user_id}`);
          } else {
            logger.error('Wallet not found for retry', createTransactionDto);
            return createResponse('NotFound', null, 'Wallet not found');
          }
        } else {
          logger.error(
            `Error creating transaction on attempt ${attempt}:`,
            error
          );
          return createResponse(
            'ServerError',
            null,
            'Error creating transaction'
          );
        }
      }
    }

    return createResponse(
      'ServerError',
      null,
      'Failed to create transaction after retries'
    );
  }

  private async processTransaction(
    createTransactionDto: CreateTransactionDto,
    manager: EntityManager
  ): Promise<ApiResponse<Transaction>> {
    const { transaction_type, amount, fwallet_id, destination } =
      createTransactionDto;

    logger.log('Processing transaction:', createTransactionDto);

    if (transaction_type === 'WITHDRAW' || transaction_type === 'PURCHASE') {
      const sourceWallet = await manager
        .createQueryBuilder(FWallet, 'wallet')
        .where('wallet.id = :id', { id: fwallet_id })
        .andWhere('wallet.version = :version', {
          version: createTransactionDto.version || 0
        })
        .select([
          'wallet.id',
          'wallet.balance',
          'wallet.version',
          'wallet.user_id'
        ])
        .getOne();
      if (!sourceWallet) {
        return createResponse('NotFound', null, 'Source wallet not found');
      }
      if (Number(sourceWallet.balance) < amount) {
        return createResponse(
          'InsufficientBalance',
          null,
          'Insufficient balance in the source wallet'
        );
      }
      await this.handleSourceWalletTransaction(sourceWallet, amount, manager);
    }

    if (transaction_type === 'DEPOSIT' || transaction_type === 'PURCHASE') {
      await this.handleDestinationWalletTransaction(
        destination,
        amount,
        manager,
        transaction_type
      );
    }

    const newTransaction = await this.transactionsRepository.create(
      createTransactionDto,
      manager
    );
    logger.log('Transaction created:', {
      id: newTransaction.id,
      amount: newTransaction.amount,
      status: newTransaction.status
    });

    if (transaction_type === 'WITHDRAW' || transaction_type === 'PURCHASE') {
      const sourceWallet = await manager
        .createQueryBuilder(FWallet, 'wallet')
        .where('wallet.id = :id', { id: fwallet_id })
        .select([
          'wallet.id',
          'wallet.balance',
          'wallet.version',
          'wallet.user_id'
        ])
        .getOne();
      if (sourceWallet) {
        await redis.setEx(
          `fwallet:${sourceWallet.user_id}`,
          7200,
          JSON.stringify(sourceWallet)
        );
      }
    }

    return createResponse(
      'OK',
      newTransaction,
      'Transaction created successfully'
    );
  }

  private async handleSourceWalletTransaction(
    sourceWallet: FWallet,
    amount: number,
    manager: EntityManager
  ): Promise<void> {
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.log(`Attempt ${attempt}: Updating source wallet:`, {
          id: sourceWallet.id,
          balance: sourceWallet.balance,
          user_id: sourceWallet.user_id,
          version: sourceWallet.version
        });
        const currentBalance = Number(sourceWallet.balance);
        const newBalance = Number((currentBalance - amount).toFixed(2));

        const updateResult = await manager
          .createQueryBuilder()
          .update(FWallet)
          .set({
            balance: newBalance,
            updated_at: Math.floor(Date.now() / 1000),
            version: (sourceWallet.version || 0) + 1
          })
          .where('id = :id AND version = :version', {
            id: sourceWallet.id,
            version: sourceWallet.version || 0
          })
          .execute();
        logger.log('Source wallet update result:', {
          affected: updateResult.affected,
          raw: updateResult.raw
        });

        if (updateResult.affected === 0) {
          throw new Error(
            `Failed to update source wallet ${sourceWallet.id} due to version conflict`
          );
        }

        sourceWallet.balance = newBalance;
        sourceWallet.updated_at = Math.floor(Date.now() / 1000);
        sourceWallet.version = (sourceWallet.version || 0) + 1;
        logger.log('Source wallet after update:', {
          id: sourceWallet.id,
          balance: sourceWallet.balance,
          user_id: sourceWallet.user_id,
          version: sourceWallet.version
        });

        await redis.del(`fwallet:${sourceWallet.user_id}`);
        return;
      } catch (error: any) {
        if (
          error.message.includes('version conflict') &&
          attempt < maxRetries
        ) {
          logger.warn(
            `Optimistic lock failed on source wallet attempt ${attempt}, retrying...`,
            error
          );
          const updatedWallet = await manager
            .createQueryBuilder(FWallet, 'wallet')
            .where('wallet.id = :id', { id: sourceWallet.id })
            .select([
              'wallet.id',
              'wallet.balance',
              'wallet.version',
              'wallet.user_id'
            ])
            .getOne();
          if (updatedWallet) {
            sourceWallet = updatedWallet;
          } else {
            throw new Error(`Source wallet ${sourceWallet.id} not found`);
          }
        } else {
          throw error;
        }
      }
    }
    throw new Error(
      `Failed to update source wallet ${sourceWallet.id} after ${maxRetries} retries`
    );
  }

  private async handleDestinationWalletTransaction(
    destination: string,
    amount: number,
    manager: EntityManager,
    transaction_type?: string
  ): Promise<void> {
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        let destinationWallet;

        // For PURCHASE transactions, find wallet by user_id
        if (transaction_type === 'PURCHASE') {
          destinationWallet = await manager
            .createQueryBuilder(FWallet, 'wallet')
            .where('wallet.user_id = :userId', { userId: destination })
            .select([
              'wallet.id',
              'wallet.balance',
              'wallet.version',
              'wallet.user_id'
            ])
            .getOne();
        } else {
          // For other transactions (like DEPOSIT), find wallet by wallet.id
          destinationWallet = await manager
            .createQueryBuilder(FWallet, 'wallet')
            .where('wallet.id = :id', { id: destination })
            .select([
              'wallet.id',
              'wallet.balance',
              'wallet.version',
              'wallet.user_id'
            ])
            .getOne();
        }

        if (!destinationWallet) {
          const errorMessage =
            transaction_type === 'PURCHASE'
              ? `Destination wallet for user ${destination} not found`
              : `Destination wallet ${destination} not found`;
          throw new Error(errorMessage);
        }

        logger.log('Found destination wallet:', {
          id: destinationWallet.id,
          user_id: destinationWallet.user_id,
          balance: destinationWallet.balance,
          version: destinationWallet.version
        });

        const currentBalance = Number(destinationWallet.balance);
        const newBalance = Number((currentBalance + amount).toFixed(2));

        const updateResult = await manager
          .createQueryBuilder()
          .update(FWallet)
          .set({
            balance: newBalance,
            updated_at: Math.floor(Date.now() / 1000),
            version: (destinationWallet.version || 0) + 1
          })
          .where('id = :id AND version = :version', {
            id: destinationWallet.id,
            version: destinationWallet.version || 0
          })
          .execute();
        logger.log('Destination wallet update result:', {
          affected: updateResult.affected,
          raw: updateResult.raw
        });

        if (updateResult.affected === 0) {
          throw new Error(
            `Failed to update destination wallet ${destinationWallet.id} due to version conflict`
          );
        }

        destinationWallet.balance = newBalance;
        destinationWallet.updated_at = Math.floor(Date.now() / 1000);
        destinationWallet.version = (destinationWallet.version || 0) + 1;

        await redis.del(`fwallet:${destinationWallet.user_id}`);
        await redis.setEx(
          `fwallet:${destinationWallet.user_id}`,
          7200,
          JSON.stringify(destinationWallet)
        );
        return;
      } catch (error: any) {
        if (
          error.message.includes('version conflict') &&
          attempt < maxRetries
        ) {
          logger.warn(
            `Optimistic lock failed on destination wallet attempt ${attempt}, retrying...`,
            error
          );
        } else if (error.message.includes('not found')) {
          throw error;
        } else {
          throw new Error(`Failed to update destination wallet ${destination}`);
        }
      }
    }
    throw new Error(
      `Failed to update destination wallet ${destination} after ${maxRetries} retries`
    );
  }

  async findAll(): Promise<ApiResponse<Transaction[]>> {
    try {
      const transactions = await this.transactionsRepository.findAll();
      return createResponse('OK', transactions, 'Fetched all transactions');
    } catch (error: any) {
      return this.handleError('Error fetching transactions:', error);
    }
  }

  async findTransactionById(id: string): Promise<ApiResponse<Transaction>> {
    try {
      const transaction = await this.transactionsRepository.findById(id);
      return this.handleTransactionResponse(transaction);
    } catch (error: any) {
      return this.handleError('Error fetching transaction:', error);
    }
  }

  async findOne(conditions: object): Promise<ApiResponse<Transaction>> {
    try {
      const transaction =
        await this.transactionsRepository.findByCondition(conditions);
      return this.handleTransactionResponse(transaction);
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
      return this.handleError('Error deleting transaction:', error);
    }
  }

  async findAllPaginated(
    page: number = 1,
    limit: number = 10
  ): Promise<
    ApiResponse<{
      totalPages: number;
      currentPage: number;
      totalItems: number;
      items: Transaction[];
    }>
  > {
    try {
      const skip = (page - 1) * limit;
      const [transactions, total] =
        await this.transactionsRepository.findAllPaginated(skip, limit);
      const totalPages = Math.ceil(total / limit);

      return createResponse(
        'OK',
        {
          totalPages,
          currentPage: page,
          totalItems: total,
          items: transactions
        },
        'Fetched paginated transactions'
      );
    } catch (error: any) {
      console.error('Error fetching paginated transactions:', error);
      return createResponse(
        'ServerError',
        null,
        'Error fetching paginated transactions'
      );
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

  async updateTransactionStatus(
    transactionId: string,
    newStatus: 'PENDING' | 'CANCELLED' | 'FAILED' | 'COMPLETED',
    orderId?: string,
    manager?: EntityManager
  ): Promise<ApiResponse<Transaction>> {
    const txManager = manager || this.dataSource.createEntityManager();

    try {
      const transaction =
        await this.transactionsRepository.findById(transactionId);
      if (!transaction) {
        return createResponse('NotFound', null, 'Transaction not found');
      }

      // Update transaction status
      transaction.status = newStatus;
      transaction.updated_at = Math.floor(Date.now() / 1000);

      // If this is a PURCHASE transaction and we have an orderId, sync the order payment status
      if (transaction.transaction_type === 'PURCHASE' && orderId) {
        let orderPaymentStatus: 'PENDING' | 'PAID' | 'FAILED';

        switch (newStatus) {
          case 'COMPLETED':
            orderPaymentStatus = 'PAID';
            break;
          case 'FAILED':
            orderPaymentStatus = 'FAILED';
            break;
          case 'CANCELLED':
            orderPaymentStatus = 'FAILED';
            break;
          default:
            orderPaymentStatus = 'PENDING';
        }

        // Update order payment status
        await this.ordersService.updateOrderPaymentStatus(
          orderId,
          orderPaymentStatus,
          txManager
        );
      }

      // If transaction is completed, ensure wallet balance is updated
      if (newStatus === 'COMPLETED' && !transaction.balance_after) {
        const wallet = await this.fWalletsRepository.findById(
          transaction.fwallet_id
        );
        if (wallet) {
          const currentBalance = Number(wallet.balance);
          transaction.balance_after =
            transaction.transaction_type === 'WITHDRAW' ||
            transaction.transaction_type === 'PURCHASE'
              ? currentBalance - transaction.amount
              : currentBalance + transaction.amount;
        }
      }

      // Save transaction using the repository's update method
      await this.transactionsRepository.update(transactionId, {
        status: newStatus,
        balance_after: transaction.balance_after,
        updated_at: transaction.updated_at
      });

      // Get updated transaction
      const updatedTransaction =
        await this.transactionsRepository.findById(transactionId);

      // Clear cache
      await redis.del(`transaction:${transactionId}`);
      await redis.del(`fwallet:${transaction.user_id}`);

      return createResponse(
        'OK',
        updatedTransaction,
        'Transaction status updated successfully'
      );
    } catch (error) {
      logger.error('Error updating transaction status:', error);
      return createResponse(
        'ServerError',
        null,
        'Failed to update transaction status'
      );
    }
  }
}
