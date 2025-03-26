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
import { Order } from 'src/orders/entities/order.entity';

@Injectable()
export class DriverProgressStagesService {
  constructor(
    private readonly driverProgressStagesRepository: DriverProgressStagesRepository,
    private readonly driversRepository: DriversRepository,
    private readonly ordersRepository: OrdersRepository,
    private readonly dataSource: DataSource
  ) {}

  async create(
    createDto: CreateDriverProgressStageDto & {
      estimated_time_remaining?: number;
      total_distance_travelled?: number;
      total_tips?: number;
      total_earns?: number;
    },
    transactionalEntityManager?: EntityManager
  ): Promise<ApiResponse<DriverProgressStage>> {
    const manager = transactionalEntityManager || this.dataSource.manager;

    try {
      const initialStages = this.generateStagesForOrders(createDto.orders);

      const dps = manager.create(DriverProgressStage, {
        ...createDto,
        stages: initialStages,
        events: [],
        estimated_time_remaining: createDto.estimated_time_remaining || 0,
        total_distance_travelled: createDto.total_distance_travelled || 0,
        total_tips: createDto.total_tips || 0,
        total_earns: createDto.total_earns || 0,
        created_at: Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000),
        orders: createDto.orders
      });

      const savedStage = await manager.save(DriverProgressStage, dps);
      // Quan hệ orders như hiện tại...

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
    updateData: UpdateDriverProgressStageDto & {
      previous_state?: string | null;
      next_state?: string | null;
      estimated_time_remaining?: number;
      actual_time_spent?: number;
      total_distance_travelled?: number;
      total_tips?: number;
      total_earns?: number;
    },
    transactionalEntityManager?: EntityManager
  ): Promise<ApiResponse<DriverProgressStage>> {
    try {
      const manager = transactionalEntityManager || this.dataSource.manager;

      const existingStage = await manager
        .getRepository(DriverProgressStage)
        .findOne({ where: { id: stageId } });
      if (!existingStage) {
        return createResponse('NotFound', null, 'Progress stage not found');
      }

      const updatedStage = await manager
        .getRepository(DriverProgressStage)
        .save({
          ...existingStage,
          current_state: updateData.current_state,
          orders: updateData.orders,
          previous_state:
            updateData.previous_state ?? existingStage.previous_state,
          next_state: updateData.next_state ?? existingStage.next_state,
          stages: updateData.stages,
          estimated_time_remaining:
            updateData.estimated_time_remaining ??
            existingStage.estimated_time_remaining,
          actual_time_spent:
            updateData.actual_time_spent ?? existingStage.actual_time_spent,
          total_distance_travelled:
            updateData.total_distance_travelled ??
            existingStage.total_distance_travelled,
          total_tips: updateData.total_tips ?? existingStage.total_tips,
          total_earns: updateData.total_earns ?? existingStage.total_earns,
          updated_at: Math.floor(Date.now() / 1000)
        });

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

  async addOrderToExistingDPS(
    dpsId: string,
    order: Order,
    transactionalEntityManager: EntityManager
  ): Promise<ApiResponse<DriverProgressStage>> {
    try {
      console.log('🔍 Fetching DPS with id:', dpsId);
      const dps = await transactionalEntityManager
        .getRepository(DriverProgressStage)
        .findOne({
          where: { id: dpsId },
          relations: ['orders']
        });
      if (!dps) {
        console.log('❌ DPS not found:', dpsId);
        throw new Error('DPS not found');
      }
      console.log('✅ DPS found:', dps.id, 'with orders:', dps.orders?.length);

      dps.orders = dps.orders || [];
      if (!dps.orders.some(o => o.id === order.id)) {
        dps.orders.push(order);
        console.log('✅ Added new order to DPS:', order.id);
      } else {
        console.log('⚠️ Order already exists in DPS:', order.id);
      }

      // Tạo stages mới, tất cả đều pending
      const newStages = this.generateStagesForOrders(
        [order],
        dps.orders.length,
        false
      );
      dps.stages = [...dps.stages, ...newStages];
      dps.updated_at = Math.floor(Date.now() / 1000);
      console.log('📋 New stages added:', JSON.stringify(newStages, null, 2));

      const updatedDPS = await transactionalEntityManager.save(
        DriverProgressStage,
        dps
      );
      console.log(`Updated DPS with new order: ${updatedDPS.id}`);

      const exists = await transactionalEntityManager
        .createQueryBuilder()
        .select('1')
        .from('driver_progress_orders', 'dpo')
        .where('dpo.driver_progress_id = :dpsId AND dpo.order_id = :orderId', {
          dpsId: updatedDPS.id,
          orderId: order.id
        })
        .getRawOne();

      if (!exists) {
        await transactionalEntityManager
          .createQueryBuilder()
          .insert()
          .into('driver_progress_orders')
          .values({
            driver_progress_id: updatedDPS.id,
            order_id: order.id
          })
          .execute();
        console.log(
          `Saved order relation for DPS: ${updatedDPS.id}, order: ${order.id}`
        );
      } else {
        console.log(
          `Relation already exists for DPS: ${updatedDPS.id}, order: ${order.id}`
        );
      }

      return createResponse('OK', updatedDPS, 'Order added to existing DPS');
    } catch (err) {
      console.error('Error adding order to DPS:', err);
      throw err;
    }
  }

  private generateStagesForOrders(
    orders: Order[],
    startIndex = 1,
    setFirstInProgress: boolean = true // Thêm tham số để kiểm soát
  ): StageDto[] {
    const baseStates = [
      'driver_ready',
      'waiting_for_pickup',
      'restaurant_pickup',
      'en_route_to_customer',
      'delivery_complete'
    ];

    const stages: StageDto[] = [];
    orders.forEach((order, index) => {
      const orderIndex = startIndex + index;
      baseStates.forEach((state, stateIndex) => {
        const isFirstStageOfFirstOrder = stateIndex === 0 && index === 0;
        stages.push({
          state: `${state}_order_${orderIndex}`,
          status:
            isFirstStageOfFirstOrder && setFirstInProgress
              ? 'in_progress'
              : 'pending',
          timestamp: Math.floor(Date.now() / 1000),
          duration: 0,
          details: null
        });
      });
    });
    return stages;
  }

  async getActiveStageByDriver(
    driverId: string
  ): Promise<ApiResponse<DriverProgressStage>> {
    try {
      const stage =
        await this.driverProgressStagesRepository.findByDriverId(driverId);

      if (!stage) {
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
