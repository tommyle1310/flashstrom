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
exports.RestaurantsRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const typeorm_2 = require("@nestjs/typeorm");
const restaurant_entity_1 = require("./entities/restaurant.entity");
const food_category_entity_1 = require("../food_categories/entities/food_category.entity");
const createResponse_1 = require("../utils/createResponse");
const users_repository_1 = require("../users/users.repository");
const address_book_repository_1 = require("../address_book/address_book.repository");
const promotion_entity_1 = require("../promotions/entities/promotion.entity");
let RestaurantsRepository = class RestaurantsRepository {
    constructor(repository, foodCategoryRepository, userRepository, addressRepository) {
        this.repository = repository;
        this.foodCategoryRepository = foodCategoryRepository;
        this.userRepository = userRepository;
        this.addressRepository = addressRepository;
    }
    async create(createDto) {
        const owner = await this.userRepository.findById(createDto.owner_id);
        if (!owner)
            return (0, createResponse_1.createResponse)('NotFound', null, 'Owner not found');
        const address = await this.addressRepository.findById(createDto.address_id);
        if (!address)
            return (0, createResponse_1.createResponse)('NotFound', null, 'Address not found');
        const specialize_in = createDto.specialize_in || [];
        const promotions = createDto.promotions && createDto.promotions.length > 0
            ? await this.repository.manager
                .getRepository(promotion_entity_1.Promotion)
                .findByIds(createDto.promotions)
            : [];
        const restaurantData = {
            owner_id: createDto.owner_id,
            owner_name: createDto.owner_name,
            address_id: createDto.address_id,
            restaurant_name: createDto.restaurant_name,
            description: createDto.description,
            contact_email: createDto.contact_email,
            contact_phone: createDto.contact_phone,
            avatar: createDto.avatar,
            images_gallery: createDto.images_gallery || [],
            status: createDto.status,
            promotions,
            ratings: createDto.ratings,
            opening_hours: createDto.opening_hours,
            specialize_in,
            created_at: Math.floor(Date.now() / 1000),
            updated_at: Math.floor(Date.now() / 1000)
        };
        const restaurant = this.repository.create(restaurantData);
        const savedRestaurant = await this.repository.save(restaurant, {
            reload: true
        });
        return savedRestaurant;
    }
    async findAll() {
        return await this.repository.find({
            relations: ['owner', 'address', 'specialize_in']
        });
    }
    async findById(id) {
        return await this.repository.findOne({
            where: { id },
            relations: ['owner', 'address', 'specialize_in', 'promotions']
        });
    }
    async findByOwnerId(ownerId) {
        return await this.repository.findOne({
            where: { owner_id: ownerId },
            relations: ['owner', 'address', 'specialize_in', 'promotions']
        });
    }
    async update(id, updateDto) {
        const specialize_in = updateDto.specialize_in;
        const promotions = updateDto.promotions && updateDto.promotions.length > 0
            ? await this.repository.manager
                .getRepository(promotion_entity_1.Promotion)
                .findByIds(updateDto.promotions)
            : undefined;
        const updateData = {
            ...updateDto,
            promotions,
            updated_at: Math.floor(Date.now() / 1000)
        };
        delete updateData.address;
        delete updateData.owner;
        delete updateData.specialize_in;
        if (updateData.images_gallery === undefined)
            delete updateData.images_gallery;
        if (updateData.promotions === undefined)
            delete updateData.promotions;
        await this.repository.update(id, updateData);
        const updatedRestaurant = await this.findById(id);
        if (specialize_in && specialize_in.length > 0) {
            updatedRestaurant.specialize_in = specialize_in;
            await this.repository.save(updatedRestaurant);
        }
        return updatedRestaurant;
    }
    async delete(id) {
        const result = await this.repository.delete(id);
        return result.affected > 0;
    }
    async findByCondition(condition) {
        return await this.repository.findOne({
            where: condition,
            relations: ['owner', 'address', 'specialize_in']
        });
    }
    async updateImgGallery(id, imagesGallery) {
        const restaurant = await this.findById(id);
        if (!restaurant) {
            throw new Error('Restaurant not found');
        }
        const updatedImagesGallery = [
            ...(Array.isArray(restaurant.images_gallery)
                ? restaurant.images_gallery
                : []),
            ...imagesGallery
        ];
        await this.repository.update(id, {
            images_gallery: updatedImagesGallery,
            updated_at: Math.floor(Date.now() / 1000)
        });
        return await this.findById(id);
    }
    async incrementTotalOrders(restaurantId) {
        const restaurant = await this.repository.findOne({
            where: { id: restaurantId }
        });
        if (!restaurant) {
            throw new Error(`Restaurant with ID ${restaurantId} not found`);
        }
        await this.repository.update(restaurantId, {
            total_orders: restaurant.total_orders + 1,
            updated_at: Math.floor(Date.now() / 1000)
        });
    }
};
exports.RestaurantsRepository = RestaurantsRepository;
exports.RestaurantsRepository = RestaurantsRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_2.InjectRepository)(restaurant_entity_1.Restaurant)),
    __param(1, (0, typeorm_2.InjectRepository)(food_category_entity_1.FoodCategory)),
    __metadata("design:paramtypes", [typeorm_1.Repository,
        typeorm_1.Repository,
        users_repository_1.UserRepository,
        address_book_repository_1.AddressBookRepository])
], RestaurantsRepository);
//# sourceMappingURL=restaurants.repository.js.map