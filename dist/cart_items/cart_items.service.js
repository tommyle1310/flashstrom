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
exports.CartItemsService = void 0;
const common_1 = require("@nestjs/common");
const createResponse_1 = require("../utils/createResponse");
const cart_items_repository_1 = require("./cart_items.repository");
const restaurants_repository_1 = require("../restaurants/restaurants.repository");
const customers_repository_1 = require("../customers/customers.repository");
const menu_items_repository_1 = require("../menu_items/menu_items.repository");
const menu_item_variants_repository_1 = require("../menu_item_variants/menu_item_variants.repository");
const typeorm_1 = require("typeorm");
let CartItemsService = class CartItemsService {
    constructor(cartItemsRepository, restaurantRepository, customersRepository, menuItemsRepository, menuItemVariantsRepository) {
        this.cartItemsRepository = cartItemsRepository;
        this.restaurantRepository = restaurantRepository;
        this.customersRepository = customersRepository;
        this.menuItemsRepository = menuItemsRepository;
        this.menuItemVariantsRepository = menuItemVariantsRepository;
    }
    calculateDiscountedPrice(originalPrice, promotion) {
        let discountedPrice;
        if (promotion.discount_type === 'PERCENTAGE') {
            discountedPrice = originalPrice * (1 - promotion.discount_value / 100);
        }
        else if (promotion.discount_type === 'FIXED') {
            discountedPrice = originalPrice - promotion.discount_value;
        }
        else {
            return originalPrice;
        }
        return Math.max(0, Number(discountedPrice.toFixed(2)));
    }
    async create(createCartItemDto) {
        try {
            const { variants, item_id, customer_id } = createCartItemDto;
            if (!item_id || !customer_id) {
                return (0, createResponse_1.createResponse)('MissingInput', null, 'Item ID and Customer ID are required');
            }
            const [menuItem, customer] = await Promise.all([
                this.menuItemsRepository.findById(item_id),
                this.customersRepository.findById(customer_id),
            ]);
            if (!menuItem || !customer) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'MenuItem or Customer not found');
            }
            const restaurant = await this.restaurantRepository.findById(menuItem.restaurant_id);
            if (!restaurant) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Restaurant not found');
            }
            const existingCartItem = await this.cartItemsRepository.findOne({
                where: { customer_id: (0, typeorm_1.Equal)(customer_id), item_id: (0, typeorm_1.Equal)(item_id) },
            });
            if (existingCartItem) {
                const updatedVariants = await this.updateExistingCartItemVariants(existingCartItem, variants, restaurant.promotions, menuItem);
                const updated = await this.cartItemsRepository.update(existingCartItem.id, {
                    variants: updatedVariants,
                    updated_at: Math.floor(Date.now() / 1000),
                    item_id: existingCartItem.item_id,
                    customer_id: existingCartItem.customer_id,
                    restaurant_id: existingCartItem.restaurant_id,
                });
                return (0, createResponse_1.createResponse)('OK', updated, 'Cart item added quantity successfully');
            }
            const populatedVariants = await this.populateVariants(variants, restaurant.promotions, menuItem);
            const newCartItem = await this.cartItemsRepository.create({
                ...createCartItemDto,
                variants: populatedVariants,
                restaurant_id: menuItem.restaurant_id,
            });
            return (0, createResponse_1.createResponse)('OK', newCartItem, 'Cart item created successfully');
        }
        catch (error) {
            console.log('error', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Failed to create cart item');
        }
    }
    async update(id, updateCartItemDto) {
        const { variants, item_id, customer_id, ...updateData } = updateCartItemDto;
        try {
            let menuItem = null;
            if (item_id) {
                menuItem = await this.menuItemsRepository.findById(item_id);
                if (!menuItem) {
                    return (0, createResponse_1.createResponse)('NotFound', null, `MenuItem with ID ${item_id} not found`);
                }
            }
            if (customer_id) {
                const customer = await this.customersRepository.findById(customer_id);
                if (!customer) {
                    return (0, createResponse_1.createResponse)('NotFound', null, `Customer with ID ${customer_id} not found`);
                }
            }
            const existingCartItem = await this.cartItemsRepository.findById(id);
            if (!existingCartItem) {
                return (0, createResponse_1.createResponse)('NotFound', null, `Cart item with ID ${id} not found`);
            }
            menuItem = menuItem || (await this.menuItemsRepository.findById(existingCartItem.item_id));
            const restaurant = await this.restaurantRepository.findById(existingCartItem.restaurant_id);
            if (!restaurant) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Restaurant not found');
            }
            const updatedVariants = variants
                ? await this.populateVariants(variants, restaurant.promotions, menuItem)
                : existingCartItem.variants;
            const updatedCartItem = await this.cartItemsRepository.update(id, {
                ...updateData,
                updated_at: Math.floor(Date.now() / 1000),
                item_id: existingCartItem.item_id,
                customer_id: existingCartItem.customer_id,
                variants: updatedVariants,
            });
            return (0, createResponse_1.createResponse)('OK', updatedCartItem, 'Cart item updated successfully');
        }
        catch (error) {
            console.log('error', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Failed to update cart item');
        }
    }
    async findAll(query = {}) {
        try {
            const cartItems = await this.cartItemsRepository.findAll(query);
            const populatedCartItems = await Promise.all(cartItems.map(async (cartItem) => {
                const menuItem = await this.menuItemsRepository.findById(cartItem.item_id);
                if (!menuItem) {
                    return (0, createResponse_1.createResponse)('NotFound', null, `MenuItem with ID ${cartItem.item_id} not found`);
                }
                const restaurant = await this.restaurantRepository.findById(cartItem.restaurant_id);
                if (!restaurant) {
                    return (0, createResponse_1.createResponse)('NotFound', null, `Restaurant with ID ${cartItem.restaurant_id} not found`);
                }
                const now = Math.floor(Date.now() / 1000);
                const itemCategories = menuItem.category || [];
                const applicablePromotions = restaurant.promotions?.filter((promotion) => {
                    const isActive = promotion.status === 'ACTIVE' &&
                        now >= Number(promotion.start_date) &&
                        now <= Number(promotion.end_date);
                    const hasMatchingCategory = promotion.food_categories?.some((fc) => itemCategories.includes(fc.id)) || false;
                    return isActive && hasMatchingCategory;
                }) || [];
                const populatedVariants = await Promise.all(cartItem.variants.map(async (variant) => {
                    const variantDetails = await this.menuItemVariantsRepository.findById(variant.variant_id);
                    let priceAfterPromotion = null;
                    if (applicablePromotions.length > 0) {
                        applicablePromotions.forEach((promotion) => {
                            const discountedPrice = this.calculateDiscountedPrice(variantDetails.price, promotion);
                            if (priceAfterPromotion === null || discountedPrice < priceAfterPromotion) {
                                priceAfterPromotion = discountedPrice;
                            }
                        });
                    }
                    return {
                        variant_id: variant.variant_id,
                        variant_name: variantDetails ? variantDetails.variant : 'Unknown',
                        variant_price_at_time_of_addition: variantDetails.price,
                        quantity: variant.quantity,
                        price_after_applied_promotion: priceAfterPromotion,
                    };
                }));
                return {
                    ...cartItem,
                    item: menuItem,
                    variants: populatedVariants,
                    restaurantDetails: restaurant,
                };
            }));
            return (0, createResponse_1.createResponse)('OK', populatedCartItems, 'Cart items fetched successfully');
        }
        catch (error) {
            console.log('error', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'An error occurred while fetching cart items');
        }
    }
    async findById(id) {
        try {
            const cartItem = await this.cartItemsRepository.findById(id);
            if (!cartItem) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Cart item not found');
            }
            const menuItem = await this.menuItemsRepository.findById(cartItem.item_id);
            const restaurant = await this.restaurantRepository.findById(cartItem.restaurant_id);
            const now = Math.floor(Date.now() / 1000);
            const itemCategories = menuItem.category || [];
            const applicablePromotions = restaurant.promotions?.filter((promotion) => {
                const isActive = promotion.status === 'ACTIVE' &&
                    now >= Number(promotion.start_date) &&
                    now <= Number(promotion.end_date);
                const hasMatchingCategory = promotion.food_categories?.some((fc) => itemCategories.includes(fc.id)) || false;
                return isActive && hasMatchingCategory;
            }) || [];
            const populatedVariants = await Promise.all(cartItem.variants.map(async (variant) => {
                const variantDetails = await this.menuItemVariantsRepository.findById(variant.variant_id);
                let priceAfterPromotion = null;
                if (applicablePromotions.length > 0) {
                    applicablePromotions.forEach((promotion) => {
                        const discountedPrice = this.calculateDiscountedPrice(variantDetails.price, promotion);
                        if (priceAfterPromotion === null || discountedPrice < priceAfterPromotion) {
                            priceAfterPromotion = discountedPrice;
                        }
                    });
                }
                return {
                    variant_id: variant.variant_id,
                    variant_name: variantDetails ? variantDetails.variant : 'Unknown',
                    variant_price_at_time_of_addition: variantDetails.price,
                    quantity: variant.quantity,
                    price_after_applied_promotion: priceAfterPromotion,
                };
            }));
            return (0, createResponse_1.createResponse)('OK', {
                ...cartItem,
                item: menuItem,
                variants: populatedVariants,
                restaurantDetails: restaurant,
            }, 'Fetched cart item successfully');
        }
        catch (error) {
            console.log('error', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'An error occurred while fetching the cart item');
        }
    }
    async findOne(query) {
        try {
            const cartItem = await this.cartItemsRepository.findOne(query);
            if (!cartItem) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Cart item not found');
            }
            const menuItem = await this.menuItemsRepository.findById(cartItem.item_id);
            const restaurant = await this.restaurantRepository.findById(cartItem.restaurant_id);
            const now = Math.floor(Date.now() / 1000);
            const itemCategories = menuItem.category || [];
            const applicablePromotions = restaurant.promotions?.filter((promotion) => {
                const isActive = promotion.status === 'ACTIVE' &&
                    now >= Number(promotion.start_date) &&
                    now <= Number(promotion.end_date);
                const hasMatchingCategory = promotion.food_categories?.some((fc) => itemCategories.includes(fc.id)) || false;
                return isActive && hasMatchingCategory;
            }) || [];
            const populatedVariants = await Promise.all(cartItem.variants.map(async (variant) => {
                const variantDetails = await this.menuItemVariantsRepository.findById(variant.variant_id);
                let priceAfterPromotion = null;
                if (applicablePromotions.length > 0) {
                    applicablePromotions.forEach((promotion) => {
                        const discountedPrice = this.calculateDiscountedPrice(variantDetails.price, promotion);
                        if (priceAfterPromotion === null || discountedPrice < priceAfterPromotion) {
                            priceAfterPromotion = discountedPrice;
                        }
                    });
                }
                return {
                    variant_id: variant.variant_id,
                    variant_name: variantDetails ? variantDetails.variant : 'Unknown',
                    variant_price_at_time_of_addition: variantDetails.price,
                    quantity: variant.quantity,
                    price_after_applied_promotion: priceAfterPromotion,
                };
            }));
            return (0, createResponse_1.createResponse)('OK', {
                ...cartItem,
                item: menuItem,
                variants: populatedVariants,
                restaurantDetails: restaurant,
            }, 'Fetched cart item successfully');
        }
        catch (error) {
            console.log('error', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'An error occurred while fetching the cart item');
        }
    }
    async remove(id) {
        try {
            const deleted = await this.cartItemsRepository.remove(id);
            if (!deleted) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Cart item not found');
            }
            return (0, createResponse_1.createResponse)('OK', null, 'Cart item deleted successfully');
        }
        catch (error) {
            console.log('error', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'An error occurred while deleting the cart item');
        }
    }
    async populateVariants(variants, promotions, menuItem) {
        const now = Math.floor(Date.now() / 1000);
        const itemCategories = menuItem.category || [];
        return Promise.all(variants.map(async (variant) => {
            const variantDetails = await this.menuItemVariantsRepository.findById(variant.variant_id);
            let priceToUse = variantDetails.price;
            if (promotions && promotions.length > 0) {
                const applicablePromotions = promotions.filter((promotion) => {
                    const isActive = promotion.status === 'ACTIVE' &&
                        now >= Number(promotion.start_date) &&
                        now <= Number(promotion.end_date);
                    const hasMatchingCategory = promotion.food_categories?.some((fc) => itemCategories.includes(fc.id)) || false;
                    return isActive && hasMatchingCategory;
                });
                if (applicablePromotions.length > 0) {
                    let priceAfterPromotion = null;
                    applicablePromotions.forEach((promotion) => {
                        const discountedPrice = this.calculateDiscountedPrice(variantDetails.price, promotion);
                        if (priceAfterPromotion === null || discountedPrice < priceAfterPromotion) {
                            priceAfterPromotion = discountedPrice;
                        }
                    });
                    if (priceAfterPromotion !== null) {
                        priceToUse = priceAfterPromotion;
                    }
                }
            }
            return {
                variant_id: variant.variant_id,
                variant_name: variantDetails.variant,
                variant_price_at_time_of_addition: priceToUse,
                quantity: variant.quantity,
            };
        }));
    }
    async updateExistingCartItemVariants(existingCartItem, newVariants, promotions, menuItem) {
        const updatedVariants = [...existingCartItem.variants];
        const now = Math.floor(Date.now() / 1000);
        const itemCategories = menuItem.category || [];
        for (const newVariant of newVariants) {
            const existingVariantIndex = updatedVariants.findIndex((v) => v.variant_id === newVariant.variant_id);
            if (existingVariantIndex > -1) {
                updatedVariants[existingVariantIndex].quantity += newVariant.quantity;
                const variantDetails = await this.menuItemVariantsRepository.findById(newVariant.variant_id);
                let priceAfterPromotion = null;
                if (promotions && promotions.length > 0) {
                    const applicablePromotions = promotions.filter((promotion) => {
                        const isActive = promotion.status === 'ACTIVE' &&
                            now >= Number(promotion.start_date) &&
                            now <= Number(promotion.end_date);
                        const hasMatchingCategory = promotion.food_categories?.some((fc) => itemCategories.includes(fc.id)) || false;
                        return isActive && hasMatchingCategory;
                    });
                    if (applicablePromotions.length > 0) {
                        applicablePromotions.forEach((promotion) => {
                            const discountedPrice = this.calculateDiscountedPrice(variantDetails.price, promotion);
                            if (priceAfterPromotion === null || discountedPrice < priceAfterPromotion) {
                                priceAfterPromotion = discountedPrice;
                            }
                        });
                        if (priceAfterPromotion !== null) {
                            updatedVariants[existingVariantIndex].variant_price_at_time_of_addition = priceAfterPromotion;
                        }
                    }
                }
            }
            else {
                const variantDetails = await this.menuItemVariantsRepository.findById(newVariant.variant_id);
                let priceAfterPromotion = null;
                if (promotions && promotions.length > 0) {
                    const applicablePromotions = promotions.filter((promotion) => {
                        const isActive = promotion.status === 'ACTIVE' &&
                            now >= Number(promotion.start_date) &&
                            now <= Number(promotion.end_date);
                        const hasMatchingCategory = promotion.food_categories?.some((fc) => itemCategories.includes(fc.id)) || false;
                        return isActive && hasMatchingCategory;
                    });
                    if (applicablePromotions.length > 0) {
                        applicablePromotions.forEach((promotion) => {
                            const discountedPrice = this.calculateDiscountedPrice(variantDetails.price, promotion);
                            if (priceAfterPromotion === null || discountedPrice < priceAfterPromotion) {
                                priceAfterPromotion = discountedPrice;
                            }
                        });
                    }
                }
                const priceToUse = priceAfterPromotion !== null ? priceAfterPromotion : variantDetails.price;
                updatedVariants.push({
                    variant_id: newVariant.variant_id,
                    variant_name: variantDetails.variant,
                    variant_price_at_time_of_addition: priceToUse,
                    quantity: newVariant.quantity,
                });
            }
        }
        return updatedVariants;
    }
};
exports.CartItemsService = CartItemsService;
exports.CartItemsService = CartItemsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [cart_items_repository_1.CartItemsRepository,
        restaurants_repository_1.RestaurantsRepository,
        customers_repository_1.CustomersRepository,
        menu_items_repository_1.MenuItemsRepository,
        menu_item_variants_repository_1.MenuItemVariantsRepository])
], CartItemsService);
//# sourceMappingURL=cart_items.service.js.map