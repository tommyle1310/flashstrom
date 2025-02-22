import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DriverProgressStage } from './driver_progress_stages.schema';
import { CreateDriverProgressStageDto } from './dto/create-driver-progress-stage.dto';
import { createResponse } from 'src/utils/createResponse';
import { ApiResponse } from 'src/utils/createResponse';
import { Order } from 'src/orders/orders.schema';
import { Driver } from 'src/drivers/drivers.schema';
import { UpdateDriverProgressStageDto } from './dto/update-driver-progress-stage.dto';

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
      // Initialize all 5 stages with their default states
      const initialStages = [
        'driver_ready',
        'waiting_for_pickup',
        'restaurant_pickup',
        'en_route_to_customer',
        'delivery_complete'
      ].map((state, index) => ({
        state,
        status: index === 0 ? 'in_progress' : 'pending',
        timestamp: new Date(),
        duration: 0,
        details: {
          location: null,
          estimated_time: null,
          actual_time: null,
          notes: null,
          tip: null,
          weather: null
        }
      }));
      console.log('wtf is this', {
        ...createDto,
        stages: initialStages
      });
      // Create new stage with the initialized stages
      const newStage = new this.driverProgressStageModel({
        ...createDto,
        stages: initialStages
      });

      const savedStage = await newStage.save();
      console.log('Created driver progress stage with stages:', savedStage);

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
    updateData: UpdateDriverProgressStageDto
  ): Promise<ApiResponse<DriverProgressStage>> {
    try {
      const stage = await this.driverProgressStageModel.findById(stageId);
      if (!stage) {
        return createResponse('NotFound', null, 'Progress stage not found');
      }

      // Update state history and add events
      if (stage.current_state !== updateData.current_state) {
        // Mark the previous state as completed in state_history
        const lastHistoryEntry = stage.stages[stage.stages.length - 1];
        if (lastHistoryEntry) {
          lastHistoryEntry.status = 'completed';
          lastHistoryEntry.duration =
            Date.now() - lastHistoryEntry.timestamp.getTime();
        }

        stage.previous_state = stage.current_state;
        stage.current_state = updateData.current_state;

        // Add new state with in_progress status
        const newHistoryEntry = {
          state: updateData.current_state,
          status: 'in_progress' as const,
          timestamp: new Date(),
          duration: 0,
          details: updateData.details || {}
        };
        stage.stages.push(newHistoryEntry);

        // Add corresponding event based on state transition
        if (updateData.current_state === 'restaurant_pickup') {
          stage.events.push({
            event_type: 'pickup_complete',
            event_timestamp: new Date(),
            event_details: {
              location: updateData.details?.location,
              notes: updateData.details?.notes
            }
          });
        } else if (updateData.current_state === 'delivery_complete') {
          // Mark the current state as completed since this is the final state
          const currentHistoryEntry = stage.stages[stage.stages.length - 1];
          if (currentHistoryEntry) {
            currentHistoryEntry.status = 'completed';
            currentHistoryEntry.duration =
              Date.now() - currentHistoryEntry.timestamp.getTime();
          }

          stage.events.push({
            event_type: 'delivery_complete',
            event_timestamp: new Date(),
            event_details: {
              location: updateData.details?.location,
              notes: updateData.details?.notes
            }
          });

          // Update all associated orders' status to DELIVERED
          await Promise.all([
            ...stage.order_ids.map(orderId =>
              this.orderModel.findByIdAndUpdate(orderId, {
                status: 'DELIVERED',
                tracking_info: 'DELIVERED',
                updated_at: Math.floor(Date.now() / 1000)
              })
            ),
            // Remove the completed order from driver's current_order_id array
            (async () => {
              const updatedDriver = await this.driverModel.findByIdAndUpdate(
                stage.driver_id,
                {
                  $pullAll: { current_order_id: stage.order_ids }
                },
                { new: true }
              );
              return updatedDriver;
            })()
          ]);
        } else if (updateData.current_state === 'en_route_to_customer') {
          // Update all associated orders' tracking info to OUT_FOR_DELIVERY
          await Promise.all(
            stage.order_ids.map(orderId =>
              this.orderModel.findByIdAndUpdate(orderId, {
                tracking_info: 'OUT_FOR_DELIVERY',
                updated_at: Math.floor(Date.now() / 1000)
              })
            )
          );
        }
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

  async findAll(): Promise<ApiResponse<DriverProgressStage[]>> {
    try {
      const stages = await this.driverProgressStageModel.find().exec();
      return createResponse(
        'OK',
        stages,
        'Driver progress stages retrieved successfully'
      );
    } catch (err) {
      console.error('Error fetching driver progress stages:', err);
      return createResponse(
        'ServerError',
        null,
        'Error fetching driver progress stages'
      );
    }
  }

  async findById(id: string): Promise<ApiResponse<DriverProgressStage>> {
    try {
      const stage = await this.driverProgressStageModel.findById(id).exec();
      if (!stage) {
        return createResponse(
          'NotFound',
          null,
          'Driver progress stage not found'
        );
      }
      return createResponse('OK', stage, 'Driver progress stage found');
    } catch (err) {
      console.error('Error fetching driver progress stage:', err);
      return createResponse(
        'ServerError',
        null,
        'Error fetching driver progress stage'
      );
    }
  }

  async remove(id: string): Promise<ApiResponse<any>> {
    try {
      const result = await this.driverProgressStageModel
        .findByIdAndDelete(id)
        .exec();
      if (!result) {
        return createResponse(
          'NotFound',
          null,
          'Driver progress stage not found'
        );
      }
      return createResponse(
        'OK',
        null,
        'Driver progress stage deleted successfully'
      );
    } catch (err) {
      console.error('Error deleting driver progress stage:', err);
      return createResponse(
        'ServerError',
        null,
        'Error deleting driver progress stage'
      );
    }
  }

  async updateStages(
    stageId: string,
    updatedStages: any[]
  ): Promise<ApiResponse<DriverProgressStage>> {
    try {
      const stage = await this.driverProgressStageModel.findByIdAndUpdate(
        stageId,
        { stages: updatedStages },
        { new: true }
      );

      if (!stage) {
        return createResponse('NotFound', null, 'Progress stage not found');
      }

      return createResponse('OK', stage, 'Stages updated successfully');
    } catch (err) {
      console.error('Error updating stages:', err);
      return createResponse('ServerError', null, 'Error updating stages');
    }
  }
}
