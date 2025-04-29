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
exports.CustomerCareInquiriesService = void 0;
const common_1 = require("@nestjs/common");
const customer_cares_inquires_repository_1 = require("./customer_cares_inquires.repository");
const createResponse_1 = require("../utils/createResponse");
let CustomerCareInquiriesService = class CustomerCareInquiriesService {
    constructor(repository) {
        this.repository = repository;
    }
    async create(createDto) {
        try {
            const inquiry = await this.repository.create(createDto);
            return (0, createResponse_1.createResponse)('OK', inquiry, 'Inquiry created successfully');
        }
        catch (error) {
            console.error('Error creating inquiry:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Failed to create inquiry');
        }
    }
    async findAll() {
        try {
            const inquiries = await this.repository.findAll();
            return (0, createResponse_1.createResponse)('OK', inquiries, 'Inquiries fetched successfully');
        }
        catch (error) {
            console.error('Error fetching inquiries:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Failed to fetch inquiries');
        }
    }
    async findById(id) {
        try {
            const inquiry = await this.repository.findById(id);
            if (!inquiry) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Inquiry not found');
            }
            return (0, createResponse_1.createResponse)('OK', inquiry, 'Inquiry fetched successfully');
        }
        catch (error) {
            console.error('Error fetching inquiry:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Failed to fetch inquiry');
        }
    }
    async findAllInquiriesByCCId(id) {
        try {
            const inquiry = await this.repository.findAllInquiriesByCCId(id);
            if (!inquiry) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Inquiry not found');
            }
            return (0, createResponse_1.createResponse)('OK', inquiry, 'Inquiry fetched successfully');
        }
        catch (error) {
            console.error('Error fetching inquiry:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Failed to fetch inquiry');
        }
    }
    async update(id, updateDto) {
        try {
            const inquiry = await this.repository.findById(id);
            if (!inquiry) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Inquiry not found');
            }
            const updated = await this.repository.update(id, updateDto);
            return (0, createResponse_1.createResponse)('OK', updated, 'Inquiry updated successfully');
        }
        catch (error) {
            console.error('Error updating inquiry:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Failed to update inquiry');
        }
    }
    async remove(id) {
        try {
            const deleted = await this.repository.remove(id);
            if (!deleted) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Inquiry not found');
            }
            return (0, createResponse_1.createResponse)('OK', null, 'Inquiry deleted successfully');
        }
        catch (error) {
            console.error('Error deleting inquiry:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Failed to delete inquiry');
        }
    }
    async escalateInquiry(id, customerCareId, reason, escalatedTo, escalatedToId) {
        try {
            const inquiry = await this.repository.escalateInquiry(id, customerCareId, reason, escalatedTo, escalatedToId);
            return (0, createResponse_1.createResponse)('OK', inquiry, 'Inquiry escalated successfully');
        }
        catch (error) {
            console.error('Error escalating inquiry:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Failed to escalate inquiry');
        }
    }
    async rejectInquiry(id, customerCareId, reason) {
        try {
            const inquiry = await this.repository.rejectInquiry(id, customerCareId, reason);
            return (0, createResponse_1.createResponse)('OK', inquiry, 'Inquiry rejected successfully');
        }
        catch (error) {
            console.error('Error rejecting inquiry:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Failed to reject inquiry');
        }
    }
    async transferInquiry(id, fromCustomerCareId, toCustomerCareId, reason) {
        try {
            const inquiry = await this.repository.transferInquiry(id, fromCustomerCareId, toCustomerCareId, reason);
            return (0, createResponse_1.createResponse)('OK', inquiry, 'Inquiry transferred successfully');
        }
        catch (error) {
            console.error('Error transferring inquiry:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Failed to transfer inquiry');
        }
    }
    async recordResponse(id) {
        try {
            const inquiry = await this.repository.recordResponse(id);
            return (0, createResponse_1.createResponse)('OK', inquiry, 'Response recorded successfully');
        }
        catch (error) {
            console.error('Error recording response:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Failed to record response');
        }
    }
    async resolveInquiry(id, resolutionType, resolutionNotes) {
        try {
            const inquiry = await this.repository.resolveInquiry(id, resolutionType, resolutionNotes);
            return (0, createResponse_1.createResponse)('OK', inquiry, 'Inquiry resolved successfully');
        }
        catch (error) {
            console.error('Error resolving inquiry:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Failed to resolve inquiry');
        }
    }
};
exports.CustomerCareInquiriesService = CustomerCareInquiriesService;
exports.CustomerCareInquiriesService = CustomerCareInquiriesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [customer_cares_inquires_repository_1.CustomerCareInquiriesRepository])
], CustomerCareInquiriesService);
//# sourceMappingURL=customer_cares_inquires.service.js.map