"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriverProgressStagesService = void 0;
const common_1 = require("@nestjs/common");
const driver_progress_stages_repository_1 = require("./driver_progress_stages.repository");
const createResponse_1 = require("../utils/createResponse");
const driver_progress_stage_entity_1 = require("./entities/driver_progress_stage.entity");
const drivers_repository_1 = require("../drivers/drivers.repository");
const orders_repository_1 = require("../orders/orders.repository");
const typeorm_1 = require("typeorm");
let DriverProgressStagesService = class DriverProgressStagesService {
    constructor(driverProgressStagesRepository, driversRepository, ordersRepository, dataSource) {
        this.driverProgressStagesRepository = driverProgressStagesRepository;
        this.driversRepository = driversRepository;
        this.ordersRepository = ordersRepository;
        this.dataSource = dataSource;
    }
    async create(createDto, transactionalEntityManager) {
        const manager = transactionalEntityManager || this.dataSource.manager;
        try {
            const initialStages = this.generateStagesForOrders(createDto.orders);
            const dps = manager.create(driver_progress_stage_entity_1.DriverProgressStage, {
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
            const savedStage = await manager.save(driver_progress_stage_entity_1.DriverProgressStage, dps);
            return (0, createResponse_1.createResponse)('OK', savedStage, 'Driver progress stage created successfully');
        }
        catch (err) {
            console.error('Error creating driver progress stage:', err);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error creating driver progress stage');
        }
    }
    async updateStage(stageId, updateData, transactionalEntityManager) {
        try {
            const manager = transactionalEntityManager || this.dataSource.manager;
            const existingStage = await manager
                .getRepository(driver_progress_stage_entity_1.DriverProgressStage)
                .findOne({ where: { id: stageId } });
            if (!existingStage) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Progress stage not found');
            }
            const updatedStage = await manager
                .getRepository(driver_progress_stage_entity_1.DriverProgressStage)
                .save({
                ...existingStage,
                current_state: updateData.current_state,
                orders: updateData.orders,
                previous_state: updateData.previous_state ?? existingStage.previous_state,
                next_state: updateData.next_state ?? existingStage.next_state,
                stages: updateData.stages,
                estimated_time_remaining: updateData.estimated_time_remaining ??
                    existingStage.estimated_time_remaining,
                actual_time_spent: updateData.actual_time_spent ?? existingStage.actual_time_spent,
                total_distance_travelled: updateData.total_distance_travelled ??
                    existingStage.total_distance_travelled,
                total_tips: updateData.total_tips ?? existingStage.total_tips,
                total_earns: updateData.total_earns ?? existingStage.total_earns,
                updated_at: Math.floor(Date.now() / 1000)
            });
            return (0, createResponse_1.createResponse)('OK', updatedStage, 'Driver progress stage updated successfully');
        }
        catch (err) {
            console.error('Error updating driver progress stage:', err);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error updating driver progress stage');
        }
    }
    async addOrderToExistingDPS(dpsId, order, transactionalEntityManager) {
        try {
            console.log('🔍 Fetching DPS with id:', dpsId);
            const dps = await transactionalEntityManager
                .getRepository(driver_progress_stage_entity_1.DriverProgressStage)
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
            }
            else {
                console.log('⚠️ Order already exists in DPS:', order.id);
            }
            const newStages = this.generateStagesForOrders([order], dps.orders.length, false);
            dps.stages = [...dps.stages, ...newStages];
            dps.updated_at = Math.floor(Date.now() / 1000);
            console.log('📋 New stages added:', JSON.stringify(newStages, null, 2));
            const updatedDPS = await transactionalEntityManager.save(driver_progress_stage_entity_1.DriverProgressStage, dps);
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
                console.log(`Saved order relation for DPS: ${updatedDPS.id}, order: ${order.id}`);
            }
            else {
                console.log(`Relation already exists for DPS: ${updatedDPS.id}, order: ${order.id}`);
            }
            return (0, createResponse_1.createResponse)('OK', updatedDPS, 'Order added to existing DPS');
        }
        catch (err) {
            console.error('Error adding order to DPS:', err);
            throw err;
        }
    }
    generateStagesForOrders(orders, startIndex = 1, setFirstInProgress = true) {
        const baseStates = [
            'driver_ready',
            'waiting_for_pickup',
            'restaurant_pickup',
            'en_route_to_customer',
            'delivery_complete'
        ];
        const stages = [];
        orders.forEach((order, index) => {
            const orderIndex = startIndex + index;
            baseStates.forEach((state, stateIndex) => {
                const isFirstStageOfFirstOrder = stateIndex === 0 && index === 0;
                stages.push({
                    state: `${state}_order_${orderIndex}`,
                    status: isFirstStageOfFirstOrder && setFirstInProgress
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
    async getActiveStageByDriver(driverId) {
        try {
            const stage = await this.driverProgressStagesRepository.findByDriverId(driverId);
            if (!stage) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'No active stage found');
            }
            return (0, createResponse_1.createResponse)('OK', stage, 'Active stage found');
        }
        catch (err) {
            console.error('Error finding active stage:', err);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error finding active stage');
        }
    }
    async findAll() {
        try {
            const stages = await this.driverProgressStagesRepository.findAll();
            return (0, createResponse_1.createResponse)('OK', stages, 'Driver progress stages retrieved successfully');
        }
        catch (err) {
            console.error('Error fetching driver progress stages:', err);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error fetching driver progress stages');
        }
    }
    async findById(id) {
        try {
            const stage = await this.driverProgressStagesRepository.findById(id);
            if (!stage) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Driver progress stage not found');
            }
            return (0, createResponse_1.createResponse)('OK', stage, 'Driver progress stage found');
        }
        catch (err) {
            console.error('Error fetching driver progress stage:', err);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error fetching driver progress stage');
        }
    }
    async remove(id) {
        try {
            const result = await this.driverProgressStagesRepository.remove(id);
            if (!result) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Driver progress stage not found');
            }
            return (0, createResponse_1.createResponse)('OK', null, 'Driver progress stage deleted successfully');
        }
        catch (err) {
            console.error('Error deleting driver progress stage:', err);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error deleting driver progress stage');
        }
    }
    async updateStages(stageId, updatedStages) {
        try {
            const updatedStage = await this.driverProgressStagesRepository.updateStages(stageId, updatedStages);
            return (0, createResponse_1.createResponse)('OK', updatedStage, 'Stages updated successfully');
        }
        catch (err) {
            console.error('Error updating stages:', err);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error updating stages');
        }
    }
};
exports.DriverProgressStagesService = DriverProgressStagesService;
exports.DriverProgressStagesService = DriverProgressStagesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [driver_progress_stages_repository_1.DriverProgressStagesRepository,
        drivers_repository_1.DriversRepository,
        orders_repository_1.OrdersRepository,
        typeorm_1.DataSource])
], DriverProgressStagesService);
//# sourceMappingURL=driver_progress_stages.service.js.map