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
const inquiries_1 = require("../utils/rules/inquiries");
const order_entity_1 = require("../orders/entities/order.entity");
const customer_care_entity_1 = require("../customer_cares/entities/customer_care.entity");
let CustomerCareInquiriesRepository = class CustomerCareInquiriesRepository {
    constructor(repository, orderRepository, customerCareRepository) {
        this.repository = repository;
        this.orderRepository = orderRepository;
        this.customerCareRepository = customerCareRepository;
    }
    async create(createDto) {
        try {
            if (!['ADMIN', 'CUSTOMER_CARE'].includes(createDto.assignee_type)) {
                throw new Error(`Invalid assignee_type: ${createDto.assignee_type}`);
            }
            const priority = await (0, inquiries_1.calculateInquiryPriority)(createDto, this.orderRepository);
            console.log(`Calculated priority: ${priority}`);
            let assignedCustomerCareId = null;
            if (createDto.assignee_type === 'CUSTOMER_CARE' &&
                !createDto.assigned_to) {
                assignedCustomerCareId = await (0, inquiries_1.findAvailableCustomerCare)(this.customerCareRepository, this.repository);
                console.log(`Assigned CustomerCare ID: ${assignedCustomerCareId}`);
                if (assignedCustomerCareId) {
                    const points = (0, inquiries_1.getPriorityPoints)(priority);
                    await this.customerCareRepository.increment({ id: assignedCustomerCareId }, 'active_point', points);
                    await this.customerCareRepository.increment({ id: assignedCustomerCareId }, 'active_workload', 1);
                    console.log(`Incremented active_point by ${points} and active_workload by 1 for CustomerCare: ${assignedCustomerCareId}`);
                }
                else {
                    console.warn('No CustomerCare assigned, falling back to ADMIN');
                    createDto.assignee_type = 'ADMIN';
                    createDto.assigned_to = 'DEFAULT_ADMIN_ID';
                }
            }
            const inquiryData = {
                ...createDto,
                priority,
                assigned_admin_id: createDto.assignee_type === 'ADMIN' ? createDto.assigned_to : null,
                assigned_customer_care: createDto.assignee_type === 'CUSTOMER_CARE' && assignedCustomerCareId
                    ? { id: assignedCustomerCareId }
                    : null
            };
            const inquiry = this.repository.create(inquiryData);
            const savedInquiry = await this.repository.save(inquiry);
            console.log(`Saved inquiry with ID: ${savedInquiry.id}`);
            const result = await this.repository.findOne({
                where: { id: savedInquiry.id },
                relations: [
                    'customer',
                    createDto.assignee_type === 'ADMIN'
                        ? 'assigned_admin'
                        : 'assigned_customer_care'
                ]
            });
            if (!result) {
                throw new Error('Failed to load saved inquiry');
            }
            return result;
        }
        catch (error) {
            console.error('Repository create error:', error);
            throw error;
        }
    }
    async update(id, updateDto) {
        try {
            const currentInquiry = await this.repository.findOne({
                where: { id },
                relations: ['assigned_customer_care']
            });
            if (!currentInquiry) {
                throw new Error('Inquiry not found');
            }
            if (updateDto.status &&
                ['RESOLVED', 'CLOSED'].includes(updateDto.status) &&
                currentInquiry.assigned_customer_care?.id) {
                await this.customerCareRepository.decrement({ id: currentInquiry.assigned_customer_care.id }, 'active_workload', 1);
                console.log(`Decremented active_workload for CustomerCare: ${currentInquiry.assigned_customer_care.id}`);
            }
            await this.repository.update(id, {
                ...updateDto,
                updated_at: Math.floor(Date.now() / 1000)
            });
            return this.findById(id);
        }
        catch (error) {
            console.error('Repository update error:', error);
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
    async findAllInquiriesByCCId(customerCareId) {
        try {
            if (!customerCareId) {
                throw new Error('CustomerCare ID is required');
            }
            console.log(`Finding inquiries for CustomerCare ID: ${customerCareId}`);
            const inquiries = await this.repository.find({
                where: {
                    assigned_customer_care: { id: customerCareId }
                },
                relations: ['customer', 'assigned_admin', 'assigned_customer_care']
            });
            console.log(`Found ${inquiries.length} inquiries for CustomerCare ID: ${customerCareId}`);
            return inquiries;
        }
        catch (error) {
            console.error(`Error finding inquiries for CustomerCare ID ${customerCareId}:`, error);
            throw error;
        }
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
    __param(1, (0, typeorm_2.InjectRepository)(order_entity_1.Order)),
    __param(2, (0, typeorm_2.InjectRepository)(customer_care_entity_1.CustomerCare)),
    __metadata("design:paramtypes", [typeorm_1.Repository,
        typeorm_1.Repository,
        typeorm_1.Repository])
], CustomerCareInquiriesRepository);
//# sourceMappingURL=customer_cares_inquires.repository.js.map