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
                    await this.customerCareRepository.update(assignedCustomerCareId, {
                        active_point: () => `active_point + ${points}`,
                        active_workload: () => 'active_workload + 1',
                        is_assigned: true
                    });
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
                    : null,
                order: createDto.order_id ? { id: createDto.order_id } : null,
                escalation_history: createDto.escalation_history || [],
                rejection_history: createDto.rejection_history || [],
                transfer_history: createDto.transfer_history || [],
                escalation_count: 0,
                rejection_count: 0,
                transfer_count: 0,
                first_response_at: null,
                last_response_at: null
            };
            console.log('Final inquiryData before create:', JSON.stringify(inquiryData, null, 2));
            const inquiry = this.repository.create(inquiryData);
            const savedInquiry = await this.repository.save(inquiry);
            console.log('Saved inquiry:', JSON.stringify(savedInquiry, null, 2));
            const result = await this.repository.findOne({
                where: { id: savedInquiry.id },
                relations: [
                    'customer',
                    'assigned_admin',
                    'assigned_customer_care',
                    'order'
                ]
            });
            if (!result) {
                throw new Error('Failed to load saved inquiry');
            }
            return result;
        }
        catch (error) {
            console.error('Error in create method:', error);
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
                const customerCareId = currentInquiry.assigned_customer_care.id;
                await this.customerCareRepository.update(customerCareId, {
                    active_workload: () => 'active_workload - 1'
                });
                const customerCare = await this.customerCareRepository.findOne({
                    where: { id: customerCareId }
                });
                if (customerCare && customerCare.active_workload <= 0) {
                    await this.customerCareRepository.update(customerCareId, {
                        is_assigned: false
                    });
                }
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
                'order',
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
    async findAllInquiriesByCustomerId(customerId) {
        try {
            if (!customerId) {
                throw new Error('Customer ID is required');
            }
            console.log(`Finding inquiries for Customer ID: ${customerId}`);
            const inquiries = await this.repository.find({
                where: {
                    customer: { id: customerId }
                },
                relations: [
                    'customer',
                    'assigned_admin',
                    'assigned_customer_care',
                    'order'
                ],
                order: {
                    created_at: 'DESC'
                }
            });
            console.log(`Found ${inquiries.length} inquiries for Customer ID: ${customerId}`);
            return inquiries;
        }
        catch (error) {
            console.error(`Error finding inquiries for Customer ID ${customerId}:`, error);
            throw error;
        }
    }
    async remove(id) {
        const result = await this.repository.delete(id);
        return result.affected > 0;
    }
    async escalateInquiry(id, customerCareId, reason, escalatedTo, escalatedToId) {
        const inquiry = await this.findById(id);
        if (!inquiry) {
            throw new Error(`Inquiry with ID ${id} not found`);
        }
        const escalationRecord = {
            customer_care_id: customerCareId,
            reason,
            timestamp: Math.floor(Date.now() / 1000),
            escalated_to: escalatedTo,
            escalated_to_id: escalatedToId
        };
        await this.repository.save({
            ...inquiry,
            status: 'ESCALATE',
            escalation_history: [
                ...(inquiry.escalation_history || []),
                escalationRecord
            ],
            escalation_count: (inquiry.escalation_count || 0) + 1,
            assignee_type: escalatedTo,
            assigned_admin_id: escalatedTo === 'ADMIN' ? escalatedToId : null,
            assigned_customer_care: escalatedTo === 'CUSTOMER_CARE' ? { id: escalatedToId } : null
        });
        return this.findById(id);
    }
    async rejectInquiry(id, customerCareId, reason) {
        const inquiry = await this.findById(id);
        if (!inquiry) {
            throw new Error(`Inquiry with ID ${id} not found`);
        }
        const rejectionRecord = {
            customer_care_id: customerCareId,
            reason,
            timestamp: Math.floor(Date.now() / 1000)
        };
        await this.repository.save({
            ...inquiry,
            rejection_history: [
                ...(inquiry.rejection_history || []),
                rejectionRecord
            ],
            rejection_count: (inquiry.rejection_count || 0) + 1
        });
        return this.findById(id);
    }
    async transferInquiry(id, fromCustomerCareId, toCustomerCareId, reason) {
        const inquiry = await this.findById(id);
        if (!inquiry) {
            throw new Error(`Inquiry with ID ${id} not found`);
        }
        const transferRecord = {
            from_customer_care_id: fromCustomerCareId,
            to_customer_care_id: toCustomerCareId,
            reason,
            timestamp: Math.floor(Date.now() / 1000)
        };
        await this.repository.save({
            ...inquiry,
            transfer_history: [...(inquiry.transfer_history || []), transferRecord],
            transfer_count: (inquiry.transfer_count || 0) + 1,
            assigned_customer_care: { id: toCustomerCareId }
        });
        return this.findById(id);
    }
    async recordResponse(id) {
        const inquiry = await this.findById(id);
        if (!inquiry) {
            throw new Error(`Inquiry with ID ${id} not found`);
        }
        const now = Math.floor(Date.now() / 1000);
        let responseTime = inquiry.response_time || 0;
        if (!inquiry.first_response_at) {
            responseTime = now - inquiry.created_at;
        }
        await this.repository.save({
            ...inquiry,
            first_response_at: inquiry.first_response_at || now,
            last_response_at: now,
            response_time: responseTime
        });
        return this.findById(id);
    }
    async resolveInquiry(id, resolutionType, resolutionNotes) {
        const inquiry = await this.findById(id);
        if (!inquiry) {
            throw new Error(`Inquiry with ID ${id} not found`);
        }
        const now = Math.floor(Date.now() / 1000);
        const resolutionTime = now - inquiry.created_at;
        await this.repository.save({
            ...inquiry,
            status: 'RESOLVED',
            resolution_type: resolutionType,
            resolution_notes: resolutionNotes || inquiry.resolution_notes,
            resolved_at: now,
            resolution_time: resolutionTime
        });
        return this.findById(id);
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