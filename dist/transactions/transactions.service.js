"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionService = void 0;
const common_1 = require("@nestjs/common");
const createResponse_1 = require("../utils/createResponse");
const fwallets_repository_1 = require("../fwallets/fwallets.repository");
const transactions_repository_1 = require("./transactions.repository");
const fwallet_entity_1 = require("../fwallets/entities/fwallet.entity");
const typeorm_1 = require("typeorm");
const redis_1 = require("redis");
const logger = new common_1.Logger('TransactionService');
const redis = (0, redis_1.createClient)({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redis.connect().catch(err => logger.error('Redis connection error:', err));
let TransactionService = class TransactionService {
    constructor(transactionsRepository, fWalletsRepository, dataSource) {
        this.transactionsRepository = transactionsRepository;
        this.fWalletsRepository = fWalletsRepository;
        this.dataSource = dataSource;
    }
    async create(createTransactionDto, manager) {
        const start = Date.now();
        const maxRetries = 3;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                logger.log(`Attempt ${attempt}: Creating transaction`, createTransactionDto);
                const txManager = manager || this.dataSource.createEntityManager();
                const isExternalManager = !!manager;
                const result = isExternalManager
                    ? await this.processTransaction(createTransactionDto, txManager)
                    : await this.dataSource.transaction(async (txManager) => this.processTransaction(createTransactionDto, txManager));
                logger.log(`Transaction service took ${Date.now() - start}ms`);
                return result;
            }
            catch (error) {
                if (error.name === 'OptimisticLockVersionMismatchError' &&
                    attempt < maxRetries) {
                    logger.warn(`Optimistic lock failed on attempt ${attempt}, retrying...`, error);
                    const wallet = await this.fWalletsRepository.findById(createTransactionDto.fwallet_id);
                    if (wallet) {
                        createTransactionDto.version = wallet.version || 0;
                        createTransactionDto.balance_after =
                            Number(wallet.balance) - createTransactionDto.amount;
                        await redis.del(`fwallet:${createTransactionDto.user_id}`);
                    }
                    else {
                        logger.error('Wallet not found for retry', createTransactionDto);
                        return (0, createResponse_1.createResponse)('NotFound', null, 'Wallet not found');
                    }
                }
                else {
                    logger.error(`Error creating transaction on attempt ${attempt}:`, error);
                    return (0, createResponse_1.createResponse)('ServerError', null, 'Error creating transaction');
                }
            }
        }
        return (0, createResponse_1.createResponse)('ServerError', null, 'Failed to create transaction after retries');
    }
    async processTransaction(createTransactionDto, manager) {
        const { transaction_type, amount, fwallet_id, destination } = createTransactionDto;
        logger.log('Processing transaction:', createTransactionDto);
        if (transaction_type === 'WITHDRAW' || transaction_type === 'PURCHASE') {
            const sourceWallet = await manager
                .createQueryBuilder(fwallet_entity_1.FWallet, 'wallet')
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
                return (0, createResponse_1.createResponse)('NotFound', null, 'Source wallet not found');
            }
            if (Number(sourceWallet.balance) < amount) {
                return (0, createResponse_1.createResponse)('InsufficientBalance', null, 'Insufficient balance in the source wallet');
            }
            await this.handleSourceWalletTransaction(sourceWallet, amount, manager);
        }
        if (transaction_type === 'DEPOSIT' || transaction_type === 'PURCHASE') {
            await this.handleDestinationWalletTransaction(destination, amount, manager);
        }
        const newTransaction = await this.transactionsRepository.create(createTransactionDto, manager);
        logger.log('Transaction created:', {
            id: newTransaction.id,
            amount: newTransaction.amount,
            status: newTransaction.status
        });
        if (transaction_type === 'WITHDRAW' || transaction_type === 'PURCHASE') {
            const sourceWallet = await manager
                .createQueryBuilder(fwallet_entity_1.FWallet, 'wallet')
                .where('wallet.id = :id', { id: fwallet_id })
                .select([
                'wallet.id',
                'wallet.balance',
                'wallet.version',
                'wallet.user_id'
            ])
                .getOne();
            if (sourceWallet) {
                await redis.setEx(`fwallet:${sourceWallet.user_id}`, 7200, JSON.stringify(sourceWallet));
            }
        }
        return (0, createResponse_1.createResponse)('OK', newTransaction, 'Transaction created successfully');
    }
    async handleSourceWalletTransaction(sourceWallet, amount, manager) {
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
                    .update(fwallet_entity_1.FWallet)
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
                    throw new Error(`Failed to update source wallet ${sourceWallet.id} due to version conflict`);
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
            }
            catch (error) {
                if (error.message.includes('version conflict') &&
                    attempt < maxRetries) {
                    logger.warn(`Optimistic lock failed on source wallet attempt ${attempt}, retrying...`, error);
                    const updatedWallet = await manager
                        .createQueryBuilder(fwallet_entity_1.FWallet, 'wallet')
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
                    }
                    else {
                        throw new Error(`Source wallet ${sourceWallet.id} not found`);
                    }
                }
                else {
                    throw error;
                }
            }
        }
        throw new Error(`Failed to update source wallet ${sourceWallet.id} after ${maxRetries} retries`);
    }
    async handleDestinationWalletTransaction(destination, amount, manager) {
        const maxRetries = 3;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const destinationWallet = await manager
                    .createQueryBuilder(fwallet_entity_1.FWallet, 'wallet')
                    .where('wallet.id = :id', { id: destination })
                    .select([
                    'wallet.id',
                    'wallet.balance',
                    'wallet.version',
                    'wallet.user_id'
                ])
                    .getOne();
                if (!destinationWallet) {
                    throw new Error(`Destination wallet ${destination} not found`);
                }
                const currentBalance = Number(destinationWallet.balance);
                const newBalance = Number((currentBalance + amount).toFixed(2));
                const updateResult = await manager
                    .createQueryBuilder()
                    .update(fwallet_entity_1.FWallet)
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
                    throw new Error(`Failed to update destination wallet ${destinationWallet.id} due to version conflict`);
                }
                destinationWallet.balance = newBalance;
                destinationWallet.updated_at = Math.floor(Date.now() / 1000);
                destinationWallet.version = (destinationWallet.version || 0) + 1;
                await redis.del(`fwallet:${destinationWallet.user_id}`);
                await redis.setEx(`fwallet:${destinationWallet.user_id}`, 7200, JSON.stringify(destinationWallet));
                return;
            }
            catch (error) {
                if (error.message.includes('version conflict') &&
                    attempt < maxRetries) {
                    logger.warn(`Optimistic lock failed on destination wallet attempt ${attempt}, retrying...`, error);
                }
                else if (error.message.includes('not found')) {
                    throw error;
                }
                else {
                    throw new Error(`Failed to update destination wallet ${destination}`);
                }
            }
        }
        throw new Error(`Failed to update destination wallet ${destination} after ${maxRetries} retries`);
    }
    async findAll() {
        try {
            const transactions = await this.transactionsRepository.findAll();
            return (0, createResponse_1.createResponse)('OK', transactions, 'Fetched all transactions');
        }
        catch (error) {
            return this.handleError('Error fetching transactions:', error);
        }
    }
    async findTransactionById(id) {
        try {
            const transaction = await this.transactionsRepository.findById(id);
            return this.handleTransactionResponse(transaction);
        }
        catch (error) {
            return this.handleError('Error fetching transaction:', error);
        }
    }
    async findOne(conditions) {
        try {
            const transaction = await this.transactionsRepository.findByCondition(conditions);
            return this.handleTransactionResponse(transaction);
        }
        catch (error) {
            return this.handleError('Error fetching transaction:', error);
        }
    }
    async update(id, updateTransactionDto) {
        try {
            const updatedTransaction = await this.transactionsRepository.update(id, updateTransactionDto);
            return this.handleTransactionResponse(updatedTransaction);
        }
        catch (error) {
            return this.handleError('Error updating transaction:', error);
        }
    }
    async remove(id) {
        try {
            const result = await this.transactionsRepository.remove(id);
            if (!result) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Transaction not found');
            }
            return (0, createResponse_1.createResponse)('OK', null, 'Transaction deleted successfully');
        }
        catch (error) {
            return this.handleError('Error deleting transaction:', error);
        }
    }
    async findAllPaginated(page = 1, limit = 10) {
        try {
            const skip = (page - 1) * limit;
            const [transactions, total] = await this.transactionsRepository.findAllPaginated(skip, limit);
            const totalPages = Math.ceil(total / limit);
            return (0, createResponse_1.createResponse)('OK', {
                totalPages,
                currentPage: page,
                totalItems: total,
                items: transactions
            }, 'Fetched paginated transactions');
        }
        catch (error) {
            console.error('Error fetching paginated transactions:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error fetching paginated transactions');
        }
    }
    handleTransactionResponse(transaction) {
        if (!transaction) {
            return (0, createResponse_1.createResponse)('NotFound', null, 'Transaction not found');
        }
        return (0, createResponse_1.createResponse)('OK', transaction, 'Transaction retrieved successfully');
    }
    handleError(message, error) {
        logger.error(message, error);
        return (0, createResponse_1.createResponse)('ServerError', null, 'An error occurred while processing your request');
    }
};
exports.TransactionService = TransactionService;
exports.TransactionService = TransactionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [transactions_repository_1.TransactionsRepository,
        fwallets_repository_1.FWalletsRepository,
        typeorm_1.DataSource])
], TransactionService);
//# sourceMappingURL=transactions.service.js.map