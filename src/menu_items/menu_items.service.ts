import { createResponse } from 'src/utils/createResponse';
import { CreateMenuItemDto } from './dto/create-menu_item.dto';
import { UpdateMenuItemDto } from './dto/update-menu_item.dto';
import { MenuItemVariantsService } from 'src/menu_item_variants/menu_item_variants.service';
import { ApiResponse } from 'src/utils/createResponse';
import { FoodCategoriesRepository } from 'src/food_categories/food_categories.repository';
import { RestaurantsRepository } from 'src/restaurants/restaurants.repository';
import { MenuItemsRepository } from './menu_items.repository';
import { MenuItem } from './entities/menu_item.entity';
import { MenuItemVariantDto } from 'src/menu_item_variants/dto/create-menu_item_variant.dto';
import { Injectable, Logger } from '@nestjs/common';
import { Promotion } from 'src/promotions/entities/promotion.entity';
import { MenuItemVariant } from 'src/menu_item_variants/entities/menu_item_variant.entity';
import { Equal } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from 'src/redis/redis.service';

interface MenuItemVariantResponse {
  id: string;
  menu_id: string;
  variant: string;
  description: string | null;
  avatar: { key: string; url: string } | null;
  availability: boolean;
  default_restaurant_notes: string[];
  price: number;
  discount_rate: number | null;
  created_at: number;
  updated_at: number;
  price_after_applied_promotion: number | null;
}

interface MenuItemResponse {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  price: number;
  category: string[];
  avatar: { key: string; url: string } | null;
  availability: boolean;
  suggest_notes: string[];
  discount: {
    discount_type: 'FIXED' | 'PERCENTAGE';
    discount_value: number;
    start_date: number;
    end_date: number;
  } | null;
  purchase_count: number;
  created_at: number;
  updated_at: number;
  price_after_applied_promotion: number | null;
  variants: MenuItemVariantResponse[];
}

@Injectable()
export class MenuItemsService {
  private readonly logger = new Logger(MenuItemsService.name);

  constructor(
    @InjectRepository(MenuItem)
    private readonly menuItemRepository: Repository<MenuItem>,
    private readonly menuItemsRepository: MenuItemsRepository,
    private readonly restaurantRepository: RestaurantsRepository,
    private readonly foodCategoriesRepository: FoodCategoriesRepository,
    private readonly menuItemVariantsService: MenuItemVariantsService,
    private readonly redisService: RedisService
  ) {}

  async create(
    createMenuItemDto: CreateMenuItemDto
  ): Promise<ApiResponse<any>> {
    try {
      const validationResult =
        await this.validateMenuItemData(createMenuItemDto);
      if (validationResult !== true) {
        return validationResult;
      }

      const existingMenuItem = await this.findExistingMenuItem(
        createMenuItemDto.name,
        createMenuItemDto.restaurant_id
      );

      if (existingMenuItem) {
        return await this.handleExistingMenuItem(
          existingMenuItem,
          createMenuItemDto
        );
      }

      return await this.createNewMenuItem(createMenuItemDto);
    } catch (error: any) {
      return this.handleError('Error creating menu item:', error);
    }
  }

  async findAll(): Promise<ApiResponse<MenuItem[]>> {
    try {
      const menuItems = await this.menuItemsRepository.findAll();
      return createResponse('OK', menuItems, 'Fetched all menu items');
    } catch (error: any) {
      return this.handleError('Error fetching menu items:', error);
    }
  }

  private calculateDiscountedPrice(
    originalPrice: number,
    promotion: Promotion
  ): number {
    let discountedPrice: number;
    if (promotion.discount_type === 'PERCENTAGE') {
      discountedPrice = originalPrice * (1 - promotion.discount_value / 100);
    } else if (promotion.discount_type === 'FIXED') {
      discountedPrice = originalPrice - promotion.discount_value;
    } else {
      return originalPrice;
    }
    return Math.max(0, Number(discountedPrice.toFixed(2)));
  }

