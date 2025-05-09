import { Module, forwardRef } from '@nestjs/common';
import { TransactionService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { OrdersModule } from 'src/orders/orders.module';
import { FwalletsModule } from 'src/fwallets/fwallets.module';
import { UsersModule } from 'src/users/users.module';
import { TransactionsRepository } from './transactions.repository';
import { FWallet } from 'src/fwallets/entities/fwallet.entity';
import { FWalletsRepository } from 'src/fwallets/fwallets.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, FWallet]),
    forwardRef(() => OrdersModule),
    FwalletsModule,
    UsersModule
  ],
  controllers: [TransactionsController],
  providers: [TransactionService, TransactionsRepository, FWalletsRepository],
  exports: [TransactionService, TransactionsRepository]
})
export class TransactionsModule {}
