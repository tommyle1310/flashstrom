import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DriverProgressStagesService } from './driver_progress_stages.service';
import { DriverProgressStagesController } from './driver_progress_stages.controller';
import { DriverProgressStageSchema } from './driver_progress_stages.schema';
import { OrderSchema } from '../orders/orders.schema';
import { DriversRepository } from 'src/drivers/drivers.repository';
import { DriversModule } from 'src/drivers/drivers.module';
import { forwardRef } from '@nestjs/common';
import { Driver } from 'src/drivers/entities/driver.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'DriverProgressStage', schema: DriverProgressStageSchema },
      { name: 'Order', schema: OrderSchema }
    ]),
    forwardRef(() => DriversModule),
    TypeOrmModule.forFeature([Driver])
  ],
  controllers: [DriverProgressStagesController],
  providers: [DriverProgressStagesService, DriversRepository],
  exports: [DriverProgressStagesService]
})
export class DriverProgressStagesModule {}
