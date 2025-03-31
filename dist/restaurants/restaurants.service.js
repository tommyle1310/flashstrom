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
exports.RestaurantsService = void 0;
const common_1 = require("@nestjs/common");
const createResponse_1 = require("../utils/createResponse");
const menu_items_service_1 = require("../menu_items/menu_items.service");
const menu_item_variants_service_1 = require("../menu_item_variants/menu_item_variants.service");
const users_repository_1 = require("../users/users.repository");
const promotions_repository_1 = require("../promotions/promotions.repository");
const address_book_repository_1 = require("../address_book/address_book.repository");
const restaurants_repository_1 = require("./restaurants.repository");
const orders_repository_1 = require("../orders/orders.repository");
const restaurants_gateway_1 = require("./restaurants.gateway");
const order_entity_1 = require("../orders/entities/order.entity");
const food_categories_repository_1 = require("../food_categories/food_categories.repository");
const fwallets_repository_1 = require("../fwallets/fwallets.repository");
const transactions_service_1 = require("../transactions/transactions.service");
const constants_1 = require("../utils/constants");
let RestaurantsService = class RestaurantsService {
    constructor(restaurantsRepository, userRepository, promotionRepository, addressRepository, ordersRepository, menuItemsService, menuItemVariantsService, transactionsService, restaurantsGateway, foodCategoryRepository, fWalletsRepository) {
        this.restaurantsRepository = restaurantsRepository;
        this.userRepository = userRepository;
        this.promotionRepository = promotionRepository;
        this.addressRepository = addressRepository;
        this.ordersRepository = ordersRepository;
        this.menuItemsService = menuItemsService;
        this.menuItemVariantsService = menuItemVariantsService;
        this.transactionsService = transactionsService;
        this.restaurantsGateway = restaurantsGateway;
        this.foodCategoryRepository = foodCategoryRepository;
        this.fWalletsRepository = fWalletsRepository;
    }
    async create(createRestaurantDto) {
        try {
            const { owner_id, promotions, address_id, contact_email, contact_phone, opening_hours, owner_name, restaurant_name, status, images_gallery, food_category_ids } = createRestaurantDto;
            if (!owner_id ||
                !address_id ||
                !contact_email ||
                !contact_phone ||
                !opening_hours ||
                !owner_name ||
                !restaurant_name ||
                !status) {
                return (0, createResponse_1.createResponse)('MissingInput', null, 'Missing required fields: owner_id, address_id, contact_email, contact_phone, opening_hours, owner_name, restaurant_name, status');
            }
            const owner = await this.userRepository.findById(owner_id);
            if (!owner)
                return (0, createResponse_1.createResponse)('NotFound', null, 'Owner not found');
            const addressBookEntry = await this.addressRepository.findById(address_id);
            if (!addressBookEntry)
                return (0, createResponse_1.createResponse)('NotFound', null, 'Address not found in address book');
            if (promotions && promotions.length > 0) {
                const foundPromotions = await this.promotionRepository.findByIds(promotions);
                if (foundPromotions.length !== promotions.length)
                    return (0, createResponse_1.createResponse)('NotFound', null, 'One or more promotions not found');
            }
            let specializeIn = [];
            if (food_category_ids && food_category_ids.length > 0) {
                const foundCategories = await this.foodCategoryRepository.findByIds(food_category_ids);
                if (foundCategories.length !== food_category_ids.length)
                    return (0, createResponse_1.createResponse)('NotFound', null, 'One or more food categories not found');
                specializeIn = foundCategories;
            }
            const restaurantDto = {
                owner_id,
                promotions: promotions || [],
                address_id,
                contact_email,
                contact_phone,
                opening_hours,
                owner_name,
                restaurant_name,
                status,
                images_gallery: images_gallery || [],
                specialize_in: specializeIn
            };
            const savedRestaurant = await this.restaurantsRepository.create(restaurantDto);
            return (0, createResponse_1.createResponse)('OK', savedRestaurant, 'Restaurant created successfully');
        }
        catch (error) {
            console.error('Error creating restaurant:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error creating restaurant');
        }
    }
    async update(id, updateRestaurantDto) {
        try {
            const { owner_id, promotions, address_id, food_category_ids } = updateRestaurantDto;
            const existingRestaurant = await this.restaurantsRepository.findById(id);
            if (!existingRestaurant)
                return (0, createResponse_1.createResponse)('NotFound', null, 'Restaurant not found');
            if (owner_id) {
                const owner = await this.userRepository.findById(owner_id);
                if (!owner)
                    return (0, createResponse_1.createResponse)('NotFound', null, 'Owner not found');
            }
            if (address_id) {
                const addressBookEntry = await this.addressRepository.findById(address_id);
                if (!addressBookEntry)
                    return (0, createResponse_1.createResponse)('NotFound', null, 'Address not found in address book');
            }
            if (promotions && promotions.length > 0) {
                const foundPromotions = await this.promotionRepository.findByIds(promotions);
                if (foundPromotions.length !== promotions.length)
                    return (0, createResponse_1.createResponse)('NotFound', null, 'One or more promotions not found');
            }
            let specializeIn = [];
            if (food_category_ids && food_category_ids.length > 0) {
                specializeIn =
                    await this.foodCategoryRepository.findByIds(food_category_ids);
                if (specializeIn.length !== food_category_ids.length)
                    return (0, createResponse_1.createResponse)('NotFound', null, 'One or more food categories not found');
            }
            const updatedDto = {
                ...updateRestaurantDto,
                specialize_in: specializeIn.length > 0 ? specializeIn : undefined
            };
            const updatedRestaurant = await this.restaurantsRepository.update(id, updatedDto);
            return (0, createResponse_1.createResponse)('OK', updatedRestaurant, 'Restaurant updated successfully');
        }
        catch (error) {
            console.error('Error updating restaurant:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error updating restaurant');
        }
    }
    async updateEntityAvatar(uploadResult, entityId) {
        const restaurant = await this.restaurantsRepository.update(entityId, {
            avatar: { url: uploadResult.url, key: uploadResult.public_id }
        });
        if (!restaurant) {
            return (0, createResponse_1.createResponse)('NotFound', null, 'Restaurant not found');
        }
        return (0, createResponse_1.createResponse)('OK', restaurant, 'Restaurant avatar updated successfully');
    }
    async createMenuItemForRestaurant(restaurantId, createMenuItemDto) {
        return this.menuItemsService.create({
            ...createMenuItemDto,
            restaurant_id: restaurantId
        });
    }
    async updateMenuItemForRestaurant(restaurantId, menuItemId, updateMenuItemDto) {
        const menuItem = await this.menuItemsService.findOne(menuItemId);
        if (menuItem.data.menuItem.restaurant_id !== restaurantId) {
            return (0, createResponse_1.createResponse)('Forbidden', null, 'Menu Item does not belong to this restaurant');
        }
        return this.menuItemsService.update(menuItemId, {
            ...updateMenuItemDto,
            restaurant_id: restaurantId
        });
    }
    async deleteMenuItemForRestaurant(restaurantId, menuItemId) {
        const menuItem = await this.menuItemsService.findOne(menuItemId);
        if (menuItem.data.restaurant_id !== restaurantId) {
            return (0, createResponse_1.createResponse)('Forbidden', null, 'Menu Item does not belong to this restaurant');
        }
        return this.menuItemsService.remove(menuItemId);
    }
    async getMenuItemsForRestaurant(restaurantId) {
        const allMenuItems = await this.menuItemsService.findAll();
        const restaurantMenuItems = allMenuItems.data.filter(item => item.restaurant_id.toString() === restaurantId);
        return (0, createResponse_1.createResponse)('OK', restaurantMenuItems, 'Fetched menu items for the restaurant');
    }
    async createMenuItemVariantForRestaurant(menuId, createMenuItemVariantDto) {
        return this.menuItemVariantsService.create({
            ...createMenuItemVariantDto,
            menu_id: menuId
        });
    }
    async updateMenuItemVariantForRestaurant(variantId, updateMenuItemVariantDto) {
        return this.menuItemVariantsService.update(variantId, updateMenuItemVariantDto);
    }
    async deleteMenuItemVariantForRestaurant(menuItemVariantId) {
        return this.menuItemVariantsService.remove(menuItemVariantId);
    }
    async getOrderById(orderId) {
        return this.ordersRepository.findById(orderId);
    }
    async updateOrderStatus(orderId, status) {
        try {
            let tracking_info;
            switch (status) {
                case order_entity_1.OrderStatus.RESTAURANT_ACCEPTED:
                    tracking_info = order_entity_1.OrderTrackingInfo.PREPARING;
                    break;
                case order_entity_1.OrderStatus.RESTAURANT_PICKUP:
                    tracking_info = order_entity_1.OrderTrackingInfo.RESTAURANT_PICKUP;
                    break;
                case order_entity_1.OrderStatus.IN_PROGRESS:
                    tracking_info = order_entity_1.OrderTrackingInfo.OUT_FOR_DELIVERY;
                    break;
                case order_entity_1.OrderStatus.PENDING:
                    tracking_info = order_entity_1.OrderTrackingInfo.ORDER_PLACED;
                    break;
                default:
                    tracking_info = order_entity_1.OrderTrackingInfo.DELIVERED;
            }
            const updatedOrder = await this.ordersRepository.updateStatus(orderId, {
                status: status,
                tracking_info
            });
            if (!updatedOrder) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Order not found');
            }
            if (this.restaurantsGateway) {
                await this.restaurantsGateway.notifyPartiesOnce(updatedOrder);
            }
            return (0, createResponse_1.createResponse)('OK', updatedOrder, 'Order status updated successfully');
        }
        catch (error) {
            console.error('Error updating order status:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'An error occurred while updating the order status');
        }
    }
    async findAll() {
        try {
            const restaurants = await this.restaurantsRepository.findAll();
            return (0, createResponse_1.createResponse)('OK', restaurants, 'Restaurants retrieved successfully');
        }
        catch (error) {
            console.error('Error finding restaurants:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error retrieving restaurants');
        }
    }
    async findOne(id) {
        try {
            const restaurant = await this.restaurantsRepository.findById(id);
            if (!restaurant) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Restaurant not found');
            }
            return (0, createResponse_1.createResponse)('OK', restaurant, 'Restaurant retrieved successfully');
        }
        catch (error) {
            console.error('Error finding restaurant:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error retrieving restaurant');
        }
    }
    async remove(id) {
        try {
            const restaurant = await this.restaurantsRepository.findById(id);
            if (!restaurant) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Restaurant not found');
            }
            const deleted = await this.restaurantsRepository.delete(id);
            if (!deleted) {
                return (0, createResponse_1.createResponse)('ServerError', null, 'Failed to delete restaurant');
            }
            return (0, createResponse_1.createResponse)('OK', true, 'Restaurant deleted successfully');
        }
        catch (error) {
            console.error('Error deleting restaurant:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error deleting restaurant');
        }
    }
    async updateImageGalleries(uploadResults, entityId) {
        try {
            const restaurant = await this.restaurantsRepository.findById(entityId);
            if (!restaurant) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Restaurant not found');
            }
            const updatedRestaurant = await this.restaurantsRepository.updateImgGallery(entityId, uploadResults);
            return (0, createResponse_1.createResponse)('OK', updatedRestaurant, 'Restaurant galleries updated successfully');
        }
        catch (error) {
            console.error('Error updating restaurant galleries:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Failed to update galleries');
        }
    }
    async applyPromotion(restaurantId, promotionId) {
        try {
            const promotion = await this.promotionRepository.findById(promotionId);
            if (!promotion)
                return (0, createResponse_1.createResponse)('NotFound', null, 'Promotion not found');
            const currentTimestamp = Math.floor(Date.now() / 1000);
            if (promotion.end_date < currentTimestamp)
                return (0, createResponse_1.createResponse)('EXPIRED', null, 'Promotion has expired');
            if (promotion.start_date > currentTimestamp)
                return (0, createResponse_1.createResponse)('NOT_AVAILABLE', null, 'Promotion is not yet available');
            const restaurantDetails = await this.restaurantsRepository.findById(restaurantId);
            if (!restaurantDetails)
                return (0, createResponse_1.createResponse)('NotFound', null, 'Restaurant not found');
            const isPromotionExist = restaurantDetails.promotions.some(p => p.id === promotionId);
            if (isPromotionExist) {
                return (0, createResponse_1.createResponse)('DuplicatedRecord', null, `Promotion ${promotionId} is already applied to this restaurant`);
            }
            const restaurantWallet = await this.fWalletsRepository.findByUserId(restaurantDetails.owner_id);
            if (!restaurantWallet)
                return (0, createResponse_1.createResponse)('NotFound', null, 'Wallet not found for restaurant owner');
            const transactionDto = {
                user_id: restaurantDetails.owner_id,
                fwallet_id: restaurantWallet.id,
                transaction_type: 'PURCHASE',
                amount: promotion.promotion_cost_price,
                balance_after: parseFloat(restaurantWallet.balance.toString()) -
                    +promotion.promotion_cost_price,
                status: 'PENDING',
                source: 'FWALLET',
                destination: constants_1.FLASHFOOD_FINANCE.id,
                destination_type: 'FWALLET'
            };
            const transactionResponse = await this.transactionsService.create(transactionDto);
            if (transactionResponse.EC !== 0) {
                return (0, createResponse_1.createResponse)(transactionResponse.EC === -8 ? 'InsufficientBalance' : 'ServerError', null, transactionResponse.EM || 'Failed to process transaction');
            }
            const updatedPromotionIds = Array.from(new Set([
                ...(restaurantDetails.promotions.map(p => p.id) || []),
                promotionId
            ]));
            const promotionEntities = await this.promotionRepository.findByIds(updatedPromotionIds);
            if (promotionEntities.length !== updatedPromotionIds.length) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'One or more promotions not found');
            }
            restaurantDetails.promotions = promotionEntities;
            await this.restaurantsRepository.repository.save(restaurantDetails);
            return (0, createResponse_1.createResponse)('OK', {
                transaction: transactionResponse.data,
                restaurant: restaurantDetails,
                promotion: promotionId
            }, 'Promotion applied successfully');
        }
        catch (error) {
            console.error('Error applying promotion:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error applying promotion');
        }
    }
};
exports.RestaurantsService = RestaurantsService;
exports.RestaurantsService = RestaurantsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [restaurants_repository_1.RestaurantsRepository,
        users_repository_1.UserRepository,
        promotions_repository_1.PromotionsRepository,
        address_book_repository_1.AddressBookRepository,
        orders_repository_1.OrdersRepository,
        menu_items_service_1.MenuItemsService,
        menu_item_variants_service_1.MenuItemVariantsService,
        transactions_service_1.TransactionService,
        restaurants_gateway_1.RestaurantsGateway,
        food_categories_repository_1.FoodCategoriesRepository,
        fwallets_repository_1.FWalletsRepository])
], RestaurantsService);
//# sourceMappingURL=restaurants.service.js.map