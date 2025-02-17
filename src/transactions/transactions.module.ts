import { Module } from '@nestjs/common';
import { TransactionService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { TransactionSchema } from './transactions.schema';
import { UserSchema } from 'src/user/user.schema';
import { UserModule } from 'src/user/user.module';
import { FWalletSchema } from 'src/fwallets/fwallets.schema';
import { FwalletsModule } from 'src/fwallets/fwallets.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Transaction', schema: TransactionSchema } // Register the FWallet model
    ]),
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]), // fwallet model
    UserModule,
    MongooseModule.forFeature([{ name: 'FWallet', schema: FWalletSchema }]), // fwallet model
    FwalletsModule
  ],
  controllers: [TransactionsController],
  providers: [TransactionService]
})
export class TransactionsModule {}
