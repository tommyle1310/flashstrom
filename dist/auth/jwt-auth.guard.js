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
exports.JwtAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const core_1 = require("@nestjs/core");
const auth_service_1 = require("./auth.service");
let JwtAuthGuard = class JwtAuthGuard {
    constructor(jwtService, reflector, authService) {
        this.jwtService = jwtService;
        this.reflector = reflector;
        this.authService = authService;
    }
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const authorization = request.headers['authorization'];
        if (!authorization) {
            return false;
        }
        const token = authorization.split(' ')[1];
        if (!token) {
            return false;
        }
        try {
            const payload = this.jwtService.verify(token);
            request.user = payload;
            return true;
        }
        catch (error) {
            console.log('error', error);
            return false;
        }
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        core_1.Reflector,
        auth_service_1.AuthService])
], JwtAuthGuard);
//# sourceMappingURL=jwt-auth.guard.js.map