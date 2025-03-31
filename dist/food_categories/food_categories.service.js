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
exports.FoodCategoriesService = void 0;
const common_1 = require("@nestjs/common");
const food_categories_repository_1 = require("./food_categories.repository");
const createResponse_1 = require("../utils/createResponse");
let FoodCategoriesService = class FoodCategoriesService {
    constructor(foodCategoriesRepository) {
        this.foodCategoriesRepository = foodCategoriesRepository;
    }
    async create(createFoodCategoryDto) {
        try {
            const existingCategory = await this.foodCategoriesRepository.findByName(createFoodCategoryDto.name);
            if (existingCategory) {
                return (0, createResponse_1.createResponse)('DuplicatedRecord', null, 'Food category with this name already exists');
            }
            const newCategory = await this.foodCategoriesRepository.create(createFoodCategoryDto);
            return (0, createResponse_1.createResponse)('OK', newCategory, 'Food category created successfully');
        }
        catch (error) {
            console.error('Error creating food category:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error creating food category');
        }
    }
    async findAll() {
        try {
            const categories = await this.foodCategoriesRepository.findAll();
            return (0, createResponse_1.createResponse)('OK', categories, 'Fetched all food categories');
        }
        catch (error) {
            console.error('Error fetching food categories:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error fetching food categories');
        }
    }
    async findOne(id) {
        try {
            const category = await this.foodCategoriesRepository.findById(id);
            if (!category) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Food category not found');
            }
            return (0, createResponse_1.createResponse)('OK', category, 'Food category retrieved successfully');
        }
        catch (error) {
            console.error('Error fetching food category:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error fetching food category');
        }
    }
    async update(id, updateFoodCategoryDto) {
        try {
            const category = await this.foodCategoriesRepository.findById(id);
            if (!category) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Food category not found');
            }
            const updatedCategory = await this.foodCategoriesRepository.update(id, updateFoodCategoryDto);
            return (0, createResponse_1.createResponse)('OK', updatedCategory, 'Food category updated successfully');
        }
        catch (error) {
            console.error('Error updating food category:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error updating food category');
        }
    }
    async remove(id) {
        try {
            const result = await this.foodCategoriesRepository.delete(id);
            if (!result) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Food category not found');
            }
            return (0, createResponse_1.createResponse)('OK', null, 'Food category deleted successfully');
        }
        catch (error) {
            console.error('Error deleting food category:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error deleting food category');
        }
    }
};
exports.FoodCategoriesService = FoodCategoriesService;
exports.FoodCategoriesService = FoodCategoriesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [food_categories_repository_1.FoodCategoriesRepository])
], FoodCategoriesService);
//# sourceMappingURL=food_categories.service.js.map