import { Injectable } from '@nestjs/common';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { createResponse } from 'src/utils/createResponse';
import { MenuItemsService } from 'src/menu_items/menu_items.service';
import { CreateMenuItemDto } from 'src/menu_items/dto/create-menu_item.dto';
import { UpdateMenuItemDto } from 'src/menu_items/dto/update-menu_item.dto';
import { CreateMenuItemVariantDto } from 'src/menu_item_variants/dto/create-menu_item_variant.dto';
import { MenuItemVariantsService } from 'src/menu_item_variants/menu_item_variants.service';
import { UpdateMenuItemVariantDto } from 'src/menu_item_variants/dto/update-menu_item_variant.dto';
import { UserRepository } from 'src/users/users.repository';
import { ApiResponse } from 'src/utils/createResponse';
import { PromotionsRepository } from 'src/promotions/promotions.repository';
import { AddressBookRepository } from 'src/address_book/address_book.repository';
import { Restaurant } from './entities/restaurant.entity';
import { RestaurantsRepository } from './restaurants.repository';
import { OrdersRepository } from 'src/orders/orders.repository';
import { RestaurantsGateway } from 'src/restaurants/restaurants.gateway';
import {
  OrderStatus,
  OrderTrackingInfo
} from 'src/orders/entities/order.entity';
import { FoodCategoriesRepository } from 'src/food_categories/food_categories.repository';
import { FoodCategory } from 'src/food_categories/entities/food_category.entity';
import { CreateTransactionDto } from 'src/transactions/dto/create-transaction.dto';
import { FWalletsRepository } from 'src/fwallets/fwallets.repository';
import { TransactionService } from 'src/transactions/transactions.service';
import { FLASHFOOD_FINANCE } from 'src/utils/constants';
import { MenuItemsRepository } from 'src/menu_items/menu_items.repository';
import { MenuItem } from 'src/menu_items/entities/menu_item.entity';
import { Promotion } from 'src/promotions/entities/promotion.entity';
import { MenuItemVariant } from 'src/menu_item_variants/entities/menu_item_variant.entity';
// import { Promotion } from 'src/promotions/entities/promotion.entity';

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
  price_after_applied_promotion?: number | null;
}

// Interface cho response của MenuItem
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
  price_after_applied_promotion?: number | null;
  variants: MenuItemVariantResponse[];
}

@Injectable()
export class RestaurantsService {
  constructor(
    private readonly restaurantsRepository: RestaurantsRepository,
    private readonly userRepository: UserRepository,
    private readonly promotionRepository: PromotionsRepository,
    private readonly addressRepository: AddressBookRepository,
    private readonly ordersRepository: OrdersRepository,
    private readonly menuItemRepository: MenuItemsRepository,
    private readonly menuItemsService: MenuItemsService,
    private readonly menuItemVariantsService: MenuItemVariantsService,
    private readonly transactionsService: TransactionService,
    private readonly restaurantsGateway: RestaurantsGateway,
    private readonly foodCategoryRepository: FoodCategoriesRepository,
    private readonly fWalletsRepository: FWalletsRepository
  ) {}

