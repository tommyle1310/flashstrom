import { Module } from '@nestjs/common';
import { BannedAccountService } from './banned-account.service';
import { BannedAccountController } from './banned-account.controller';

@Module({
  controllers: [BannedAccountController],
  providers: [BannedAccountService],
})
export class BannedAccountModule {}
