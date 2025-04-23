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
const users_repository_1 = require("../users/users.repository");
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
    constructor(transactionsRepository, userRepository, fWalletsRepository, dataSource) {
        this.transactionsRepository = transactionsRepository;
        this.userRepository = userRepository;
        this.fWalletsRepository = fWalletsRepository;
        this.dataSource = dataSource;
    }
    async create(createTransactionDto, manager) {
        const start = Date.now();
        try {
            logger.log('check transaction dto', createTransactionDto);
            const txManager = manager || this.dataSource.createEntityManager();
            const isExternalManager = !!manager;
            const result = isExternalManager
                ? await this.processTransaction(createTransactionDto, txManager)
                : await this.dataSource.transaction(async (txManager) => this.processTransaction(createTransactionDto, txManager));
            logger.log(`Transaction service took ${Date.now() - start}ms`);
            return result;
        }
        catch (error) {
            logger.error('Error creating transaction:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error creating transaction');
        }
    }
    async processTransaction(createTransactionDto, manager) {
        const { transaction_type, amount, fwallet_id, destination } = createTransactionDto;
        const validationResult = await this.validateTransaction(createTransactionDto, manager);
        if (validationResult !== true) {
            return validationResult;
        }
        let sourceWallet = null;
        if (transaction_type === 'WITHDRAW' || transaction_type === 'PURCHASE') {
            sourceWallet = await manager.findOne(fwallet_entity_1.FWallet, {
                where: { id: fwallet_id },
                lock: { mode: 'optimistic', version: createTransactionDto.version || 0 }
            });
            logger.log('check sourcewallet', sourceWallet);
            if (!sourceWallet) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Source wallet not found');
            }
            await this.handleSourceWalletTransaction(sourceWallet, amount, manager);
        }
        if (transaction_type === 'DEPOSIT' || transaction_type === 'PURCHASE') {
            await this.handleDestinationWalletTransaction(destination, amount, manager);
        }
        const newTransaction = await this.transactionsRepository.create(createTransactionDto, manager);
        logger.log('Transaction prepared:', newTransaction);
        if (sourceWallet) {
            await redis.setEx(`fwallet:${sourceWallet.id}`, 3600, JSON.stringify(sourceWallet));
        }
        return (0, createResponse_1.createResponse)('OK', newTransaction, 'Transaction created successfully');
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
    async validateTransaction(createTransactionDto, manager) {
        const { user_id, transaction_type, amount, fwallet_id } = createTransactionDto;
        logger.log('check create dto transaction service', createTransactionDto);
        const userResponse = await manager
            .getRepository('User')
            .findOne({ where: { id: user_id } });
        if (!userResponse) {
            return (0, createResponse_1.createResponse)('NotFound', null, 'User not found');
        }
        if (transaction_type === 'WITHDRAW' || transaction_type === 'PURCHASE') {
            const sourceWallet = await manager.findOne(fwallet_entity_1.FWallet, {
                where: { id: fwallet_id }
            });
            if (!sourceWallet) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Source wallet not found');
            }
            const currentBalance = Number(sourceWallet.balance);
            if (currentBalance < amount) {
                return (0, createResponse_1.createResponse)('InsufficientBalance', null, 'Insufficient balance in the source wallet');
            }
        }
        return true;
    }
    async handleSourceWalletTransaction(sourceWallet, amount, manager) {
        logger.log('check sourcewallet', sourceWallet);
        const currentBalance = Number(sourceWallet.balance);
        logger.log('debug here', currentBalance, '-??', amount);
        const newBalance = Number((currentBalance - amount).toFixed(2));
        logger.log('check balance before update', newBalance);
        const updateResult = await manager.update(fwallet_entity_1.FWallet, { id: sourceWallet.id, version: sourceWallet.version || 0 }, {
            balance: newBalance,
            updated_at: Math.floor(Date.now() / 1000)
        });
        logger.log('repository update result', updateResult);
        if (updateResult.affected === 0) {
            throw new Error(`Failed to update wallet ${sourceWallet.id} due to version conflict`);
        }
        sourceWallet.balance = newBalance;
        sourceWallet.updated_at = Math.floor(Date.now() / 1000);
        logger.log('check wallet after update', sourceWallet);
    }
    async handleDestinationWalletTransaction(destination, amount, manager) {
        const destinationWallet = await manager.findOne(fwallet_entity_1.FWallet, {
            where: { id: destination }
        });
        if (destinationWallet) {
            const currentBalance = Number(destinationWallet.balance);
            const newBalance = Number((currentBalance + amount).toFixed(2));
            destinationWallet.balance = newBalance;
            destinationWallet.updated_at = Math.floor(Date.now() / 1000);
            const updateResult = await manager.update(fwallet_entity_1.FWallet, { id: destinationWallet.id }, {
                balance: newBalance,
                updated_at: Math.floor(Date.now() / 1000)
            });
            logger.log('check update result', updateResult);
            if (updateResult.affected === 0) {
                throw new Error(`Failed to update wallet ${destinationWallet.id}`);
            }
            await redis.setEx(`fwallet:${destinationWallet.id}`, 3600, JSON.stringify(destinationWallet));
        }
        else {
            const destinationUser = await manager
                .getRepository('User')
                .findOne({ where: { id: destination } });
            if (destinationUser) {
                const currentBalance = Number(destinationUser.balance || 0);
                const newBalance = Number((currentBalance + amount).toFixed(2));
                const updateResult = await manager.update('User', { id: destination }, {
                    balance: newBalance,
                    updated_at: Math.floor(Date.now() / 1000)
                });
                if (updateResult.affected === 0) {
                    throw new Error(`Failed to update user ${destination}`);
                }
            }
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
        users_repository_1.UserRepository,
        fwallets_repository_1.FWalletsRepository,
        typeorm_1.DataSource])
], TransactionService);
//# sourceMappingURL=transactions.service.js.map