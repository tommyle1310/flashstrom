import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerCareInquiriesService } from './customer_cares_inquires.service';
import { CustomerCareInquiriesController } from './customer_cares_inquires.controller';
import { CustomerCareInquiry } from './entities/customer_care_inquiry.entity';
import { CustomerCareInquiriesRepository } from './customer_cares_inquires.repository';
import { CustomerCare } from 'src/customer_cares/entities/customer_care.entity';
import { Order } from 'src/orders/entities/order.entity';
import { RedisService } from 'src/redis/redis.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CustomerCareInquiry, CustomerCare, Order])
  ],
  controllers: [CustomerCareInquiriesController],
  providers: [
    CustomerCareInquiriesService,
    RedisService,
    CustomerCareInquiriesRepository
  ],
  exports: [CustomerCareInquiriesService, CustomerCareInquiriesRepository]
})
export class CustomerCareInquiriesModule {}
