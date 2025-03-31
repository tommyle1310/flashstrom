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
exports.MenuItemsRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const menu_item_entity_1 = require("./entities/menu_item.entity");
let MenuItemsRepository = class MenuItemsRepository {
    constructor(menuItemRepository) {
        this.menuItemRepository = menuItemRepository;
    }
    async create(data) {
        const menuItem = this.menuItemRepository.create(data);
        return this.menuItemRepository.save(menuItem);
    }
    async findById(id) {
        return this.menuItemRepository.findOne({
            where: { id },
            relations: ['variants']
        });
    }
    async findOne(conditions) {
        return this.menuItemRepository.findOne({ where: conditions });
    }
    async findAll() {
        return this.menuItemRepository.find({ relations: ['variants'] });
    }
    async update(id, data) {
        await this.menuItemRepository
            .createQueryBuilder()
            .update(menu_item_entity_1.MenuItem)
            .set(data)
            .where('id = :id', { id })
            .execute();
        return this.findById(id);
    }
    async remove(id) {
        await this.menuItemRepository.delete(id);
    }
    async save(menuItem) {
        return this.menuItemRepository.save(menuItem);
    }
};
exports.MenuItemsRepository = MenuItemsRepository;
exports.MenuItemsRepository = MenuItemsRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(menu_item_entity_1.MenuItem)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], MenuItemsRepository);
//# sourceMappingURL=menu_items.repository.js.map