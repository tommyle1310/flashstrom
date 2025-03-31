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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const createResponse_1 = require("../utils/createResponse");
const bcrypt = require("bcryptjs");
const uuid_1 = require("uuid");
const users_repository_1 = require("./users.repository");
const Payload_1 = require("../types/Payload");
let UsersService = class UsersService {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    async createUser(createUserDto) {
        try {
            const existingUser = await this.userRepository.findByEmail(createUserDto.email);
            if (existingUser) {
                return (0, createResponse_1.createResponse)('DuplicatedRecord', null, 'User already exists');
            }
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(createUserDto.password, salt);
            const savedUser = await this.userRepository.create({
                ...createUserDto,
                id: `USR_${(0, uuid_1.v4)()}`,
                password: hashedPassword,
                verification_code: null,
                user_type: createUserDto.user_type || [Payload_1.Enum_UserType.CUSTOMER]
            });
            return (0, createResponse_1.createResponse)('OK', savedUser, 'User created successfully');
        }
        catch (error) {
            console.log('error', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error creating user');
        }
    }
    async findAll() {
        try {
            const users = await this.userRepository.findAll();
            return (0, createResponse_1.createResponse)('OK', users, 'Users retrieved successfully');
        }
        catch (error) {
            console.log('error', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error fetching users');
        }
    }
    async findById(id) {
        try {
            const user = await this.userRepository.findById(id);
            if (!user) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'User not found');
            }
            return (0, createResponse_1.createResponse)('OK', user, 'User retrieved successfully');
        }
        catch (error) {
            console.log('error', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error fetching user');
        }
    }
    async findByCondition(condition) {
        try {
            const user = await this.userRepository.findOne({ where: condition });
            if (!user) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'User not found');
            }
            return (0, createResponse_1.createResponse)('OK', user, 'User retrieved successfully');
        }
        catch (error) {
            console.log('error', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error fetching user');
        }
    }
    async update(id, updateUserDto) {
        try {
            const user = await this.userRepository.findById(id);
            if (!user) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'User not found');
            }
            await this.userRepository.update(id, updateUserDto);
            const updatedUser = await this.userRepository.findById(id);
            return (0, createResponse_1.createResponse)('OK', updatedUser, 'User updated successfully');
        }
        catch (error) {
            console.log('error', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error updating user');
        }
    }
    async remove(id) {
        try {
            const result = await this.userRepository.delete(id);
            if (result.affected === 0) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'User not found');
            }
            return (0, createResponse_1.createResponse)('OK', null, 'User deleted successfully');
        }
        catch (error) {
            console.log('error', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error deleting user');
        }
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_repository_1.UserRepository])
], UsersService);
//# sourceMappingURL=users.service.js.map