  // menu_items.service.ts (chỉ trích đoạn findOne)
  async findOne(id: string): Promise<ApiResponse<any>> {
    try {
      console.log('Starting findOne with id:', id);
      const menuItem = await this.menuItemsRepository.findOne({
        where: { id: Equal(id) },
        relations: ['variants', 'restaurant']
      });
      console.log('check menu item', JSON.stringify(menuItem, null, 2));
      if (!menuItem) {
        return createResponse('NotFound', null, 'Menu Item not found');
      }

      const restaurant = await this.restaurantRepository.findOne({
        where: { id: Equal(menuItem.restaurant_id) },
        relations: ['promotions', 'promotions.food_categories'] // Thêm relations
      });
      console.log('check res', JSON.stringify(restaurant, null, 2));
      if (!restaurant) {
        return createResponse('NotFound', null, 'Restaurant not found');
      }

      let itemPriceAfterPromotion: number | null = null;
      const processedVariants: MenuItemVariantResponse[] = [];

      const now = Math.floor(Date.now() / 1000);
      const itemCategories = menuItem.category || [];
      console.log('check item categories', itemCategories);

      const applicablePromotions =
        restaurant.promotions?.filter(promotion => {
          const isActive =
            promotion.status === 'ACTIVE' &&
            now >= Number(promotion.start_date) &&
            now <= Number(promotion.end_date);
          const hasMatchingCategory =
            promotion.food_category_ids?.some(categoryId =>
              itemCategories.includes(categoryId)
            ) || false;
          console.log(
            `check promotion ${promotion.id}: active=${isActive}, hasMatchingCategory=${hasMatchingCategory}`,
            promotion.food_category_ids
          );
          return isActive && hasMatchingCategory;
        }) || [];

      if (applicablePromotions.length > 0) {
        applicablePromotions.forEach(promotion => {
          const discountedPrice = this.calculateDiscountedPrice(
            Number(menuItem.price),
            promotion
          );
          console.log(
            `apply promotion ${promotion.id} for item ${menuItem.id}: original=${menuItem.price}, discounted=${discountedPrice}`
          );
          if (
            itemPriceAfterPromotion === null ||
            discountedPrice < itemPriceAfterPromotion
          ) {
            itemPriceAfterPromotion = discountedPrice;
          }
        });
      }

      if (menuItem.variants && menuItem.variants.length > 0) {
        menuItem.variants.forEach((variant: MenuItemVariant) => {
          let variantPriceAfterPromotion: number | null = null;

          if (applicablePromotions.length > 0) {
            applicablePromotions.forEach(promotion => {
              const discountedPrice = this.calculateDiscountedPrice(
                Number(variant.price),
                promotion
              );
              console.log(
                `apply promotion ${promotion.id} for variant ${variant.id}: original=${variant.price}, discounted=${discountedPrice}`
              );
              if (
                variantPriceAfterPromotion === null ||
                discountedPrice < variantPriceAfterPromotion
              ) {
                variantPriceAfterPromotion = discountedPrice;
              }
            });
          }

          processedVariants.push({
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
            updated_at: variant.updated_at,
            price_after_applied_promotion: variantPriceAfterPromotion
          });
        });
      }

      const menuItemResponse: MenuItemResponse = {
        id: menuItem.id,
        restaurant_id: menuItem.restaurant_id,
        name: menuItem.name,
        description: menuItem.description,
        price: menuItem.price,
        category: menuItem.category,
        avatar: menuItem.avatar,
        availability: menuItem.availability,
        suggest_notes: menuItem.suggest_notes,
        discount: menuItem.discount,
        purchase_count: menuItem.purchase_count,
        created_at: menuItem.created_at,
        updated_at: menuItem.updated_at,
        price_after_applied_promotion: itemPriceAfterPromotion,
        variants: processedVariants
      };

      console.log('Returning response for menu item:', menuItemResponse.id);
      return createResponse(
        'OK',
        { menuItem: menuItemResponse, variants: processedVariants },
        'Fetched menu item successfully'
      );
    } catch (error: any) {
      console.error('Caught error in findOne:', error);
      return this.handleError('Error fetching menu item:', error);
    }
  }

