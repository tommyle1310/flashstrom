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
const typeorm_1 = require("typeorm");
let TransactionService = class TransactionService {
    constructor(transactionsRepository, userRepository, fWalletsRepository, dataSource) {
        this.transactionsRepository = transactionsRepository;
        this.userRepository = userRepository;
        this.fWalletsRepository = fWalletsRepository;
        this.dataSource = dataSource;
    }
    async create(createTransactionDto, manager) {
        try {
            const validationResult = await this.validateTransaction(createTransactionDto);
            if (validationResult !== true) {
                return validationResult;
            }
            const { transaction_type, amount, fwallet_id, destination } = createTransactionDto;
            console.log('check transaciton dto', createTransactionDto);
            if (transaction_type === 'WITHDRAW' || transaction_type === 'PURCHASE') {
                const sourceWallet = await this.fWalletsRepository.findById(fwallet_id, manager);
                if (!sourceWallet) {
                    return (0, createResponse_1.createResponse)('NotFound', null, 'Source wallet not found');
                }
                await this.handleSourceWalletTransaction(sourceWallet, amount, manager);
            }
            if (transaction_type === 'DEPOSIT' || transaction_type === 'PURCHASE') {
                await this.handleDestinationWalletTransaction(destination, amount, manager);
            }
            const newTransaction = await this.transactionsRepository.create(createTransactionDto, manager);
            console.log('Transaction prepared:', newTransaction);
            return (0, createResponse_1.createResponse)('OK', newTransaction, 'Transaction created successfully');
        }
        catch (error) {
            return this.handleError('Error creating transaction:', error);
        }
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
    async validateTransaction(createTransactionDto) {
        const { user_id, transaction_type, amount, fwallet_id } = createTransactionDto;
        console.log('check creat dto transactoin service', createTransactionDto);
        const userResponse = await this.userRepository.findById(user_id);
        if (!userResponse) {
            return (0, createResponse_1.createResponse)('NotFound', null, 'User not found');
        }
        if (transaction_type === 'WITHDRAW' || transaction_type === 'PURCHASE') {
            const sourceWallet = await this.fWalletsRepository.findById(fwallet_id);
            if (!sourceWallet) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Source wallet not found');
            }
            const currentBalance = parseFloat(sourceWallet.balance.toString());
            if (currentBalance < amount) {
                return (0, createResponse_1.createResponse)('InsufficientBalance', null, 'Insufficient balance in the source wallet');
            }
        }
        return true;
    }
    async handleSourceWalletTransaction(sourceWallet, amount, manager) {
        console.log('check sourcewallet,', sourceWallet);
        const currentBalance = parseFloat(sourceWallet.balance.toString());
        console.log('debug here ', currentBalance, '-??', amount);
        const newBalance = Number((currentBalance - amount).toFixed(2));
        sourceWallet.balance = newBalance;
        console.log('check balance before update', sourceWallet.balance);
        const updateResult = await this.fWalletsRepository.update(sourceWallet.id, { balance: sourceWallet.balance }, manager);
        console.log('check update result', updateResult);
        if (updateResult.affected === 0) {
            throw new Error(`Failed to update wallet ${sourceWallet.id}`);
        }
        const updatedWallet = await this.fWalletsRepository.findById(sourceWallet.id, manager);
        console.log('check wallet after update', updatedWallet);
    }
    async handleDestinationWalletTransaction(destination, amount, manager) {
        const destinationWallet = await this.fWalletsRepository.findById(destination, manager);
        if (destinationWallet) {
            const currentBalance = Number(destinationWallet.balance);
            if (isNaN(currentBalance)) {
                throw new Error('Invalid balance value in destination wallet');
            }
            const amountNumber = Number(amount);
            if (isNaN(amountNumber)) {
                throw new Error('Invalid amount value');
            }
            const newBalance = Math.round((currentBalance + amountNumber) * 100) / 100;
            destinationWallet.balance = newBalance;
            const updateResult = await this.fWalletsRepository.update(destinationWallet.id, { balance: newBalance }, manager);
            if (updateResult.affected === 0) {
                throw new Error(`Failed to update wallet ${destinationWallet.id}`);
            }
        }
        else {
            const destinationUser = await this.userRepository.findById(destination, manager);
            if (destinationUser) {
                const currentBalance = Number(destinationUser.balance || 0);
                if (isNaN(currentBalance)) {
                    throw new Error('Invalid balance value in destination user');
                }
                const amountNumber = Number(amount);
                if (isNaN(amountNumber)) {
                    throw new Error('Invalid amount value');
                }
                const newBalance = Math.round((currentBalance + amountNumber) * 100) / 100;
                await this.userRepository.update(destination, { balance: newBalance }, manager);
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
        console.error(message, error);
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