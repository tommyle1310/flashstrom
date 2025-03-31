import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { Transaction } from './entities/transaction.entity';
import { ApiResponse } from 'src/utils/createResponse';
import { UserRepository } from 'src/users/users.repository';
import { FWalletsRepository } from 'src/fwallets/fwallets.repository';
import { TransactionsRepository } from './transactions.repository';
import { DataSource, EntityManager } from 'typeorm';
export declare class TransactionService {
    private readonly transactionsRepository;
    private readonly userRepository;
    private readonly fWalletsRepository;
    private readonly dataSource;
    constructor(transactionsRepository: TransactionsRepository, userRepository: UserRepository, fWalletsRepository: FWalletsRepository, dataSource: DataSource);
    create(createTransactionDto: CreateTransactionDto, manager?: EntityManager): Promise<ApiResponse<Transaction>>;
    findAll(): Promise<ApiResponse<Transaction[]>>;
    findTransactionById(id: string): Promise<ApiResponse<Transaction>>;
    findOne(conditions: object): Promise<ApiResponse<Transaction>>;
    update(id: string, updateTransactionDto: UpdateTransactionDto): Promise<ApiResponse<Transaction>>;
    remove(id: string): Promise<ApiResponse<null>>;
    private validateTransaction;
    private handleSourceWalletTransaction;
    private handleDestinationWalletTransaction;
    private handleTransactionResponse;
    private handleError;
}