  async update(
    id: string,
    updateMenuItemDto: UpdateMenuItemDto
  ): Promise<ApiResponse<MenuItem>> {
    try {
      const existingMenuItem = await this.menuItemsRepository.findById(id);
      if (!existingMenuItem) {
        return createResponse('NotFound', null, 'Menu Item not found');
      }

      const updatedMenuItem = await this.updateExistingMenuItem(
        existingMenuItem,
        updateMenuItemDto
      );
      return createResponse(
        'OK',
        updatedMenuItem,
        'Menu Item updated successfully'
      );
    } catch (error: any) {
      return this.handleError('Error updating menu item:', error);
    }
  }

  async remove(id: string): Promise<ApiResponse<null>> {
    try {
      await this.menuItemsRepository.remove(id);
      return createResponse('OK', null, 'Menu Item deleted successfully');
    } catch (error: any) {
      return this.handleError('Error deleting menu item:', error);
    }
  }

  async updateEntityAvatar(
    uploadResult: { url: string; public_id: string },
    menuItemId: string
  ): Promise<ApiResponse<MenuItem>> {
    try {
      const menuItem = await this.menuItemsRepository.update(menuItemId, {
        avatar: { url: uploadResult.url, key: uploadResult.public_id }
      });
      return this.handleMenuItemResponse(menuItem);
    } catch (error: any) {
      return this.handleError('Error updating menu item avatar:', error);
    }
  }

  // Private helper methods
  private async validateMenuItemData(
    createMenuItemDto: CreateMenuItemDto
  ): Promise<true | ApiResponse<null>> {
    const { restaurant_id, category } = createMenuItemDto;

    const restaurant = await this.restaurantRepository.findById(restaurant_id);
    if (!restaurant) {
      return createResponse('NotFound', null, 'Restaurant not found');
    }

    for (const categoryId of category) {
      const foodCategory =
        await this.foodCategoriesRepository.findById(categoryId);
      if (!foodCategory) {
        return createResponse(
          'NotFound',
          null,
          `Food Category with ID ${categoryId} not found`
        );
      }
    }

    return true;
  }

  private async findExistingMenuItem(
    name: string,
    restaurantId: string
  ): Promise<MenuItem | null> {
    return this.menuItemsRepository.findOne({
      where: { name: Equal(name), restaurant_id: Equal(restaurantId) }
    });
  }

  private async handleExistingMenuItem(
    existingMenuItem: MenuItem,
    createMenuItemDto: CreateMenuItemDto
  ): Promise<ApiResponse<any>> {
    const variants = await Promise.all(
      createMenuItemDto.variants.map(variant =>
        this.createVariant(variant, existingMenuItem)
      )
    );

    if (createMenuItemDto.discount) {
      await this.menuItemsRepository.update(existingMenuItem.id, {
        discount: createMenuItemDto.discount
      });
    }

    const updatedMenuItem = await this.menuItemsRepository.findById(
      existingMenuItem.id
    );
    return createResponse(
      'OK',
      { ...updatedMenuItem, variants },
      'Menu Item and variants updated successfully'
    );
  }

  private async createNewMenuItem(
    createMenuItemDto: CreateMenuItemDto
  ): Promise<ApiResponse<any>> {
    // First create the menu item without variants
    const menuItemData = {
      ...createMenuItemDto,
      variants: [], // Initialize empty array for variants
      created_at: Math.floor(Date.now() / 1000),
      updated_at: Math.floor(Date.now() / 1000)
    };

    const newMenuItem = await this.menuItemsRepository.create(menuItemData);

    // Create variants separately if they exist
    let variants = [];
    if (createMenuItemDto.variants?.length) {
      variants = await Promise.all(
        createMenuItemDto.variants.map(variant =>
          this.createVariant(variant, newMenuItem)
        )
      );
    }

    return createResponse(
      'OK',
      {
        ...newMenuItem,
        variants
      },
      'Menu Item and variants created successfully'
    );
  }

