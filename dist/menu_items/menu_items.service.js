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
exports.MenuItemsService = void 0;
const createResponse_1 = require("../utils/createResponse");
const menu_item_variants_service_1 = require("../menu_item_variants/menu_item_variants.service");
const food_categories_repository_1 = require("../food_categories/food_categories.repository");
const restaurants_repository_1 = require("../restaurants/restaurants.repository");
const menu_items_repository_1 = require("./menu_items.repository");
const common_1 = require("@nestjs/common");
let MenuItemsService = class MenuItemsService {
    constructor(menuItemRepository, restaurantRepository, foodCategoriesRepository, menuItemVariantsService) {
        this.menuItemRepository = menuItemRepository;
        this.restaurantRepository = restaurantRepository;
        this.foodCategoriesRepository = foodCategoriesRepository;
        this.menuItemVariantsService = menuItemVariantsService;
    }
    async create(createMenuItemDto) {
        try {
            const validationResult = await this.validateMenuItemData(createMenuItemDto);
            if (validationResult !== true) {
                return validationResult;
            }
            const existingMenuItem = await this.findExistingMenuItem(createMenuItemDto.name, createMenuItemDto.restaurant_id);
            if (existingMenuItem) {
                return await this.handleExistingMenuItem(existingMenuItem, createMenuItemDto);
            }
            return await this.createNewMenuItem(createMenuItemDto);
        }
        catch (error) {
            return this.handleError('Error creating menu item:', error);
        }
    }
    async findAll() {
        try {
            const menuItems = await this.menuItemRepository.findAll();
            return (0, createResponse_1.createResponse)('OK', menuItems, 'Fetched all menu items');
        }
        catch (error) {
            return this.handleError('Error fetching menu items:', error);
        }
    }
    async findOne(id) {
        try {
            const menuItem = await this.menuItemRepository.findById(id);
            if (!menuItem) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Menu Item not found');
            }
            const menuItemVariants = await this.menuItemVariantsService.findAll();
            const filteredVariants = menuItemVariants.data.filter(v => v.menu_id === id);
            return (0, createResponse_1.createResponse)('OK', { menuItem, variants: filteredVariants }, 'Fetched menu item successfully');
        }
        catch (error) {
            return this.handleError('Error fetching menu item:', error);
        }
    }
    async update(id, updateMenuItemDto) {
        try {
            const existingMenuItem = await this.menuItemRepository.findById(id);
            if (!existingMenuItem) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Menu Item not found');
            }
            const updatedMenuItem = await this.updateExistingMenuItem(existingMenuItem, updateMenuItemDto);
            return (0, createResponse_1.createResponse)('OK', updatedMenuItem, 'Menu Item updated successfully');
        }
        catch (error) {
            return this.handleError('Error updating menu item:', error);
        }
    }
    async remove(id) {
        try {
            await this.menuItemRepository.remove(id);
            return (0, createResponse_1.createResponse)('OK', null, 'Menu Item deleted successfully');
        }
        catch (error) {
            return this.handleError('Error deleting menu item:', error);
        }
    }
    async updateEntityAvatar(uploadResult, menuItemId) {
        try {
            const menuItem = await this.menuItemRepository.update(menuItemId, {
                avatar: { url: uploadResult.url, key: uploadResult.public_id }
            });
            return this.handleMenuItemResponse(menuItem);
        }
        catch (error) {
            return this.handleError('Error updating menu item avatar:', error);
        }
    }
    async validateMenuItemData(createMenuItemDto) {
        const { restaurant_id, category } = createMenuItemDto;
        const restaurant = await this.restaurantRepository.findById(restaurant_id);
        if (!restaurant) {
            return (0, createResponse_1.createResponse)('NotFound', null, 'Restaurant not found');
        }
        for (const categoryId of category) {
            const foodCategory = await this.foodCategoriesRepository.findById(categoryId);
            if (!foodCategory) {
                return (0, createResponse_1.createResponse)('NotFound', null, `Food Category with ID ${categoryId} not found`);
            }
        }
        return true;
    }
    async findExistingMenuItem(name, restaurantId) {
        return this.menuItemRepository.findOne({
            name,
            restaurant_id: restaurantId
        });
    }
    async handleExistingMenuItem(existingMenuItem, createMenuItemDto) {
        const variants = await Promise.all(createMenuItemDto.variants.map(variant => this.createVariant(variant, existingMenuItem)));
        if (createMenuItemDto.discount) {
            await this.menuItemRepository.update(existingMenuItem.id, {
                discount: createMenuItemDto.discount
            });
        }
        const updatedMenuItem = await this.menuItemRepository.findById(existingMenuItem.id);
        return (0, createResponse_1.createResponse)('OK', { ...updatedMenuItem, variants }, 'Menu Item and variants updated successfully');
    }
    async createNewMenuItem(createMenuItemDto) {
        const menuItemData = {
            ...createMenuItemDto,
            variants: [],
            created_at: Math.floor(Date.now() / 1000),
            updated_at: Math.floor(Date.now() / 1000)
        };
        const newMenuItem = await this.menuItemRepository.create(menuItemData);
        let variants = [];
        if (createMenuItemDto.variants?.length) {
            variants = await Promise.all(createMenuItemDto.variants.map(variant => this.createVariant(variant, newMenuItem)));
        }
        return (0, createResponse_1.createResponse)('OK', {
            ...newMenuItem,
            variants
        }, 'Menu Item and variants created successfully');
    }
    async updateExistingMenuItem(menuItem, updateData) {
        const { variants, ...updateFields } = updateData;
        const updatedMenuItem = await this.menuItemRepository.update(menuItem.id, {
            ...updateFields,
            updated_at: Math.floor(Date.now() / 1000)
        });
        if (variants?.length) {
            await Promise.all(variants.map(async (variantData) => {
                const variantDto = {
                    price: variantData.price || 0,
                    description: variantData.description || '',
                    variant: variantData.description || ''
                };
                return this.createVariant(variantDto, updatedMenuItem);
            }));
        }
        return updatedMenuItem;
    }
    async createVariant(variantData, menuItem) {
        const newVariantData = {
            menu_id: menuItem.id,
            variant: variantData.variant || variantData.description || '',
            price: variantData.price || 0,
            description: variantData.description || '',
            avatar: menuItem.avatar || { key: '', url: '' },
            availability: true,
            default_restaurant_notes: [],
            discount_rate: 0
        };
        const result = await this.menuItemVariantsService.create(newVariantData);
        return result.data;
    }
    handleMenuItemResponse(menuItem) {
        if (!menuItem) {
            return (0, createResponse_1.createResponse)('NotFound', null, 'Menu item not found');
        }
        return (0, createResponse_1.createResponse)('OK', menuItem, 'Menu item retrieved successfully');
    }
    handleError(message, error) {
        console.error(message, error);
        return (0, createResponse_1.createResponse)('ServerError', null, 'An error occurred while processing your request');
    }
};
exports.MenuItemsService = MenuItemsService;
exports.MenuItemsService = MenuItemsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [menu_items_repository_1.MenuItemsRepository,
        restaurants_repository_1.RestaurantsRepository,
        food_categories_repository_1.FoodCategoriesRepository,
        menu_item_variants_service_1.MenuItemVariantsService])
], MenuItemsService);
//# sourceMappingURL=menu_items.service.js.map