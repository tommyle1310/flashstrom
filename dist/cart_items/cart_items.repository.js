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
exports.CartItemsRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const typeorm_2 = require("@nestjs/typeorm");
const cart_item_entity_1 = require("./entities/cart_item.entity");
let CartItemsRepository = class CartItemsRepository {
    constructor(repository) {
        this.repository = repository;
    }
    async create(createDto) {
        const cartItem = this.repository.create(createDto);
        return await this.repository.save(cartItem);
    }
    async findAll(query = {}) {
        return await this.repository.find({ where: query });
    }
    async findById(id) {
        return await this.repository.findOne({ where: { id } });
    }
    async findOne(query) {
        return await this.repository.findOne({ where: query });
    }
    async update(id, updateDto) {
        await this.repository.update(id, {
            ...updateDto,
            updated_at: Math.floor(Date.now() / 1000)
        });
        return await this.findById(id);
    }
    async remove(id) {
        const result = await this.repository.delete(id);
        return result.affected > 0;
    }
};
exports.CartItemsRepository = CartItemsRepository;
exports.CartItemsRepository = CartItemsRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_2.InjectRepository)(cart_item_entity_1.CartItem)),
    __metadata("design:paramtypes", [typeorm_1.Repository])
], CartItemsRepository);
//# sourceMappingURL=cart_items.repository.js.map