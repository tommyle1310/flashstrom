import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VouchersController } from './vouchers.controller';
import { VouchersService } from './vouchers.service';
import { Voucher } from './entities/voucher.entity';
import { VouchersRepository } from './vouchers.repository';
import { RedisService } from 'src/redis/redis.service';

@Module({
  imports: [TypeOrmModule.forFeature([Voucher])],
  controllers: [VouchersController],
  providers: [VouchersService, VouchersRepository, RedisService],
  exports: [VouchersService, VouchersRepository]
})
export class VouchersModule {}
