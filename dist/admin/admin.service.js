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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const createResponse_1 = require("../utils/createResponse");
const uuid_1 = require("uuid");
const admin_repository_1 = require("./admin.repository");
const users_service_1 = require("../users/users.service");
const admin_1 = require("../utils/types/admin");
let AdminService = class AdminService {
    constructor(adminRepository, usersService) {
        this.adminRepository = adminRepository;
        this.usersService = usersService;
    }
    async create(createAdminDto) {
        try {
            const { user_id, role, permissions } = createAdminDto;
            const allowedPermissions = admin_1.RolePermissions[role];
            const hasInvalidPermissions = permissions.some(permission => !allowedPermissions.includes(permission));
            if (hasInvalidPermissions) {
                return (0, createResponse_1.createResponse)('Forbidden', null, 'Invalid permissions for the given role');
            }
            const userResponse = await this.usersService.findByCondition({
                id: user_id
            });
            if (userResponse.EC === -2) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'User not found');
            }
            const existingAdmin = await this.adminRepository.findByUserId(user_id);
            if (existingAdmin) {
                return (0, createResponse_1.createResponse)('DuplicatedRecord', null, 'Admin already exists for this user');
            }
            const user = { id: user_id };
            const savedAdmin = await this.adminRepository.create({
                ...createAdminDto,
                id: `FF_ADMIN_${(0, uuid_1.v4)()}`,
                user_id: user
            });
            return (0, createResponse_1.createResponse)('OK', savedAdmin, 'Admin created successfully');
        }
        catch (error) {
            console.log('error', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error creating admin');
        }
    }
    async findAll() {
        try {
            const admins = await this.adminRepository.findAll();
            return (0, createResponse_1.createResponse)('OK', admins, 'Admins retrieved successfully');
        }
        catch (error) {
            console.log('error', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error fetching admins');
        }
    }
    async findOne(id) {
        try {
            const admin = await this.adminRepository.findById(id);
            if (!admin) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Admin not found');
            }
            return (0, createResponse_1.createResponse)('OK', admin, 'Admin retrieved successfully');
        }
        catch (error) {
            console.log('error', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error fetching admin');
        }
    }
    async update(id, updateAdminDto) {
        try {
            const admin = await this.adminRepository.findById(id);
            if (!admin) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Admin not found');
            }
            if (updateAdminDto.role || updateAdminDto.permissions) {
                const role = updateAdminDto.role || admin.role;
                const newPermissions = updateAdminDto.permissions || admin.permissions;
                const allowedPermissions = admin_1.RolePermissions[role];
                const hasInvalidPermissions = newPermissions.some(permission => !allowedPermissions.includes(permission));
                if (hasInvalidPermissions) {
                    return (0, createResponse_1.createResponse)('Forbidden', null, 'Invalid permissions for the given role');
                }
            }
            await this.adminRepository.update(id, updateAdminDto);
            const updatedAdmin = await this.adminRepository.findById(id);
            return (0, createResponse_1.createResponse)('OK', updatedAdmin, 'Admin updated successfully');
        }
        catch (error) {
            console.log('error', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error updating admin');
        }
    }
    async remove(id) {
        try {
            const result = await this.adminRepository.delete(id);
            if (result.affected === 0) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Admin not found');
            }
            return (0, createResponse_1.createResponse)('OK', null, 'Admin deleted successfully');
        }
        catch (error) {
            console.log('error', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error deleting admin');
        }
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [admin_repository_1.AdminRepository,
        users_service_1.UsersService])
], AdminService);
//# sourceMappingURL=admin.service.js.map