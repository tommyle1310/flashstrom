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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriversRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const typeorm_2 = require("@nestjs/typeorm");
const driver_entity_1 = require("./entities/driver.entity");
const order_entity_1 = require("../orders/entities/order.entity");
let DriversRepository = class DriversRepository {
    constructor(driverEntityRepository, orderRepository) {
        this.driverEntityRepository = driverEntityRepository;
        this.orderRepository = orderRepository;
    }
    async findById(id, options) {
        const driver = await this.driverEntityRepository.findOne({
            where: { id },
            relations: options?.relations || ['user']
        });
        return driver || null;
    }
    async findOne(conditions) {
        return await this.driverEntityRepository.findOne({ where: conditions });
    }
    async findOneOrFail(conditions) {
        console.log('findOneOrFail conditions:', conditions);
        return await this.driverEntityRepository.findOneOrFail({
            where: conditions.where
        });
    }
    async findAll() {
        return await this.driverEntityRepository.find();
    }
    async create(createDriverDto) {
        const driver = this.driverEntityRepository.create(createDriverDto);
        return await this.driverEntityRepository.save(driver);
    }
    async update(id, updateDriverDto) {
        await this.driverEntityRepository.update(id, updateDriverDto);
        return await this.findById(id);
    }
    async save(driver) {
        return await this.driverEntityRepository.save(driver);
    }
    async remove(id) {
        const driver = await this.findById(id);
        if (driver) {
            await this.driverEntityRepository.delete(id);
        }
        return driver;
    }
    async findByUserId(userId) {
        return await this.driverEntityRepository.findOne({
            where: { user_id: userId }
        });
    }
    async updateVehicleImages(id, vehicleImages) {
        const driver = await this.findById(id);
        if (!driver) {
            throw new Error('Driver not found');
        }
        if (!driver.vehicle) {
            driver.vehicle = {
                license_plate: '',
                model: '',
                color: '',
                images: [],
                brand: '',
                year: 2000,
                owner: ''
            };
        }
        const updatedVehicleImages = [
            ...(driver.vehicle.images || []),
            ...vehicleImages
        ];
        await this.driverEntityRepository.update(id, {
            vehicle: {
                ...driver.vehicle,
                images: updatedVehicleImages
            },
            updated_at: Math.floor(Date.now() / 1000)
        });
        return await this.findById(id);
    }
};
exports.DriversRepository = DriversRepository;
exports.DriversRepository = DriversRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_2.InjectRepository)(driver_entity_1.Driver)),
    __param(1, (0, typeorm_2.InjectRepository)(order_entity_1.Order)),
    __metadata("design:paramtypes", [typeorm_1.Repository,
        typeorm_1.Repository])
], DriversRepository);
//# sourceMappingURL=drivers.repository.js.map