  private async updateExistingMenuItem(
    menuItem: MenuItem,
    updateData: UpdateMenuItemDto
  ): Promise<MenuItem> {
    // Update the menu item without variants
    const { variants, ...updateFields } = updateData; // Destructure to remove variants

    // Update the menu item
    const updatedMenuItem = await this.menuItemsRepository.update(menuItem.id, {
      ...updateFields,
      updated_at: Math.floor(Date.now() / 1000)
    });

    // Handle variants separately if they exist
    if (variants?.length) {
      await Promise.all(
        variants.map(
          async (variantData: {
            variant_id?: string;
            price?: number;
            description?: string;
          }) => {
            // Convert to MenuItemVariantDto format
            const variantDto: MenuItemVariantDto = {
              price: variantData.price || 0, // Provide default value
              description: variantData.description || '',
              variant: variantData.description || '' // Use description as variant if not provided
            };
            return this.createVariant(variantDto, updatedMenuItem);
          }
        )
      );
    }

    return updatedMenuItem;
  }

  private async createVariant(
    variantData: MenuItemVariantDto,
    menuItem: MenuItem
  ): Promise<any> {
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

  private handleMenuItemResponse(
    menuItem: MenuItem | null
  ): ApiResponse<MenuItem> {
    if (!menuItem) {
      return createResponse('NotFound', null, 'Menu item not found');
    }
    return createResponse('OK', menuItem, 'Menu item retrieved successfully');
  }

  private handleError(message: string, error: any): ApiResponse<null> {
    console.error(message, error);
    return createResponse(
      'ServerError',
      null,
      'An error occurred while processing your request'
    );
  }

  async findByRestaurantId(
    restaurantId: string
  ): Promise<ApiResponse<MenuItem[]>> {
    try {
      const menuItems =
        await this.menuItemsRepository.findByRestaurantId(restaurantId);
      return createResponse(
        'OK',
        menuItems || [],
        'Fetched menu items for restaurant'
      );
    } catch (error: any) {
      this.logger.error('Error in findByRestaurantId:', error);
      return createResponse(
        'ServerError',
        [],
        'An error occurred while fetching menu items'
      );
    }
  }

  async findAllPaginated(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      const [items, total] = await this.menuItemsRepository.findAllPaginated(
        skip,
        limit
      );
      const totalPages = Math.ceil(total / limit);

      return createResponse('OK', {
        totalPages,
        currentPage: page,
        totalItems: total,
        items
      });
    } catch (error) {
      this.logger.error(
        `Error fetching paginated menu items: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return createResponse('ServerError', null);
    }
  }

  async toggleAvailability(id: string): Promise<ApiResponse<MenuItem>> {
    try {
      const menuItem = await this.menuItemsRepository.findById(id);
      if (!menuItem) {
        return createResponse('NotFound', null, 'Menu Item not found');
      }
      const newAvailability = !menuItem.availability;
      const updatedMenuItem = await this.menuItemsRepository.update(id, {
        availability: newAvailability,
        updated_at: Math.floor(Date.now() / 1000)
      });
      // Cache the updated menu item in Redis
      const cacheKey = `menu_item:${id}`;
      await this.redisService.set(
        cacheKey,
        JSON.stringify(updatedMenuItem),
        300000
      ); // cache for 5 minutes
      this.redisService.del(`menu_items:${menuItem.restaurant_id}`);
      return createResponse(
        'OK',
        updatedMenuItem,
        `Menu Item availability toggled to ${newAvailability}`
      );
    } catch (error: any) {
      return this.handleError('Error toggling menu item availability:', error);
    }
  }
}
