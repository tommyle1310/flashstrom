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
exports.MenuItemVariantsRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const menu_item_variant_entity_1 = require("./entities/menu_item_variant.entity");
let MenuItemVariantsRepository = class MenuItemVariantsRepository {
    constructor(menuItemVariantRepository) {
        this.menuItemVariantRepository = menuItemVariantRepository;
    }
    async create(data) {
        const variant = this.menuItemVariantRepository.create(data);
        return this.menuItemVariantRepository.save(variant);
    }
    async findById(id) {
        return this.menuItemVariantRepository.findOne({
            where: { id },
            relations: ['menu_item']
        });
    }
    async findByDetails(price, description, menu_id) {
        return this.menuItemVariantRepository.findOne({
            where: { price, description, menu_id }
        });
    }
    async findAll(conditions) {
        return this.menuItemVariantRepository.find({
            where: conditions,
            relations: ['menu_item']
        });
    }
    async update(id, data) {
        await this.menuItemVariantRepository.update(id, {
            ...data,
            updated_at: Math.floor(Date.now() / 1000)
        });
        return this.findById(id);
    }
    async remove(id) {
        await this.menuItemVariantRepository.delete(id);
    }
};
exports.MenuItemVariantsRepository = MenuItemVariantsRepository;
exports.MenuItemVariantsRepository = MenuItemVariantsRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(menu_item_variant_entity_1.MenuItemVariant)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], MenuItemVariantsRepository);
//# sourceMappingURL=menu_item_variants.repository.js.map