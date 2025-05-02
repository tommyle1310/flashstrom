"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const restaurant_entity_1 = require("./entities/restaurant.entity");
const restaurants_repository_1 = require("./restaurants.repository");
const orders_repository_1 = require("../orders/orders.repository");
const restaurants_gateway_1 = require("./restaurants.gateway");
const order_entity_1 = require("../orders/entities/order.entity");
const food_categories_repository_1 = require("../food_categories/food_categories.repository");
const fwallets_repository_1 = require("../fwallets/fwallets.repository");
const transactions_service_1 = require("../transactions/transactions.service");
const constants_1 = require("../utils/constants");
const menu_items_repository_1 = require("../menu_items/menu_items.repository");
const redis_1 = require("redis");
const typeorm_1 = require("typeorm");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const logger = new common_1.Logger('RestaurantsService');
const redis = (0, redis_1.createClient)({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redis.connect().catch(err => logger.error('Redis connection error:', err));
let RestaurantsService = class RestaurantsService {
    constructor(restaurantsRepository, userRepository, promotionRepository, addressRepository, ordersRepository, menuItemRepository, menuItemsService, menuItemVariantsService, transactionsService, restaurantsGateway, foodCategoryRepository, fWalletsRepository, dataSource) {
        this.restaurantsRepository = restaurantsRepository;
        this.userRepository = userRepository;
        this.promotionRepository = promotionRepository;
        this.addressRepository = addressRepository;
        this.ordersRepository = ordersRepository;
        this.menuItemRepository = menuItemRepository;
        this.menuItemsService = menuItemsService;
        this.menuItemVariantsService = menuItemVariantsService;
        this.transactionsService = transactionsService;
        this.restaurantsGateway = restaurantsGateway;
        this.foodCategoryRepository = foodCategoryRepository;
        this.fWalletsRepository = fWalletsRepository;
        this.dataSource = dataSource;
    }
    async onModuleInit() {
        try {
            const start = Date.now();
            const restaurants = await this.restaurantsRepository.repository.find({
                select: ['id', 'status'],
                take: 10000
            });
            for (const restaurant of restaurants) {
                const cacheKey = `restaurant:${restaurant.id}`;
                await redis.setEx(cacheKey, 86400, JSON.stringify(restaurant));
            }
            logger.log(`Preloaded ${restaurants.length} restaurants into Redis in ${Date.now() - start}ms`);
        }
        catch (error) {
            logger.error('Error preloading restaurants into Redis:', error);
        }
    }
    async preloadRestaurants() {
        try {
            const start = Date.now();
            const restaurants = await this.restaurantsRepository.repository.find({
                select: ['id', 'status'],
                take: 10000
            });
            const batchSize = 1000;
            for (let i = 0; i < restaurants.length; i += batchSize) {
                const batch = restaurants.slice(i, i + batchSize);
                await Promise.all(batch.map(restaurant => {
                    const cacheKey = `restaurant:${restaurant.id}`;
                    return redis.setEx(cacheKey, 86400, JSON.stringify(restaurant));
                }));
            }
            logger.log(`Preloaded ${restaurants.length} restaurants into Redis in ${Date.now() - start}ms`);
        }
        catch (error) {
            logger.error('Error preloading restaurants into Redis:', error);
        }
    }
    async clearRedis() {
        const start = Date.now();
        try {
            const keys = await redis.keys('*');
            if (keys.length > 0) {
                await redis.del(keys);
            }
            logger.log(`Cleared ${keys.length} keys from Redis in ${Date.now() - start}ms`);
            await this.preloadRestaurants();
            return (0, createResponse_1.createResponse)('OK', null, 'Redis cleared and restaurants preloaded successfully');
        }
        catch (error) {
            logger.error('Error clearing Redis:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error clearing Redis');
        }
    }
    async update(id, updateRestaurantDto) {
        const start = Date.now();
        try {
            const { owner_id, promotions, address_id, food_category_ids } = updateRestaurantDto;
            const cacheKey = `restaurant:${id}`;
            let restaurant = null;
            const fetchStart = Date.now();
            const cached = await redis.get(cacheKey);
            if (cached) {
                restaurant = JSON.parse(cached);
                logger.log(`Fetch restaurant (cache) took ${Date.now() - fetchStart}ms`);
            }
            else {
                restaurant = await this.restaurantsRepository.findById(id);
                if (restaurant) {
                    await redis.setEx(cacheKey, 7200, JSON.stringify(restaurant));
                    logger.log(`Stored restaurant in Redis: ${cacheKey}`);
                }
                logger.log(`Fetch restaurant took ${Date.now() - fetchStart}ms`);
            }
            if (!restaurant) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Restaurant not found');
            }
            if (owner_id) {
                const ownerCacheKey = `user:${owner_id}`;
                let owner = null;
                const ownerFetchStart = Date.now();
                const cachedOwner = await redis.get(ownerCacheKey);
                if (cachedOwner) {
                    owner = JSON.parse(cachedOwner);
                    logger.log(`Fetch owner (cache) took ${Date.now() - ownerFetchStart}ms`);
                }
                else {
                    owner = await this.userRepository.findById(owner_id);
                    if (owner) {
                        await redis.setEx(ownerCacheKey, 7200, JSON.stringify(owner));
                        logger.log(`Stored owner in Redis: ${ownerCacheKey}`);
                    }
                    logger.log(`Fetch owner took ${Date.now() - ownerFetchStart}ms`);
                }
                if (!owner) {
                    return (0, createResponse_1.createResponse)('NotFound', null, 'Owner not found');
                }
            }
            if (address_id) {
                const addressCacheKey = `address:${address_id}`;
                let address = null;
                const addressFetchStart = Date.now();
                const cachedAddress = await redis.get(addressCacheKey);
                if (cachedAddress) {
                    address = JSON.parse(cachedAddress);
                    logger.log(`Fetch address (cache) took ${Date.now() - addressFetchStart}ms`);
                }
                else {
                    address = await this.addressRepository.findById(address_id);
                    if (address) {
                        await redis.setEx(addressCacheKey, 7200, JSON.stringify(address));
                        logger.log(`Stored address in Redis: ${addressCacheKey}`);
                    }
                    logger.log(`Fetch address took ${Date.now() - addressFetchStart}ms`);
                }
                if (!address) {
                    return (0, createResponse_1.createResponse)('NotFound', null, 'Address not found in address book');
                }
            }
            let foundPromotions = [];
            if (promotions && promotions.length > 0) {
                const promotionFetchStart = Date.now();
                foundPromotions = await this.promotionRepository.findByIds(promotions);
                if (foundPromotions.length !== promotions.length) {
                    return (0, createResponse_1.createResponse)('NotFound', null, 'One or more promotions not found');
                }
                logger.log(`Fetch promotions took ${Date.now() - promotionFetchStart}ms`);
            }
            let specializeIn = [];
            if (food_category_ids && food_category_ids.length > 0) {
                const categoryFetchStart = Date.now();
                specializeIn =
                    await this.foodCategoryRepository.findByIds(food_category_ids);
                if (specializeIn.length !== food_category_ids.length) {
                    return (0, createResponse_1.createResponse)('NotFound', null, 'One or more food categories not found');
                }
                logger.log(`Fetch food categories took ${Date.now() - categoryFetchStart}ms`);
            }
            const updateStart = Date.now();
            const updatedDto = {
                ...updateRestaurantDto,
                specialize_in: specializeIn.length > 0 ? specializeIn : undefined
            };
            const updatedRestaurant = await this.restaurantsRepository.update(id, updatedDto);
            await redis.setEx(cacheKey, 7200, JSON.stringify(updatedRestaurant));
            logger.log(`Update restaurant took ${Date.now() - updateStart}ms`);
            logger.log(`Update restaurant took ${Date.now() - start}ms`);
            return (0, createResponse_1.createResponse)('OK', updatedRestaurant, 'Restaurant updated successfully');
        }
        catch (error) {
            logger.error('Error updating restaurant:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error updating restaurant');
        }
    }
    async toggleAvailability(id, toggleDto) {
        const start = Date.now();
        try {
            const cacheKey = `restaurant:${id}`;
            let restaurant = null;
            const fetchStart = Date.now();
            const cached = await redis.get(cacheKey);
            if (cached) {
                restaurant = JSON.parse(cached);
                logger.log(`Fetch restaurant (cache) took ${Date.now() - fetchStart}ms`);
            }
            else {
                restaurant = await this.restaurantsRepository.findById(id);
                if (restaurant) {
                    await redis.setEx(cacheKey, 86400, JSON.stringify(restaurant));
                    logger.log(`Stored restaurant in Redis: ${cacheKey}`);
                }
                logger.log(`Fetch restaurant took ${Date.now() - fetchStart}ms`);
            }
            if (!restaurant) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Restaurant not found');
            }
            const newIsOpen = toggleDto.is_open ?? !restaurant.status.is_open;
            const updateStart = Date.now();
            const updateResult = await this.dataSource
                .createQueryBuilder()
                .update(restaurant_entity_1.Restaurant)
                .set({
                status: () => `jsonb_set(status, '{is_open}', :isOpen::jsonb)`
            })
                .where('id = :id', { id, isOpen: newIsOpen })
                .execute();
            if (updateResult.affected === 0) {
                logger.warn(`Failed to update restaurant ${id}`);
                return (0, createResponse_1.createResponse)('NotFound', null, 'Restaurant not found');
            }
            logger.log(`Update restaurant availability took ${Date.now() - updateStart}ms`);
            restaurant.status.is_open = newIsOpen;
            await redis.setEx(cacheKey, 86400, JSON.stringify(restaurant));
            logger.log(`Toggle restaurant availability took ${Date.now() - start}ms`);
            return (0, createResponse_1.createResponse)('OK', restaurant, 'Restaurant availability toggled successfully');
        }
        catch (error) {
            logger.error('Error toggling restaurant availability:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'An error occurred while toggling restaurant availability');
        }
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
    calculateDiscountedPrice(originalPrice, promotion) {
        console.log(`\n>> calculateDiscountedPrice called with:`);
        console.log(`- Original price: ${originalPrice}`);
        console.log(`- Promotion ID: ${promotion.id}`);
        console.log(`- Discount type: ${promotion.discount_type}`);
        console.log(`- Discount value: ${promotion.discount_value}`);
        const discountValue = Number(promotion.discount_value);
        const minimumOrderValue = Number(promotion.minimum_order_value || 0);
        if (isNaN(originalPrice) || isNaN(discountValue)) {
            console.log('>> Error: Invalid numeric values for price or discount');
            return null;
        }
        const now = Math.floor(Date.now() / 1000);
        if (promotion.status !== 'ACTIVE' ||
            now < Number(promotion.start_date) ||
            now > Number(promotion.end_date)) {
            console.log(`>> Promotion not active - status: ${promotion.status}, timeframe: ${now} not in ${promotion.start_date}-${promotion.end_date}`);
            return null;
        }
        if (minimumOrderValue > 0 && originalPrice < minimumOrderValue) {
            console.log(`>> Price ${originalPrice} below minimum order value ${minimumOrderValue}`);
            return null;
        }
        let discountedPrice;
        if (promotion.discount_type === 'PERCENTAGE') {
            discountedPrice = originalPrice * (1 - discountValue / 100);
            console.log(`>> Percentage discount: ${discountValue}% off ${originalPrice} = ${discountedPrice}`);
        }
        else if (promotion.discount_type === 'FIXED') {
            discountedPrice = originalPrice - discountValue;
            discountedPrice = Math.max(0, discountedPrice);
            console.log(`>> Fixed discount: ${discountValue} off ${originalPrice} = ${discountedPrice}`);
        }
        else {
            console.log(`>> Unsupported discount type: ${promotion.discount_type}`);
            return null;
        }
        const roundedPrice = Number(discountedPrice.toFixed(2));
        console.log(`>> Final discounted price (rounded): ${roundedPrice}`);
        return roundedPrice;
    }
    async getMenuItemsForRestaurant(restaurantId) {
        const start = Date.now();
        const cacheKey = `menu_items:${restaurantId}`;
        try {
            const cachedMenuItems = await redis.get(cacheKey);
            if (cachedMenuItems) {
                logger.log(`Cache hit for menu items of restaurant ${restaurantId}`);
                return (0, createResponse_1.createResponse)('OK', JSON.parse(cachedMenuItems), 'Fetched menu items for the restaurant (from cache)');
            }
            logger.log(`Cache miss for menu items of restaurant ${restaurantId}`);
            const restaurant = await this.restaurantsRepository.findById(restaurantId);
            if (!restaurant) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Restaurant not found');
            }
            logger.log('Restaurant found:', restaurant.id);
            logger.log('Restaurant promotions:', restaurant.promotions ? restaurant.promotions.length : 0);
            if (restaurant.promotions && restaurant.promotions.length > 0) {
                restaurant.promotions.forEach((promo, index) => {
                    logger.log(`Promotion ${index + 1}:`, {
                        id: promo.id,
                        name: promo.name,
                        status: promo.status,
                        discount_type: promo.discount_type,
                        discount_value: promo.discount_value,
                        start_date: new Date(Number(promo.start_date) * 1000).toISOString(),
                        end_date: new Date(Number(promo.end_date) * 1000).toISOString(),
                        current_time: new Date().toISOString(),
                        food_categories: promo.food_categories?.map(fc => fc.id)
                    });
                });
            }
            const menuItemsResult = await this.menuItemsService.findByRestaurantId(restaurantId);
            const menuItems = menuItemsResult.data;
            logger.log('Menu items count:', menuItems.length);
            if (!restaurant.promotions || restaurant.promotions.length === 0) {
                logger.log('No promotions found for restaurant, returning normal menu items');
                await redis.setEx(cacheKey, 3600, JSON.stringify(menuItems));
                return (0, createResponse_1.createResponse)('OK', menuItems, 'Fetched menu items for the restaurant');
            }
            const processedMenuItems = menuItems.map((item) => {
                console.log(`\n--- Processing menu item: ${item.id} - ${item.name} ---`);
                console.log(`Original price: ${item.price}`);
                let currentItemPrice = Number(item.price);
                const processedVariants = [];
                const itemCategories = item.category || [];
                console.log('Item categories:', itemCategories);
                const applicablePromotions = restaurant.promotions.filter(promotion => {
                    const now = Math.floor(Date.now() / 1000);
                    const isActive = promotion.status === 'ACTIVE' &&
                        now >= Number(promotion.start_date) &&
                        now <= Number(promotion.end_date);
                    const hasMatchingCategory = promotion.food_categories?.some(fc => itemCategories.includes(fc.id)) || false;
                    console.log(`Checking promotion ${promotion.id}:`, {
                        status: promotion.status,
                        isTimeValid: `${now} between ${promotion.start_date}-${promotion.end_date}: ${isActive}`,
                        hasMatchingCategory: hasMatchingCategory,
                        foodCategories: promotion.food_categories?.map(fc => fc.id),
                        isApplicable: isActive && hasMatchingCategory
                    });
                    return isActive && hasMatchingCategory;
                });
                console.log(`Found ${applicablePromotions.length} applicable promotions for item ${item.id}`);
                let isPromotionApplied = false;
                if (applicablePromotions.length > 0) {
                    const sortedPromotions = [...applicablePromotions].sort((a, b) => {
                        if (a.discount_type === 'PERCENTAGE' &&
                            b.discount_type !== 'PERCENTAGE')
                            return -1;
                        if (a.discount_type !== 'PERCENTAGE' &&
                            b.discount_type === 'PERCENTAGE')
                            return 1;
                        return 0;
                    });
                    sortedPromotions.forEach(promotion => {
                        console.log(`\nApplying promotion ${promotion.id} to item ${item.id}:`);
                        console.log(`- Current price: ${currentItemPrice}`);
                        console.log(`- Discount type: ${promotion.discount_type}`);
                        console.log(`- Discount value: ${promotion.discount_value}`);
                        console.log(`- Minimum order value: ${promotion.minimum_order_value || 'none'}`);
                        const discountedPrice = this.calculateDiscountedPrice(currentItemPrice, promotion);
                        console.log(`- Calculated discounted price: ${discountedPrice}`);
                        if (discountedPrice !== null) {
                            console.log(`- Applied promotion: new price ${discountedPrice} (was: ${currentItemPrice})`);
                            currentItemPrice = discountedPrice;
                            isPromotionApplied = true;
                        }
                    });
                }
                console.log(`Final price after all promotions for item ${item.id}: ${currentItemPrice}`);
                if (item.variants && item.variants.length > 0) {
                    console.log(`\nProcessing ${item.variants.length} variants for item ${item.id}`);
                    item.variants.forEach((variant) => {
                        console.log(`\n--- Processing variant: ${variant.id} - ${variant.variant} ---`);
                        console.log(`Original price: ${variant.price}`);
                        let currentVariantPrice = Number(variant.price);
                        let isVariantPromotionApplied = false;
                        if (applicablePromotions.length > 0) {
                            const sortedPromotions = [...applicablePromotions].sort((a, b) => {
                                if (a.discount_type === 'PERCENTAGE' &&
                                    b.discount_type !== 'PERCENTAGE')
                                    return -1;
                                if (a.discount_type !== 'PERCENTAGE' &&
                                    b.discount_type === 'PERCENTAGE')
                                    return 1;
                                return 0;
                            });
                            sortedPromotions.forEach(promotion => {
                                console.log(`\nApplying promotion ${promotion.id} to variant ${variant.id}:`);
                                console.log(`- Current price: ${currentVariantPrice}`);
                                console.log(`- Discount type: ${promotion.discount_type}`);
                                console.log(`- Discount value: ${promotion.discount_value}`);
                                const discountedPrice = this.calculateDiscountedPrice(currentVariantPrice, promotion);
                                console.log(`- Calculated discounted price: ${discountedPrice}`);
                                if (discountedPrice !== null) {
                                    console.log(`- Applied promotion: new price ${discountedPrice} (was: ${currentVariantPrice})`);
                                    currentVariantPrice = discountedPrice;
                                    isVariantPromotionApplied = true;
                                }
                            });
                        }
                        console.log(`Final price after all promotions for variant ${variant.id}: ${currentVariantPrice}`);
                        const variantResponse = {
                            id: variant.id,
                            menu_id: variant.menu_id,
                            variant: variant.variant,
                            description: variant.description,
                            avatar: variant.avatar,
                            availability: variant.availability,
                            default_restaurant_notes: variant.default_restaurant_notes,
                            price: variant.price,
                            discount_rate: variant.discount_rate,
                            created_at: variant.created_at,
                            updated_at: variant.updated_at
                        };
                        if (isVariantPromotionApplied) {
                            variantResponse.price_after_applied_promotion =
                                currentVariantPrice;
                        }
                        processedVariants.push(variantResponse);
                    });
                }
                const itemResponse = {
                    id: item.id,
                    restaurant_id: item.restaurant_id,
                    name: item.name,
                    description: item.description,
                    price: item.price,
                    category: item.category,
                    avatar: item.avatar,
                    availability: item.availability,
                    suggest_notes: item.suggest_notes,
                    discount: item.discount,
                    purchase_count: item.purchase_count,
                    created_at: item.created_at,
                    updated_at: item.updated_at,
                    variants: processedVariants
                };
                if (isPromotionApplied) {
                    itemResponse.price_after_applied_promotion = currentItemPrice;
                }
                return itemResponse;
            });
            await redis.setEx(cacheKey, 3600, JSON.stringify(processedMenuItems));
            logger.log(`Processed menu items in ${Date.now() - start}ms`);
            return (0, createResponse_1.createResponse)('OK', processedMenuItems, 'Fetched menu items for the restaurant');
        }
        catch (error) {
            logger.error('Error in getMenuItemsForRestaurant:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error fetching menu items');
        }
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
                version: 0,
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
        menu_items_repository_1.MenuItemsRepository,
        menu_items_service_1.MenuItemsService,
        menu_item_variants_service_1.MenuItemVariantsService,
        transactions_service_1.TransactionService,
        restaurants_gateway_1.RestaurantsGateway,
        food_categories_repository_1.FoodCategoriesRepository,
        fwallets_repository_1.FWalletsRepository,
        typeorm_1.DataSource])
], RestaurantsService);
//# sourceMappingURL=restaurants.service.js.map