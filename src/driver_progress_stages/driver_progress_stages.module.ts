import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DriverProgressStagesService } from './driver_progress_stages.service';
import { DriverProgressStageSchema } from './driver_progress_stages.schema';
import { OrderSchema } from '../orders/orders.schema';
import { DriverSchema } from '../drivers/drivers.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'DriverProgressStage', schema: DriverProgressStageSchema },
      { name: 'Order', schema: OrderSchema },
      { name: 'Driver', schema: DriverSchema }
    ])
  ],
  providers: [DriverProgressStagesService],
  exports: [DriverProgressStagesService]
})
export class DriverProgressStagesModule {}
