import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DriverProgressStage } from './driver_progress_stages.schema';
import { CreateDriverProgressStageDto } from './dto/create-driver-progress-stage.dto';
import { createResponse } from 'src/utils/createResponse';
import { ApiResponse } from 'src/utils/createResponse';
import { Order } from 'src/orders/orders.schema';
import { Driver } from 'src/drivers/drivers.schema';

@Injectable()
export class DriverProgressStagesService {
  constructor(
    @InjectModel('DriverProgressStage')
    private readonly driverProgressStageModel: Model<DriverProgressStage>,
    @InjectModel('Order') private readonly orderModel: Model<Order>,
    @InjectModel('Driver') private readonly driverModel: Model<Driver>
  ) {}

  async create(
    createDto: CreateDriverProgressStageDto
  ): Promise<ApiResponse<DriverProgressStage>> {
    try {
      const newStage = new this.driverProgressStageModel(createDto);
      const savedStage = await newStage.save();
      return createResponse(
        'OK',
        savedStage,
        'Driver progress stage created successfully'
      );
    } catch (err) {
      console.error('Error creating driver progress stage:', err);
      return createResponse(
        'ServerError',
        null,
        'Error creating driver progress stage'
      );
    }
  }

  async updateStage(
    stageId: string,
    updateData: any
  ): Promise<ApiResponse<DriverProgressStage>> {
    try {
      const stage = await this.driverProgressStageModel.findById(stageId);
      if (!stage) {
        return createResponse('NotFound', null, 'Progress stage not found');
      }

      // Update state history
      if (stage.current_state !== updateData.current_state) {
        stage.previous_state = stage.current_state;
        stage.current_state = updateData.current_state;

        const newHistoryEntry = {
          state: updateData.current_state,
          status: 'in_progress' as const,
          timestamp: new Date(),
          duration: 0,
          details: updateData.details || {}
        };
        stage.state_history.push(newHistoryEntry);
      }

      // Update other fields
      Object.assign(stage, updateData);
      const updatedStage = await stage.save();

      return createResponse(
        'OK',
        updatedStage,
        'Driver progress stage updated successfully'
      );
    } catch (err) {
      console.error('Error updating driver progress stage:', err);
      return createResponse(
        'ServerError',
        null,
        'Error updating driver progress stage'
      );
    }
  }

  async getActiveStageByDriver(
    driverId: string
  ): Promise<ApiResponse<DriverProgressStage>> {
    try {
      const stage = await this.driverProgressStageModel
        .findOne({
          driver_id: driverId,
          current_state: { $ne: 'delivery_complete' }
        })
        .exec();

      if (!stage) {
        return createResponse(
          'NotFound',
          null,
          'No active progress stage found for driver'
        );
      }

      return createResponse('OK', stage, 'Active progress stage found');
    } catch (err) {
      console.error('Error fetching driver progress stage:', err);
      return createResponse(
        'ServerError',
        null,
        'Error fetching driver progress stage'
      );
    }
  }
}
