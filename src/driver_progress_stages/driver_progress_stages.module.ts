import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DriverProgressStagesService } from './driver_progress_stages.service';
import { DriverProgressStagesController } from './driver_progress_stages.controller';
import { DriverProgressStageSchema } from './driver_progress_stages.schema';
import { DriversRepository } from 'src/drivers/drivers.repository';
import { DriversModule } from 'src/drivers/drivers.module';
import { forwardRef } from '@nestjs/common';
import { Driver } from 'src/drivers/entities/driver.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from 'src/orders/entities/order.entity';
import { OrdersRepository } from 'src/orders/orders.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'DriverProgressStage', schema: DriverProgressStageSchema }
    ]),
    forwardRef(() => DriversModule),
    TypeOrmModule.forFeature([Driver, Order])
  ],
  controllers: [DriverProgressStagesController],
  providers: [DriverProgressStagesService, DriversRepository, OrdersRepository],
  exports: [DriverProgressStagesService]
})
export class DriverProgressStagesModule {}
