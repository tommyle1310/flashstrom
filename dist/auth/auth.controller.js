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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const email_service_1 = require("../mailer/email.service");
const users_service_1 = require("../users/users.service");
const createResponse_1 = require("../utils/createResponse");
const Payload_1 = require("../types/Payload");
const create_restaurant_dto_1 = require("../restaurants/dto/create-restaurant.dto");
let AuthController = class AuthController {
    constructor(authService, emailService, usersService) {
        this.authService = authService;
        this.emailService = emailService;
        this.usersService = usersService;
    }
    async registerCustomer(userData) {
        const registrationResponse = await this.authService.register(userData, Payload_1.Enum_UserType.CUSTOMER);
        if (registrationResponse?.data?.data) {
            const code = await this.emailService.sendVerificationEmail(userData.email);
            await this.usersService.update(registrationResponse.data.data.user_id, {
                verification_code: code
            });
            return (0, createResponse_1.createResponse)('OK', null, 'Registration successful, verification email sent');
        }
        else {
            return (0, createResponse_1.createResponse)('ServerError', null, 'Something went wrong in the server');
        }
    }
    async registerDriver(userData) {
        const registrationResponse = await this.authService.register(userData, Payload_1.Enum_UserType.DRIVER);
        if (registrationResponse?.data?.data) {
            const code = await this.emailService.sendVerificationEmail(userData.email);
            await this.usersService.update(registrationResponse.data.data.user_id, {
                verification_code: code
            });
            return (0, createResponse_1.createResponse)('OK', null, 'Registration successful, verification email sent');
        }
        else {
            return (0, createResponse_1.createResponse)('ServerError', null, 'Something went wrong in the server');
        }
    }
    async registerRestaurant(userData) {
        const fullUserData = {
            ...userData,
            email: userData.contact_email[0].email,
            phone: userData.contact_phone[0].number
        };
        const registrationResponse = await this.authService.register(userData, Payload_1.Enum_UserType.RESTAURANT_OWNER);
        if (registrationResponse?.data?.data) {
            const code = await this.emailService.sendVerificationEmail(fullUserData.email);
            await this.usersService.update(registrationResponse.data.data.user_id ??
                registrationResponse.data.data.owner_id, { verification_code: code });
            return (0, createResponse_1.createResponse)('OK', null, 'Registration successful, verification email sent');
        }
        else {
            return (0, createResponse_1.createResponse)('ServerError', null, 'Something went wrong in the server');
        }
    }
    async registerFWallet(userData) {
        const registrationResponse = await this.authService.register(userData, Payload_1.Enum_UserType.F_WALLET);
        console.log('check res', registrationResponse);
        if (registrationResponse?.data?.data) {
            const code = await this.emailService.sendVerificationEmail(userData.email);
            await this.usersService.update(registrationResponse.data.data.user_id, {
                verification_code: code
            });
            return (0, createResponse_1.createResponse)('OK', null, 'Registration successful, verification email sent');
        }
        else {
            return (0, createResponse_1.createResponse)('ServerError', null, 'Something went wrong in the server');
        }
    }
    async registerCustomerCare(userData) {
        const registrationResponse = await this.authService.register(userData, Payload_1.Enum_UserType.CUSTOMER_CARE_REPRESENTATIVE);
        if (registrationResponse?.data?.data) {
            const code = await this.emailService.sendVerificationEmail(userData.email);
            await this.usersService.update(registrationResponse.data.data.user_id, {
                verification_code: code
            });
            return (0, createResponse_1.createResponse)('OK', null, 'Registration successful, verification email sent');
        }
        else {
            return (0, createResponse_1.createResponse)('ServerError', null, 'Something went wrong in the server');
        }
    }
    async loginCustomer(credentials) {
        return this.authService.login(credentials, Payload_1.Enum_UserType.CUSTOMER);
    }
    async loginDriver(credentials) {
        return this.authService.login(credentials, Payload_1.Enum_UserType.DRIVER);
    }
    async loginFWallet(credentials) {
        return this.authService.login(credentials, Payload_1.Enum_UserType.F_WALLET);
    }
    async loginRestaurant(credentials) {
        return this.authService.login(credentials, Payload_1.Enum_UserType.RESTAURANT_OWNER);
    }
    async loginCustomerCare(credentials) {
        console.log('fall here contorller', {
            credentials
        });
        return this.authService.login(credentials, Payload_1.Enum_UserType.CUSTOMER_CARE_REPRESENTATIVE);
    }
    async verifyEmail({ email, code }) {
        try {
            if (!email || !code) {
                return (0, createResponse_1.createResponse)('InvalidFormatInput', null, 'You must provide a valid email and a verification code');
            }
            const result = await this.emailService.verifyEmail(email, code);
            return result;
        }
        catch (error) {
            console.error('Error during email verification:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'An error occurred during verification, please try again.');
        }
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('register-customer'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "registerCustomer", null);
__decorate([
    (0, common_1.Post)('register-driver'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "registerDriver", null);
__decorate([
    (0, common_1.Post)('register-restaurant'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_restaurant_dto_1.CreateRestaurantSignup]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "registerRestaurant", null);
__decorate([
    (0, common_1.Post)('register-fwallet'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "registerFWallet", null);
__decorate([
    (0, common_1.Post)('register-customer-care'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "registerCustomerCare", null);
__decorate([
    (0, common_1.Post)('login-customer'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "loginCustomer", null);
__decorate([
    (0, common_1.Post)('login-driver'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "loginDriver", null);
__decorate([
    (0, common_1.Post)('login-fwallet'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "loginFWallet", null);
__decorate([
    (0, common_1.Post)('login-restaurant'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "loginRestaurant", null);
__decorate([
    (0, common_1.Post)('login-customer-care'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "loginCustomerCare", null);
__decorate([
    (0, common_1.Post)('verify-email'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyEmail", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        email_service_1.EmailService,
        users_service_1.UsersService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map