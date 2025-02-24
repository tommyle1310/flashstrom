import { Module } from '@nestjs/common';
import { TransactionService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { TransactionSchema } from './transactions.schema';
import { User } from 'src/users/entities/user.entity';
import { UsersModule } from 'src/users/users.module';
import { FWalletSchema } from 'src/fwallets/fwallets.schema';
import { FwalletsModule } from 'src/fwallets/fwallets.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRepository } from 'src/users/users.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Transaction', schema: TransactionSchema } // Register the FWallet model
    ]),
    TypeOrmModule.forFeature([User]), // Added TypeORM for User
    UsersModule, // Changed from UserModule
    MongooseModule.forFeature([{ name: 'FWallet', schema: FWalletSchema }]), // fwallet model
    FwalletsModule
  ],
  controllers: [TransactionsController],
  providers: [TransactionService, UserRepository]
})
export class TransactionsModule {}
