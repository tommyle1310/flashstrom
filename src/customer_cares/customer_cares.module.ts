import { Module } from '@nestjs/common';
import { CustomerCareService } from './customer_cares.service';
import { CustomerCareController } from './customer_cares.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomerCareSchema } from './customer_cares.schema';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'CustomerCare', schema: CustomerCareSchema }
    ]),
    TypeOrmModule.forFeature([User])
  ],
  controllers: [CustomerCareController],
  providers: [CustomerCareService],
  exports: [CustomerCareService]
})
export class CustomerCaresModule {}
