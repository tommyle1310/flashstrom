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
  ) {
    logger.log('TransactionService constructor called');
    logger.log('Checking injected dependencies:');
    logger.log('- transactionsRepository:', !!this.transactionsRepository);
    logger.log('- fWalletsRepository:', !!this.fWalletsRepository);
    logger.log('- dataSource:', !!this.dataSource);
    logger.log('- ordersService:', !!this.ordersService);
  }

  private handleError(message: string, error: any): ApiResponse<any> {
    logger.error(`${message}:`, error);
    return createResponse('ServerError', null, error.message || message);
  }

  async create(
    createTransactionDto: CreateTransactionDto,
    manager?: EntityManager
  ): Promise<ApiResponse<Transaction>> {
    logger.log('Creating transaction with DTO:', createTransactionDto);
    try {
      const txManager = manager || this.dataSource.createEntityManager();
      logger.log('Using transaction manager:', !!manager ? 'provided' : 'new');

      const start = Date.now();
      const maxRetries = 3;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          logger.log(
            `Attempt ${attempt}: Creating transaction`,
            createTransactionDto
          );

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
    } catch (error: any) {
      return this.handleError('Error creating transaction:', error);
    }
  }

  private async processTransaction(
    createTransactionDto: CreateTransactionDto,
    manager: EntityManager
  ): Promise<ApiResponse<Transaction>> {
    const { transaction_type, amount, fwallet_id, destination } =
      createTransactionDto;

    logger.log('Processing transaction:', createTransactionDto);
    let newTransaction: Transaction;

    try {
      // First create the transaction with PENDING status
      newTransaction = await this.transactionsRepository.create(
        {
          ...createTransactionDto,
          status: 'PENDING'
        },
        manager
      );
      logger.log('Created initial transaction with PENDING status:', {
        id: newTransaction.id,
        status: newTransaction.status
      });

      // Handle source wallet (deduction)
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

        logger.log('Found source wallet:', sourceWallet);

        if (!sourceWallet) {
          return createResponse('NotFound', null, 'Source wallet not found');
        }

        // Version check
        if (
          createTransactionDto.version !== undefined &&
          sourceWallet.version !== createTransactionDto.version
        ) {
          logger.warn('Wallet version mismatch:', {
            expected: createTransactionDto.version,
            actual: sourceWallet.version
          });
          return createResponse(
            'InvalidFormatInput',
            null,
            'Wallet version mismatch'
          );
        }

        if (Number(sourceWallet.balance) < amount) {
          return createResponse(
            'InsufficientBalance',
            null,
            'Insufficient balance in the source wallet'
          );
        }

        // Deduct from source wallet
        await this.handleSourceWalletTransaction(sourceWallet, amount, manager);
        logger.log('Successfully deducted from source wallet');
      }

      // Handle destination wallet (addition)
      if (transaction_type === 'DEPOSIT' || transaction_type === 'PURCHASE') {
        await this.handleDestinationWalletTransaction(
          destination,
          amount,
          manager,
          transaction_type
        );
        logger.log('Successfully added to destination wallet');
      }

      // After both wallets are successfully updated, mark transaction as COMPLETED
      if (
        transaction_type === 'PURCHASE' ||
        transaction_type === 'DEPOSIT' ||
        transaction_type === 'WITHDRAW'
      ) {
        logger.log(
          'Both wallets updated successfully, marking transaction as COMPLETED'
        );

        // Update the transaction status to COMPLETED
        const updateData = {
          status: 'COMPLETED' as const,
          updated_at: Math.floor(Date.now() / 1000)
        };
        await manager.update(
          Transaction,
          { id: newTransaction.id },
          updateData
        );
        logger.log('Transaction status updated to COMPLETED');
      }

      // Update Redis cache for source wallet if applicable
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
          logger.log('Updated Redis cache for source wallet');
        }
      }

      // Fetch the final updated transaction
      const updatedTransaction = await manager.findOne(Transaction, {
        where: { id: newTransaction.id }
      });
      logger.log('Final transaction state:', {
        id: updatedTransaction.id,
        status: updatedTransaction.status,
        amount: updatedTransaction.amount
      });

      return createResponse(
        'OK',
        updatedTransaction,
        'Transaction processed successfully'
      );
    } catch (error) {
      logger.error('Error in processTransaction:', error);
      if (newTransaction?.id) {
        try {
          const updateData = {
            status: 'FAILED' as const,
            updated_at: Math.floor(Date.now() / 1000)
          };
          await manager.update(
            Transaction,
            { id: newTransaction.id },
            updateData
          );
          logger.log('Marked transaction as FAILED due to error');
        } catch (updateError) {
          logger.error(
            'Error updating transaction status to FAILED:',
            updateError
          );
        }
      }
      throw error;
    }
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

        // Convert to numbers with 2 decimal places
        const currentBalance = Number(
          parseFloat(sourceWallet.balance.toString()).toFixed(2)
        );
        const amountToDeduct = Number(parseFloat(amount.toString()).toFixed(2));
        const newBalance = Number((currentBalance - amountToDeduct).toFixed(2));

        logger.log('Calculating new balance:', {
          currentBalance,
          amountToDeduct,
          newBalance,
          originalBalance: sourceWallet.balance,
          originalAmount: amount
        });

        const updateResult = await manager
          .createQueryBuilder()
          .update(FWallet)
          .set({
            balance: newBalance,
            updated_at: Math.floor(Date.now() / 1000),
            version: (sourceWallet.version || 0) + 1
          })
          .where('id = :id AND version = :version AND balance >= :amount', {
            id: sourceWallet.id,
            version: sourceWallet.version || 0,
            amount: amountToDeduct
          })
          .execute();

        logger.log('Source wallet update result:', {
          affected: updateResult.affected,
          raw: updateResult.raw
        });

        if (updateResult.affected === 0) {
          // Check if it's a version mismatch or insufficient balance
          const currentWallet = await manager.findOne(FWallet, {
            where: { id: sourceWallet.id }
          });

          if (!currentWallet) {
            throw new Error(`Source wallet ${sourceWallet.id} not found`);
          }

          const currentWalletBalance = Number(
            parseFloat(currentWallet.balance.toString()).toFixed(2)
          );
          if (currentWalletBalance < amountToDeduct) {
            throw new Error('Insufficient balance');
          }

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
        logger.error(`Error on attempt ${attempt}:`, error);

        if (error.message === 'Insufficient balance') {
          throw error; // Don't retry if it's an insufficient balance error
        }

        if (attempt === maxRetries) {
          throw error;
        }
        // Small delay before retry
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  private async handleDestinationWalletTransaction(
    destination: string,
    amount: number,
    manager: EntityManager,
    transaction_type?: string
  ): Promise<void> {
    const maxRetries = 3;
    let destinationWallet;
    let attempt = 1;

    while (attempt <= maxRetries) {
      try {
        // For PURCHASE transactions, find wallet by ID directly since we're passing wallet ID
        if (transaction_type === 'PURCHASE') {
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
          const errorMessage = `Destination wallet ${destination} not found`;
          logger.error(errorMessage);
          throw new Error(errorMessage);
        }

        logger.log('Found destination wallet:', {
          id: destinationWallet.id,
          user_id: destinationWallet.user_id,
          balance: destinationWallet.balance,
          version: destinationWallet.version
        });

        // Convert values to numbers with 2 decimal places
        const currentBalance = Number(
          parseFloat(destinationWallet.balance.toString()).toFixed(2)
        );
        const amountToAdd = Number(parseFloat(amount.toString()).toFixed(2));
        const newBalance = Number((currentBalance + amountToAdd).toFixed(2));

        logger.log('Calculating new balance:', {
          currentBalance,
          amountToAdd,
          newBalance,
          originalBalance: destinationWallet.balance,
          originalAmount: amount
        });

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
          logger.warn(
            `Optimistic lock failed on destination wallet attempt ${attempt}, retrying...`
          );
          attempt++;
          continue;
        }

        // Update was successful
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
        logger.error(`Error on attempt ${attempt}:`, error);

        if (attempt < maxRetries) {
          attempt++;
          // Small delay before retry
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }
        throw new Error(
          `Failed to update destination wallet ${destination} after ${maxRetries} retries`
        );
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

  async updateTransactionStatus(
    transactionId: string,
    newStatus: 'PENDING' | 'CANCELLED' | 'FAILED' | 'COMPLETED',
    orderId?: string,
    manager?: EntityManager
  ): Promise<ApiResponse<Transaction>> {
    logger.log(`Updating transaction ${transactionId} status to ${newStatus}`);
    logger.log('OrderId provided:', orderId);

    const txManager = manager || this.dataSource.createEntityManager();
    logger.log('Using transaction manager:', !!manager ? 'provided' : 'new');

    try {
      const transaction =
        await this.transactionsRepository.findById(transactionId);
      if (!transaction) {
        logger.warn(`Transaction ${transactionId} not found`);
        return createResponse('NotFound', null, 'Transaction not found');
      }
      logger.log('Found transaction:', transaction);

      // Update transaction status
      transaction.status = newStatus;
      transaction.updated_at = Math.floor(Date.now() / 1000);
      logger.log('Updated transaction fields:', {
        status: transaction.status,
        updated_at: transaction.updated_at
      });

      // If this is a PURCHASE transaction and we have an orderId, sync the order payment status
      if (transaction.transaction_type === 'PURCHASE' && orderId) {
        logger.log('Syncing order payment status for PURCHASE transaction');
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
        logger.log('Mapped transaction status to order payment status:', {
          transactionStatus: newStatus,
          orderPaymentStatus
        });

        // Update order payment status
        logger.log('Calling ordersService.updateOrderPaymentStatus');
        const orderUpdateResult =
          await this.ordersService.updateOrderPaymentStatus(
            orderId,
            orderPaymentStatus,
            txManager
          );
        logger.log('Order payment status update result:', orderUpdateResult);
      }

      // If transaction is completed, ensure wallet balance is updated
      if (newStatus === 'COMPLETED' && !transaction.balance_after) {
        logger.log('Updating wallet balance for completed transaction');
        const wallet = await this.fWalletsRepository.findById(
          transaction.fwallet_id
        );
        if (wallet) {
          logger.log('Found wallet:', wallet);
          const currentBalance = Number(wallet.balance);
          transaction.balance_after =
            transaction.transaction_type === 'WITHDRAW' ||
            transaction.transaction_type === 'PURCHASE'
              ? currentBalance - transaction.amount
              : currentBalance + transaction.amount;
          logger.log('Calculated new balance:', transaction.balance_after);
        } else {
          logger.warn(`Wallet ${transaction.fwallet_id} not found`);
        }
      }

      // Save transaction using the repository's update method
      logger.log('Saving updated transaction');
      await this.transactionsRepository.update(transactionId, {
        status: newStatus,
        balance_after: transaction.balance_after,
        updated_at: transaction.updated_at
      });

      // Get updated transaction
      const updatedTransaction =
        await this.transactionsRepository.findById(transactionId);
      logger.log('Retrieved updated transaction:', updatedTransaction);

      // Clear cache
      logger.log('Clearing Redis cache');
      await redis.del(`transaction:${transactionId}`);
      await redis.del(`fwallet:${transaction.user_id}`);
      logger.log('Redis cache cleared');

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
