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
exports.AdminRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const admin_entity_1 = require("./entities/admin.entity");
let AdminRepository = class AdminRepository {
    constructor(adminRepository) {
        this.adminRepository = adminRepository;
    }
    async create(adminData) {
        const newAdmin = this.adminRepository.create(adminData);
        return this.adminRepository.save(newAdmin);
    }
    async findAll() {
        return this.adminRepository.find();
    }
    async findById(id) {
        return this.adminRepository.findOne({
            where: { id },
            relations: ['user_id']
        });
    }
    async findByUserId(userId) {
        try {
            return this.adminRepository.findOne({
                where: {
                    user_id: { id: userId }
                },
                relations: ['user_id']
            });
        }
        catch (error) {
            console.error('Error in findByUserId:', error);
            return this.adminRepository
                .createQueryBuilder('admin')
                .leftJoinAndSelect('admin.user_id', 'user')
                .where('user.id = :userId', { userId })
                .getOne();
        }
    }
    async update(id, updateData) {
        const { user_id, ...rest } = updateData;
        const updateEntity = { ...rest };
        if (user_id) {
            updateEntity.user_id = { id: user_id };
        }
        await this.adminRepository.update(id, updateEntity);
        return await this.adminRepository.findOne({
            where: { id },
            relations: ['user_id']
        });
    }
    async delete(id) {
        return this.adminRepository.delete(id);
    }
};
exports.AdminRepository = AdminRepository;
exports.AdminRepository = AdminRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(admin_entity_1.Admin)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], AdminRepository);
//# sourceMappingURL=admin.repository.js.map