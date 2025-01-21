import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FWalletSchema, FWallet } from './fwallets.schema';
import { FWalletService } from './fwallets.service';
import { FWalletController } from './fwallets.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'FWallet', schema: FWalletSchema },  // Register the FWallet model
    ]),
  ],
  providers: [FWalletService],
  controllers: [FWalletController],
})
export class FwalletsModule {}
