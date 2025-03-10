import { Injectable } from '@nestjs/common';
import { DriverProgressStagesRepository } from './driver_progress_stages.repository';
import {
  CreateDriverProgressStageDto,
  StageDto
} from './dto/create-driver-progress-stage.dto';
import { UpdateDriverProgressStageDto } from './dto/update-driver-progress-stage.dto';
import { createResponse } from 'src/utils/createResponse';
import { ApiResponse } from 'src/utils/createResponse';
import { DriverProgressStage } from './entities/driver_progress_stage.entity';
import { DriversRepository } from 'src/drivers/drivers.repository';
import { OrdersRepository } from 'src/orders/orders.repository';
import { DataSource, EntityManager } from 'typeorm';

@Injectable()
export class DriverProgressStagesService {
  constructor(
    private readonly driverProgressStagesRepository: DriverProgressStagesRepository,
    private readonly driversRepository: DriversRepository,
    private readonly ordersRepository: OrdersRepository,
    private readonly dataSource: DataSource
  ) {}
  async create(
    createDto: CreateDriverProgressStageDto,
    transactionalEntityManager?: EntityManager
  ): Promise<ApiResponse<DriverProgressStage>> {
    const manager = transactionalEntityManager || this.dataSource.manager;

    try {
      const initialStages: StageDto[] = [
        'driver_ready',
        'waiting_for_pickup',
        'restaurant_pickup',
        'en_route_to_customer',
        'delivery_complete'
      ].map(state => ({
        state,
        status: state === 'driver_ready' ? 'in_progress' : 'pending',
        timestamp: Math.floor(Date.now() / 1000),
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

      // Kiểm tra lại existingOrderDPS trước khi tạo
      if (createDto.orders && createDto.orders.length > 0) {
        for (const order of createDto.orders) {
          const existingRelation = await manager
            .createQueryBuilder()
            .select('dpo')
            .from('driver_progress_orders', 'dpo')
            .where('dpo.order_id = :orderId', { orderId: order.id })
            .getRawOne();
          if (existingRelation) {
            throw new Error(
              `Order ${order.id} is already assigned to another DPS`
            );
          }
        }
      }

      // Tạo và lưu DPS
      const dps = manager.create(DriverProgressStage, {
        ...createDto,
        stages: initialStages,
        events: [],
        created_at: Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000)
      });

      const savedStage = await manager.save(DriverProgressStage, dps);
      console.log(`DPS saved in driverProgressStageService: ${savedStage.id}`);

      // Thêm quan hệ vào driver_progress_orders
      if (createDto.orders && createDto.orders.length > 0) {
        for (const order of createDto.orders) {
          const existingRelation = await manager
            .createQueryBuilder()
            .select('dpo')
            .from('driver_progress_orders', 'dpo')
            .where(
              'dpo.driver_progress_id = :progressId AND dpo.order_id = :orderId',
              {
                progressId: savedStage.id,
                orderId: order.id
              }
            )
            .getRawOne();
          if (!existingRelation) {
            await manager
              .createQueryBuilder()
              .insert()
              .into('driver_progress_orders')
              .values({
                driver_progress_id: savedStage.id,
                order_id: order.id
              })
              .execute();
            console.log(
              `Saved order relation for DPS: ${savedStage.id}, order: ${order.id}`
            );
          } else {
            console.log(
              `Relation already exists for DPS: ${savedStage.id}, order: ${order.id}`
            );
          }
        }
      }

      return createResponse(
        'OK',
        savedStage,
        'Driver progress stage created successfully'
      );
    } catch (err) {
      console.error('Error creating driver progress stage:', err);
      throw err; // Đảm bảo rollback
    }
  }

  async updateStage(
    stageId: string,
    updateData: UpdateDriverProgressStageDto
  ): Promise<ApiResponse<DriverProgressStage>> {
    try {
      console.log('🔍 Updating stage:', stageId, 'with data:', updateData);

      const existingStage =
        await this.driverProgressStagesRepository.findById(stageId);
      if (!existingStage) {
        return createResponse('NotFound', null, 'Progress stage not found');
      }

      // Only update the current_state and stages array
      const updatedStage = await this.driverProgressStagesRepository.update(
        stageId,
        {
          current_state: updateData.current_state,
          stages: updateData.stages,
          updated_at: Math.floor(Date.now() / 1000)
        }
      );

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
      console.log('🔍 Finding active stage for driver:', driverId);

      // First try to find any existing stage for this driver
      const stage =
        await this.driverProgressStagesRepository.findByDriverId(driverId);

      console.log('🔍 Found stage:', stage);

      if (!stage) {
        console.log('❌ No stage found for driver');
        return createResponse('NotFound', null, 'No active stage found');
      }

      return createResponse('OK', stage, 'Active stage found');
    } catch (err) {
      console.error('Error finding active stage:', err);
      return createResponse('ServerError', null, 'Error finding active stage');
    }
  }

  async findAll(): Promise<ApiResponse<DriverProgressStage[]>> {
    try {
      const stages = await this.driverProgressStagesRepository.findAll();
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
      const stage = await this.driverProgressStagesRepository.findById(id);
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
      const result = await this.driverProgressStagesRepository.remove(id);
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
      const updatedStage =
        await this.driverProgressStagesRepository.updateStages(
          stageId,
          updatedStages
        );
      return createResponse('OK', updatedStage, 'Stages updated successfully');
    } catch (err) {
      console.error('Error updating stages:', err);
      return createResponse('ServerError', null, 'Error updating stages');
    }
  }
}