  async create(
    createRestaurantDto: CreateRestaurantDto
  ): Promise<ApiResponse<Restaurant>> {
    try {
      const {
        owner_id,
        promotions,
        address_id,
        contact_email,
        contact_phone,
        opening_hours,
        owner_name,
        restaurant_name,
        status,
        images_gallery,
        food_category_ids
      } = createRestaurantDto;

      if (
        !owner_id ||
        !address_id ||
        !contact_email ||
        !contact_phone ||
        !opening_hours ||
        !owner_name ||
        !restaurant_name ||
        !status
      ) {
        return createResponse(
          'MissingInput',
          null,
          'Missing required fields: owner_id, address_id, contact_email, contact_phone, opening_hours, owner_name, restaurant_name, status'
        );
      }

      const owner = await this.userRepository.findById(owner_id);
      if (!owner) return createResponse('NotFound', null, 'Owner not found');

      const addressBookEntry =
        await this.addressRepository.findById(address_id);
      if (!addressBookEntry)
        return createResponse(
          'NotFound',
          null,
          'Address not found in address book'
        );

      if (promotions && promotions.length > 0) {
        const foundPromotions =
          await this.promotionRepository.findByIds(promotions);
        if (foundPromotions.length !== promotions.length)
          return createResponse(
            'NotFound',
            null,
            'One or more promotions not found'
          );
      }

      let specializeIn: FoodCategory[] = [];
      if (food_category_ids && food_category_ids.length > 0) {
        const foundCategories =
          await this.foodCategoryRepository.findByIds(food_category_ids);
        if (foundCategories.length !== food_category_ids.length)
          return createResponse(
            'NotFound',
            null,
            'One or more food categories not found'
          );
        specializeIn = foundCategories;
      }

      const restaurantDto: Partial<CreateRestaurantDto> & {
        specialize_in?: FoodCategory[];
      } = {
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

      const savedRestaurant = await this.restaurantsRepository.create(
        restaurantDto as CreateRestaurantDto
      );
      return createResponse(
        'OK',
        savedRestaurant,
        'Restaurant created successfully'
      );
    } catch (error) {
      console.error('Error creating restaurant:', error);
      return createResponse('ServerError', null, 'Error creating restaurant');
    }
  }

  async update(
    id: string,
    updateRestaurantDto: UpdateRestaurantDto
  ): Promise<ApiResponse<Restaurant>> {
    try {
      const { owner_id, promotions, address_id, food_category_ids } =
        updateRestaurantDto;

      const existingRestaurant = await this.restaurantsRepository.findById(id);
      if (!existingRestaurant)
        return createResponse('NotFound', null, 'Restaurant not found');

      if (owner_id) {
        const owner = await this.userRepository.findById(owner_id);
        if (!owner) return createResponse('NotFound', null, 'Owner not found');
      }

      if (address_id) {
        const addressBookEntry =
          await this.addressRepository.findById(address_id);
        if (!addressBookEntry)
          return createResponse(
            'NotFound',
            null,
            'Address not found in address book'
          );
      }

      if (promotions && promotions.length > 0) {
        const foundPromotions =
          await this.promotionRepository.findByIds(promotions);
        if (foundPromotions.length !== promotions.length)
          return createResponse(
            'NotFound',
            null,
            'One or more promotions not found'
          );
      }

      let specializeIn: FoodCategory[] = [];
      if (food_category_ids && food_category_ids.length > 0) {
        specializeIn =
          await this.foodCategoryRepository.findByIds(food_category_ids);
        if (specializeIn.length !== food_category_ids.length)
          return createResponse(
            'NotFound',
            null,
            'One or more food categories not found'
          );
      }

      const updatedDto: Partial<UpdateRestaurantDto> & {
        specialize_in?: FoodCategory[];
      } = {
        ...updateRestaurantDto,
        specialize_in: specializeIn.length > 0 ? specializeIn : undefined
      };

      const updatedRestaurant = await this.restaurantsRepository.update(
        id,
        updatedDto
      );
      return createResponse(
        'OK',
        updatedRestaurant,
        'Restaurant updated successfully'
      );
    } catch (error) {
      console.error('Error updating restaurant:', error);
      return createResponse('ServerError', null, 'Error updating restaurant');
    }
  }
  // Các phương thức khác giữ nguyên
  async updateEntityAvatar(
    uploadResult: { url: string; public_id: string },
    entityId: string
  ) {
    const restaurant = await this.restaurantsRepository.update(entityId, {
      avatar: { url: uploadResult.url, key: uploadResult.public_id }
    });

    if (!restaurant) {
      return createResponse('NotFound', null, 'Restaurant not found');
    }

    return createResponse(
      'OK',
      restaurant,
      'Restaurant avatar updated successfully'
    );
  }

  async createMenuItemForRestaurant(
    restaurantId: string,
    createMenuItemDto: CreateMenuItemDto
  ): Promise<any> {
    return this.menuItemsService.create({
      ...createMenuItemDto,
      restaurant_id: restaurantId
    });
  }

  async updateMenuItemForRestaurant(
    restaurantId: string,
    menuItemId: string,
    updateMenuItemDto: UpdateMenuItemDto
  ): Promise<any> {
    const menuItem = await this.menuItemsService.findOne(menuItemId);

    if (menuItem.data.menuItem.restaurant_id !== restaurantId) {
      return createResponse(
        'Forbidden',
        null,
        'Menu Item does not belong to this restaurant'
      );
    }

    return this.menuItemsService.update(menuItemId, {
      ...updateMenuItemDto,
      restaurant_id: restaurantId
    });
  }

  async deleteMenuItemForRestaurant(
    restaurantId: string,
    menuItemId: string
  ): Promise<any> {
    const menuItem = await this.menuItemsService.findOne(menuItemId);

    if (menuItem.data.restaurant_id !== restaurantId) {
      return createResponse(
        'Forbidden',
        null,
        'Menu Item does not belong to this restaurant'
      );
    }

    return this.menuItemsService.remove(menuItemId);
  }
  private calculateDiscountedPrice(
    originalPrice: number,
    promotion: Promotion
  ): number | null {
    console.log(`\n>> calculateDiscountedPrice called with:`);
    console.log(`- Original price: ${originalPrice}`);
    console.log(`- Promotion ID: ${promotion.id}`);
    console.log(`- Discount type: ${promotion.discount_type}`);
    console.log(`- Discount value: ${promotion.discount_value}`);

    const discountValue = Number(promotion.discount_value);
    const minimumOrderValue = Number(promotion.minimum_order_value || 0);

    // Check if numeric values are valid
    if (isNaN(originalPrice) || isNaN(discountValue)) {
      console.log('>> Error: Invalid numeric values for price or discount');
      return null;
    }

    // Optional: Check if promotion is active (can skip if handled elsewhere)
    const now = Math.floor(Date.now() / 1000);
    if (
      promotion.status !== 'ACTIVE' ||
      now < Number(promotion.start_date) ||
      now > Number(promotion.end_date)
    ) {
      console.log(
        `>> Promotion not active - status: ${promotion.status}, timeframe: ${now} not in ${promotion.start_date}-${promotion.end_date}`
      );
      return null;
    }

    // Check minimum order value (assuming it applies to individual items)
    if (minimumOrderValue > 0 && originalPrice < minimumOrderValue) {
      console.log(
        `>> Price ${originalPrice} below minimum order value ${minimumOrderValue}`
      );
      return null; // Skip discount if price doesn't meet minimum
    }

    let discountedPrice: number;
    if (promotion.discount_type === 'PERCENTAGE') {
      discountedPrice = originalPrice * (1 - discountValue / 100);
      console.log(
        `>> Percentage discount: ${discountValue}% off ${originalPrice} = ${discountedPrice}`
      );
    } else if (promotion.discount_type === 'FIXED') {
      discountedPrice = originalPrice - discountValue;
      // Ensure non-negative price
      discountedPrice = Math.max(0, discountedPrice);
      console.log(
        `>> Fixed discount: ${discountValue} off ${originalPrice} = ${discountedPrice}`
      );
    } else {
      // BOGO: Skip for now
      console.log(`>> Unsupported discount type: ${promotion.discount_type}`);
      return null;
    }

    // Round to 2 decimal places
    const roundedPrice = Number(discountedPrice.toFixed(2));
    console.log(`>> Final discounted price (rounded): ${roundedPrice}`);
    return roundedPrice;
  }

  async getMenuItemsForRestaurant(restaurantId: string): Promise<any> {
    // Fetch restaurant with promotions
    const restaurant = await this.restaurantsRepository.findById(restaurantId);
    if (!restaurant) {
      return createResponse('NotFound', null, 'Restaurant not found');
    }
    console.log('Restaurant found:', restaurant.id);

    // Log promotions details
    console.log(
      'Restaurant promotions:',
      restaurant.promotions ? restaurant.promotions.length : 0
    );
    if (restaurant.promotions && restaurant.promotions.length > 0) {
      restaurant.promotions.forEach((promo, index) => {
        console.log(`Promotion ${index + 1}:`, {
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

    // Fetch all menu items, including variants
    const menuItemsResult =
      await this.menuItemsService.findByRestaurantId(restaurantId);
    const menuItems = menuItemsResult.data;
    console.log('Menu items count:', menuItems.length);

    // If restaurant has no promotions, return normal menu items
    if (!restaurant.promotions || restaurant.promotions.length === 0) {
      console.log(
        'No promotions found for restaurant, returning normal menu items'
      );
      return createResponse(
        'OK',
        menuItems,
        'Fetched menu items for the restaurant'
      );
    }

    // Process promotions for each menu item and variant
    const processedMenuItems: MenuItemResponse[] = menuItems.map(
      (item: MenuItem) => {
        console.log(
          `\n--- Processing menu item: ${item.id} - ${item.name} ---`
        );
        console.log(`Original price: ${item.price}`);

        // Start with original price before applying any promotion
        let currentItemPrice = Number(item.price);
        const processedVariants: MenuItemVariantResponse[] = [];
        const itemCategories = item.category || [];
        console.log('Item categories:', itemCategories);

        const applicablePromotions = restaurant.promotions.filter(promotion => {
          const now = Math.floor(Date.now() / 1000);
          const isActive =
            promotion.status === 'ACTIVE' &&
            now >= Number(promotion.start_date) &&
            now <= Number(promotion.end_date);

          const hasMatchingCategory =
            promotion.food_categories?.some(fc =>
              itemCategories.includes(fc.id)
            ) || false;

          console.log(`Checking promotion ${promotion.id}:`, {
            status: promotion.status,
            isTimeValid: `${now} between ${promotion.start_date}-${promotion.end_date}: ${isActive}`,
            hasMatchingCategory: hasMatchingCategory,
            foodCategories: promotion.food_categories?.map(fc => fc.id),
            isApplicable: isActive && hasMatchingCategory
          });

          return isActive && hasMatchingCategory;
        });

        console.log(
          `Found ${applicablePromotions.length} applicable promotions for item ${item.id}`
        );

        // Biến để theo dõi xem có promotion nào thực sự thay đổi giá hay không
        let isPromotionApplied = false;

        // Apply all promotions cumulatively for MenuItem
        if (applicablePromotions.length > 0) {
          // Sort promotions to apply percentage discounts first, then fixed discounts
          const sortedPromotions = [...applicablePromotions].sort((a, b) => {
            if (
              a.discount_type === 'PERCENTAGE' &&
              b.discount_type !== 'PERCENTAGE'
            )
              return -1;
            if (
              a.discount_type !== 'PERCENTAGE' &&
              b.discount_type === 'PERCENTAGE'
            )
              return 1;
            return 0;
          });

          sortedPromotions.forEach(promotion => {
            console.log(
              `\nApplying promotion ${promotion.id} to item ${item.id}:`
            );
            console.log(`- Current price: ${currentItemPrice}`);
            console.log(`- Discount type: ${promotion.discount_type}`);
            console.log(`- Discount value: ${promotion.discount_value}`);
            console.log(
              `- Minimum order value: ${promotion.minimum_order_value || 'none'}`
            );

            const discountedPrice = this.calculateDiscountedPrice(
              currentItemPrice,
              promotion
            );

            console.log(`- Calculated discounted price: ${discountedPrice}`);

            if (discountedPrice !== null) {
              console.log(
                `- Applied promotion: new price ${discountedPrice} (was: ${currentItemPrice})`
              );
              currentItemPrice = discountedPrice;
              isPromotionApplied = true; // Đánh dấu rằng promotion đã được áp dụng
            }
          });
        }

        console.log(
          `Final price after all promotions for item ${item.id}: ${currentItemPrice}`
        );

        // Process variants
        if (item.variants && item.variants.length > 0) {
          console.log(
            `\nProcessing ${item.variants.length} variants for item ${item.id}`
          );

          item.variants.forEach((variant: MenuItemVariant) => {
            console.log(
              `\n--- Processing variant: ${variant.id} - ${variant.variant} ---`
            );
            console.log(`Original price: ${variant.price}`);

            // Start with original variant price
            let currentVariantPrice = Number(variant.price);
            let isVariantPromotionApplied = false;

            if (applicablePromotions.length > 0) {
              // Sort promotions to apply percentage discounts first, then fixed discounts
              const sortedPromotions = [...applicablePromotions].sort(
                (a, b) => {
                  if (
                    a.discount_type === 'PERCENTAGE' &&
                    b.discount_type !== 'PERCENTAGE'
                  )
                    return -1;
                  if (
                    a.discount_type !== 'PERCENTAGE' &&
                    b.discount_type === 'PERCENTAGE'
                  )
                    return 1;
                  return 0;
                }
              );

              sortedPromotions.forEach(promotion => {
                console.log(
                  `\nApplying promotion ${promotion.id} to variant ${variant.id}:`
                );
                console.log(`- Current price: ${currentVariantPrice}`);
                console.log(`- Discount type: ${promotion.discount_type}`);
                console.log(`- Discount value: ${promotion.discount_value}`);

                const discountedPrice = this.calculateDiscountedPrice(
                  currentVariantPrice,
                  promotion
                );

                console.log(
                  `- Calculated discounted price: ${discountedPrice}`
                );

                if (discountedPrice !== null) {
                  console.log(
                    `- Applied promotion: new price ${discountedPrice} (was: ${currentVariantPrice})`
                  );
                  currentVariantPrice = discountedPrice;
                  isVariantPromotionApplied = true; // Đánh dấu rằng promotion đã được áp dụng cho variant
                }
              });
            }

            console.log(
              `Final price after all promotions for variant ${variant.id}: ${currentVariantPrice}`
            );

            // Chỉ thêm price_after_applied_promotion nếu promotion thực sự được áp dụng
            const variantResponse: MenuItemVariantResponse = {
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

        // Chỉ thêm price_after_applied_promotion nếu promotion thực sự được áp dụng
        const itemResponse: MenuItemResponse = {
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
      }
    );

    // Log processed items pricing
    console.log('Processed items check:');
    processedMenuItems.forEach(item => {
      console.log(
        `Item ${item.id} final price: ${item.price_after_applied_promotion || item.price}`
      );
      item.variants.forEach(variant => {
        console.log(
          `Variant ${variant.id} final price: ${variant.price_after_applied_promotion || variant.price}`
        );
      });
    });

    return createResponse(
      'OK',
      processedMenuItems,
      'Fetched menu items for the restaurant'
    );
  }

  async createMenuItemVariantForRestaurant(
    menuId: string,
    createMenuItemVariantDto: CreateMenuItemVariantDto
  ): Promise<any> {
    return this.menuItemVariantsService.create({
      ...createMenuItemVariantDto,
      menu_id: menuId
    });
  }

  async updateMenuItemVariantForRestaurant(
    variantId: string,
    updateMenuItemVariantDto: UpdateMenuItemVariantDto
  ): Promise<any> {
    return this.menuItemVariantsService.update(
      variantId,
      updateMenuItemVariantDto
    );
  }

  async deleteMenuItemVariantForRestaurant(
    menuItemVariantId: string
  ): Promise<any> {
    return this.menuItemVariantsService.remove(menuItemVariantId);
  }

  async getOrderById(orderId: string) {
    return this.ordersRepository.findById(orderId);
  }

  async updateOrderStatus(orderId: string, status: string): Promise<any> {
    try {
      let tracking_info: OrderTrackingInfo;
      switch (status) {
        case OrderStatus.RESTAURANT_ACCEPTED:
          tracking_info = OrderTrackingInfo.PREPARING;
          break;
        case OrderStatus.RESTAURANT_PICKUP:
          tracking_info = OrderTrackingInfo.RESTAURANT_PICKUP;
          break;
        case OrderStatus.IN_PROGRESS:
          tracking_info = OrderTrackingInfo.OUT_FOR_DELIVERY;
          break;
        case OrderStatus.PENDING:
          tracking_info = OrderTrackingInfo.ORDER_PLACED;
          break;
        default:
          tracking_info = OrderTrackingInfo.DELIVERED;
      }

      const updatedOrder = await this.ordersRepository.updateStatus(orderId, {
        status: status as OrderStatus, // Ép kiểu để khớp enum
        tracking_info
      });

      if (!updatedOrder) {
        return createResponse('NotFound', null, 'Order not found');
      }

      // Gọi notifyPartiesOnce từ RestaurantsGateway thay vì emitOrderStatusUpdate
      if (this.restaurantsGateway) {
        await this.restaurantsGateway.notifyPartiesOnce(updatedOrder); // Gọi private method qua kiểu này
      }

      return createResponse(
        'OK',
        updatedOrder,
        'Order status updated successfully'
      );
    } catch (error) {
      console.error('Error updating order status:', error);
      return createResponse(
        'ServerError',
        null,
        'An error occurred while updating the order status'
      );
    }
  }

  async findAll(): Promise<ApiResponse<Restaurant[]>> {
    try {
      const restaurants = await this.restaurantsRepository.findAll();
      return createResponse(
        'OK',
        restaurants,
        'Restaurants retrieved successfully'
      );
    } catch (error) {
      console.error('Error finding restaurants:', error);
      return createResponse(
        'ServerError',
        null,
        'Error retrieving restaurants'
      );
    }
  }

  // Trong RestaurantsService
  async findOne(id: string): Promise<ApiResponse<Restaurant>> {
    try {
      const restaurant = await this.restaurantsRepository.findById(id);
      if (!restaurant) {
        return createResponse('NotFound', null, 'Restaurant not found');
      }

      return createResponse(
        'OK',
        restaurant, // promotions đã tự động populate
        'Restaurant retrieved successfully'
      );
    } catch (error) {
      console.error('Error finding restaurant:', error);
      return createResponse('ServerError', null, 'Error retrieving restaurant');
    }
  }

  async remove(id: string): Promise<ApiResponse<boolean>> {
    try {
      const restaurant = await this.restaurantsRepository.findById(id);
      if (!restaurant) {
        return createResponse('NotFound', null, 'Restaurant not found');
      }

      const deleted = await this.restaurantsRepository.delete(id);
      if (!deleted) {
        return createResponse(
          'ServerError',
          null,
          'Failed to delete restaurant'
        );
      }

      return createResponse('OK', true, 'Restaurant deleted successfully');
    } catch (error) {
      console.error('Error deleting restaurant:', error);
      return createResponse('ServerError', null, 'Error deleting restaurant');
    }
  }

  async updateImageGalleries(
    uploadResults: Array<{ key: string; url: string }>,
    entityId: string
  ) {
    try {
      const restaurant = await this.restaurantsRepository.findById(entityId);
      if (!restaurant) {
        return createResponse('NotFound', null, 'Restaurant not found');
      }

      // Gọi phương thức updateImgGallery
      const updatedRestaurant =
        await this.restaurantsRepository.updateImgGallery(
          entityId,
          uploadResults
        );

      return createResponse(
        'OK',
        updatedRestaurant,
        'Restaurant galleries updated successfully'
      );
    } catch (error) {
      console.error('Error updating restaurant galleries:', error);
      return createResponse('ServerError', null, 'Failed to update galleries');
    }
  }

  // Trong RestaurantsService
  async applyPromotion(
    restaurantId: string,
    promotionId: string
  ): Promise<ApiResponse<any>> {
    try {
      const promotion = await this.promotionRepository.findById(promotionId);
      if (!promotion)
        return createResponse('NotFound', null, 'Promotion not found');

      const currentTimestamp = Math.floor(Date.now() / 1000);
      if (promotion.end_date < currentTimestamp)
        return createResponse('EXPIRED', null, 'Promotion has expired');
      if (promotion.start_date > currentTimestamp)
        return createResponse(
          'NOT_AVAILABLE',
          null,
          'Promotion is not yet available'
        );

      const restaurantDetails =
        await this.restaurantsRepository.findById(restaurantId);
      if (!restaurantDetails)
        return createResponse('NotFound', null, 'Restaurant not found');

      // Kiểm tra xem promotionId đã tồn tại trong restaurant.promotions chưa
      const isPromotionExist = restaurantDetails.promotions.some(
        p => p.id === promotionId
      );
      if (isPromotionExist) {
        return createResponse(
          'DuplicatedRecord',
          null,
          `Promotion ${promotionId} is already applied to this restaurant`
        );
      }

      const restaurantWallet = await this.fWalletsRepository.findByUserId(
        restaurantDetails.owner_id
      );
      if (!restaurantWallet)
        return createResponse(
          'NotFound',
          null,
          'Wallet not found for restaurant owner'
        );

      const transactionDto: CreateTransactionDto = {
        user_id: restaurantDetails.owner_id,
        fwallet_id: restaurantWallet.id,
        transaction_type: 'PURCHASE',
        amount: promotion.promotion_cost_price,
        balance_after:
          parseFloat(restaurantWallet.balance.toString()) -
          +promotion.promotion_cost_price,
        status: 'PENDING',
        source: 'FWALLET',
        destination: FLASHFOOD_FINANCE.id,
        destination_type: 'FWALLET'
      };

      const transactionResponse =
        await this.transactionsService.create(transactionDto);
      if (transactionResponse.EC !== 0) {
        return createResponse(
          transactionResponse.EC === -8 ? 'InsufficientBalance' : 'ServerError',
          null,
          transactionResponse.EM || 'Failed to process transaction'
        );
      }

      // Map updatedPromotions từ string[] sang Promotion[]
      const updatedPromotionIds = Array.from(
        new Set([
          ...(restaurantDetails.promotions.map(p => p.id) || []),
          promotionId
        ])
      );
      const promotionEntities =
        await this.promotionRepository.findByIds(updatedPromotionIds);
      if (promotionEntities.length !== updatedPromotionIds.length) {
        return createResponse(
          'NotFound',
          null,
          'One or more promotions not found'
        );
      }

      // Gán promotions vào restaurantDetails và save
      restaurantDetails.promotions = promotionEntities;
      await this.restaurantsRepository.repository.save(restaurantDetails);

      return createResponse(
        'OK',
        {
          transaction: transactionResponse.data,
          restaurant: restaurantDetails,
          promotion: promotionId
        },
        'Promotion applied successfully'
      );
    } catch (error) {
      console.error('Error applying promotion:', error);
      return createResponse('ServerError', null, 'Error applying promotion');
    }
  }
}
