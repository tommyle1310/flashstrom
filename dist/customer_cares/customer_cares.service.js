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
exports.CustomerCareService = void 0;
const common_1 = require("@nestjs/common");
const createResponse_1 = require("../utils/createResponse");
const customer_cares_repository_1 = require("./customer_cares.repository");
let CustomerCareService = class CustomerCareService {
    constructor(repository) {
        this.repository = repository;
    }
    async create(createCustomerCareDto) {
        const { user_id, first_name, last_name, contact_email, contact_phone, created_at, updated_at, avatar, last_login } = createCustomerCareDto;
        try {
            const existingRecord = await this.repository.findOne({ user_id });
            if (existingRecord) {
                return (0, createResponse_1.createResponse)('DuplicatedRecord', null, 'Customer care record with this user ID already exists');
            }
            const newRecord = await this.repository.create({
                user_id,
                first_name,
                last_name,
                contact_email,
                contact_phone,
                created_at,
                updated_at,
                avatar,
                last_login
            });
            await this.repository.create(newRecord);
            return (0, createResponse_1.createResponse)('OK', newRecord, 'Customer care record created successfully');
        }
        catch (error) {
            console.log('error', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'An error occurred while creating the customer care record');
        }
    }
    async findAll() {
        try {
            const records = await this.repository.findAll();
            return (0, createResponse_1.createResponse)('OK', records, 'Fetched all customer care records');
        }
        catch (error) {
            console.log('error', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'An error occurred while fetching customer care records');
        }
    }
    async findCustomerCareById(id) {
        try {
            const record = await this.repository.findById(id);
            if (!record) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Customer care record not found');
            }
            return (0, createResponse_1.createResponse)('OK', record, 'Fetched customer care record successfully');
        }
        catch (error) {
            console.log('error', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'An error occurred while fetching the customer care record');
        }
    }
    async findOne(conditions) {
        const record = await this.repository.findOne(conditions);
        if (!record) {
            return (0, createResponse_1.createResponse)('NotFound', null, 'Customer care record not found');
        }
        try {
            return (0, createResponse_1.createResponse)('OK', record, 'Fetched customer care record successfully');
        }
        catch (error) {
            console.log('error', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'An error occurred while fetching the customer care record');
        }
    }
    async update(id, updateCustomerCareDto) {
        const { contact_phone, contact_email, first_name, last_name } = updateCustomerCareDto;
        const updatedRecord = await this.repository.findById(id);
        if (!updatedRecord) {
            return (0, createResponse_1.createResponse)('NotFound', null, 'Customer care record not found');
        }
        if (contact_phone && contact_phone.length > 0) {
            for (const newPhone of contact_phone) {
                const existingPhoneIndex = updatedRecord.contact_phone.findIndex(phone => phone.number === newPhone.number);
                if (existingPhoneIndex !== -1) {
                    updatedRecord.contact_phone[existingPhoneIndex] = newPhone;
                }
                else {
                    updatedRecord.contact_phone.push(newPhone);
                }
            }
        }
        if (contact_email && contact_email.length > 0) {
            for (const newEmail of contact_email) {
                const existingEmailIndex = updatedRecord.contact_email.findIndex(email => email.email === newEmail.email);
                if (existingEmailIndex !== -1) {
                    updatedRecord.contact_email[existingEmailIndex] = newEmail;
                }
                else {
                    updatedRecord.contact_email.push(newEmail);
                }
            }
        }
        const finalUpdatedRecord = await this.repository.update(id, {
            contact_phone: updatedRecord.contact_phone,
            contact_email: updatedRecord.contact_email,
            first_name,
            last_name
        });
        return (0, createResponse_1.createResponse)('OK', finalUpdatedRecord, 'Customer care record updated successfully');
    }
    async setAvailability(id) {
        try {
            const record = await this.repository.findById(id);
            if (!record) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Customer care record not found');
            }
            record.available_for_work = !record.available_for_work;
            const savedRecord = await this.repository.update(id, record);
            return (0, createResponse_1.createResponse)('OK', savedRecord, 'Customer care record updated successfully');
        }
        catch (error) {
            console.log('error', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'An error occurred while updating the customer care record');
        }
    }
    async remove(id) {
        try {
            const deletedRecord = await this.repository.remove(id);
            if (!deletedRecord) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Customer care record not found');
            }
            return (0, createResponse_1.createResponse)('OK', null, 'Customer care record deleted successfully');
        }
        catch (error) {
            console.log('error', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'An error occurred while deleting the customer care record');
        }
    }
    async updateEntityAvatar(uploadResult, entityId) {
        const record = await this.repository.update(entityId, {
            avatar: { url: uploadResult.url, key: uploadResult.public_id }
        });
        if (!record) {
            return (0, createResponse_1.createResponse)('NotFound', null, 'Customer care record not found');
        }
        return (0, createResponse_1.createResponse)('OK', record, 'Customer care avatar updated successfully');
    }
};
exports.CustomerCareService = CustomerCareService;
exports.CustomerCareService = CustomerCareService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [customer_cares_repository_1.CustomerCaresRepository])
], CustomerCareService);
//# sourceMappingURL=customer_cares.service.js.map