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
exports.CustomerCareInquiriesRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const typeorm_2 = require("@nestjs/typeorm");
const customer_care_inquiry_entity_1 = require("./entities/customer_care_inquiry.entity");
let CustomerCareInquiriesRepository = class CustomerCareInquiriesRepository {
    constructor(repository) {
        this.repository = repository;
    }
    async create(createDto) {
        try {
            const inquiry = this.repository.create(createDto);
            const savedInquiry = await this.repository.save(inquiry);
            return await this.repository.findOne({
                where: { id: savedInquiry.id },
                relations: [
                    'customer',
                    createDto.assignee_type === 'ADMIN'
                        ? 'assigned_admin'
                        : 'assigned_customer_care'
                ]
            });
        }
        catch (error) {
            console.error('Repository create error:', error);
            throw error;
        }
    }
    async findById(id) {
        const inquiry = await this.repository.findOne({
            where: { id }
        });
        if (!inquiry) {
            return null;
        }
        return await this.repository.findOne({
            where: { id },
            relations: [
                'customer',
                inquiry.assignee_type === 'ADMIN'
                    ? 'assigned_admin'
                    : 'assigned_customer_care'
            ]
        });
    }
    async findAll() {
        return await this.repository.find({
            relations: ['customer', 'assigned_admin', 'assigned_customer_care']
        });
    }
    async update(id, updateDto) {
        await this.repository.update(id, {
            ...updateDto,
            updated_at: Math.floor(Date.now() / 1000)
        });
        return this.findById(id);
    }
    async remove(id) {
        const result = await this.repository.delete(id);
        return result.affected > 0;
    }
};
exports.CustomerCareInquiriesRepository = CustomerCareInquiriesRepository;
exports.CustomerCareInquiriesRepository = CustomerCareInquiriesRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_2.InjectRepository)(customer_care_inquiry_entity_1.CustomerCareInquiry)),
    __metadata("design:paramtypes", [typeorm_1.Repository])
], CustomerCareInquiriesRepository);
//# sourceMappingURL=customer_cares_inquires.repository.js.map