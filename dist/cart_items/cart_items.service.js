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
let CartItemsService = class CartItemsService {
    constructor(cartItemsRepository, restaurantRepository, customersRepository, menuItemsRepository, menuItemVariantsRepository) {
        this.cartItemsRepository = cartItemsRepository;
        this.restaurantRepository = restaurantRepository;
        this.customersRepository = customersRepository;
        this.menuItemsRepository = menuItemsRepository;
        this.menuItemVariantsRepository = menuItemVariantsRepository;
    }
    async create(createCartItemDto) {
        try {
            const { variants, item_id, customer_id } = createCartItemDto;
            if (!item_id || !customer_id) {
                return (0, createResponse_1.createResponse)('MissingInput', null, 'Item ID and Customer ID are required');
            }
            const [menuItem, customer] = await Promise.all([
                this.menuItemsRepository.findById(item_id),
                this.customersRepository.findById(customer_id)
            ]);
            if (!menuItem || !customer) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'MenuItem or Customer not found');
            }
            const existingCartItem = await this.cartItemsRepository.findOne({
                customer_id,
                item_id
            });
            if (existingCartItem) {
                const updatedVariants = await this.updateExistingCartItemVariants(existingCartItem, variants);
                const updated = await this.cartItemsRepository.update(existingCartItem.id, {
                    variants: updatedVariants,
                    updated_at: Math.floor(Date.now() / 1000),
                    item_id: existingCartItem.item_id,
                    customer_id: existingCartItem.customer_id,
                    restaurant_id: existingCartItem.restaurant_id
                });
                return (0, createResponse_1.createResponse)('OK', updated, 'Cart item added quantity successfully');
            }
            const populatedVariants = await this.populateVariants(variants);
            const newCartItem = await this.cartItemsRepository.create({
                ...createCartItemDto,
                variants: populatedVariants,
                restaurant_id: menuItem.restaurant_id
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
            if (item_id) {
                const menuItem = await this.menuItemsRepository.findById(item_id);
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
            if (variants) {
                const populatedVariants = await Promise.all(variants.map(async (variant) => {
                    const variantDetails = await this.menuItemVariantsRepository.findById(variant.variant_id);
                    if (!variantDetails) {
                        return (0, createResponse_1.createResponse)('NotFound', null, `Variant with ID ${variant.variant_id} not found`);
                    }
                    return {
                        ...variant,
                        variant_name: variantDetails.variant
                    };
                }));
                updateData.variants = populatedVariants;
            }
            console.log('check update data', updateData);
            const existingCartItem = await this.cartItemsRepository.findById(id);
            const updatedCartItem = await this.cartItemsRepository.update(id, {
                ...updateData,
                updated_at: Math.floor(Date.now() / 1000),
                item_id: existingCartItem.item_id,
                customer_id: existingCartItem.customer_id,
                variants: existingCartItem.variants
            });
            if (!updatedCartItem) {
                return (0, createResponse_1.createResponse)('NotFound', null, `Cart item with ID ${id} not found`);
            }
            return (0, createResponse_1.createResponse)('OK', { variants, item_id, customer_id, ...updateData }, 'Cart item updated successfully');
        }
        catch (error) {
            console.log('error', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Failed to update cart item');
        }
    }
    async findAll(query = {}) {
        const cartItems = await this.cartItemsRepository.findAll(query);
        const populatedCartItems = await Promise.all(cartItems.map(async (cartItem) => {
            const cartItemObj = cartItem;
            const populatedVariants = await Promise.all(cartItemObj.variants.map(async (variant) => {
                const variantDetails = await this.menuItemVariantsRepository.findById(variant.variant_id);
                return {
                    ...variant,
                    variant_name: variantDetails ? variantDetails.variant : 'Unknown'
                };
            }));
            cartItemObj.variants = populatedVariants;
            return cartItemObj;
        }));
        const transformedCartItems = populatedCartItems.map(cartItem => {
            const { item_id, ...rest } = cartItem;
            return {
                ...rest,
                item: item_id
            };
        });
        const finalResult = await Promise.all(transformedCartItems.map(async (item) => {
            const menuItem = await this.menuItemsRepository.findById(item.item);
            if (!menuItem) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Menu item not found');
            }
            const itemObj = menuItem;
            const restaurantDetails = await this.restaurantRepository.findById(itemObj.restaurant_id);
            return {
                ...item,
                item: {
                    ...menuItem,
                    restaurantDetails
                }
            };
        }));
        return (0, createResponse_1.createResponse)('OK', finalResult, 'Cart items fetched successfully');
    }
    async findById(id) {
        try {
            const cartItem = await this.cartItemsRepository.findById(id);
            if (!cartItem) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Cart item not found');
            }
            return (0, createResponse_1.createResponse)('OK', cartItem, 'Fetched cart item successfully');
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
            return (0, createResponse_1.createResponse)('OK', cartItem, 'Fetched cart item successfully');
        }
        catch (error) {
            console.log('error', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'An error occurred while fetching the cart item');
        }
    }
    async remove(id) {
        const deletedCartItem = await this.cartItemsRepository.remove(id);
        if (!deletedCartItem) {
            return (0, createResponse_1.createResponse)('NotFound', null, 'Cart item not found');
        }
        try {
            return (0, createResponse_1.createResponse)('OK', null, 'Cart item deleted successfully');
        }
        catch (error) {
            console.log('error', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'An error occurred while deleting the cart item');
        }
    }
    async populateVariants(variants) {
        return Promise.all(variants.map(async (variant) => {
            const variantDetails = await this.menuItemVariantsRepository.findById(variant.variant_id);
            return {
                variant_id: variant.variant_id,
                variant_name: variantDetails.variant,
                variant_price_at_time_of_addition: variantDetails.price,
                quantity: variant.quantity
            };
        }));
    }
    async updateExistingCartItemVariants(existingCartItem, newVariants) {
        const updatedVariants = [...existingCartItem.variants];
        for (const newVariant of newVariants) {
            const existingVariantIndex = updatedVariants.findIndex(v => v.variant_id === newVariant.variant_id);
            if (existingVariantIndex > -1) {
                updatedVariants[existingVariantIndex].quantity += newVariant.quantity;
            }
            else {
                const variantDetails = await this.menuItemVariantsRepository.findById(newVariant.variant_id);
                updatedVariants.push({
                    variant_id: newVariant.variant_id,
                    variant_name: variantDetails.variant,
                    variant_price_at_time_of_addition: variantDetails.price,
                    quantity: newVariant.quantity
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