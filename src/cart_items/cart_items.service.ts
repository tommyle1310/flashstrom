// cart_items.service.ts
import { Injectable } from '@nestjs/common';
import { CreateCartItemDto } from './dto/create-cart_item.dto';
import { UpdateCartItemDto } from './dto/update-cart_item.dto';
import { CartItem } from './entities/cart_item.entity';
import { createResponse } from 'src/utils/createResponse';
import { CartItemsRepository } from './cart_items.repository';
import { RestaurantsRepository } from 'src/restaurants/restaurants.repository';
import { CustomersRepository } from 'src/customers/customers.repository';
import { MenuItemsRepository } from 'src/menu_items/menu_items.repository';
import { MenuItemVariantsRepository } from 'src/menu_item_variants/menu_item_variants.repository';
import { Equal } from 'typeorm';
import { Promotion } from 'src/promotions/entities/promotion.entity';

@Injectable()
export class CartItemsService {
  constructor(
    private readonly cartItemsRepository: CartItemsRepository,
    private readonly restaurantRepository: RestaurantsRepository,
    private readonly customersRepository: CustomersRepository,
    private readonly menuItemsRepository: MenuItemsRepository,
    private readonly menuItemVariantsRepository: MenuItemVariantsRepository
  ) {}

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

  async create(createCartItemDto: CreateCartItemDto): Promise<any> {
    try {
      const { variants, item_id, customer_id } = createCartItemDto;
  
      if (!item_id || !customer_id) {
        return createResponse(
          'MissingInput',
          null,
          'Item ID and Customer ID are required'
        );
      }
  
      const [menuItem, customer] = await Promise.all([
        this.menuItemsRepository.findById(item_id),
        this.customersRepository.findById(customer_id),
      ]);
  
      if (!menuItem || !customer) {
        return createResponse('NotFound', null, 'MenuItem or Customer not found');
      }
  
      const restaurant = await this.restaurantRepository.findById(menuItem.restaurant_id);
      if (!restaurant) {
        return createResponse('NotFound', null, 'Restaurant not found');
      }
  
      const existingCartItem = await this.cartItemsRepository.findOne({
        where: { customer_id: Equal(customer_id), item_id: Equal(item_id) },
      });
  
      if (existingCartItem) {
        const updatedVariants = await this.updateExistingCartItemVariants(
          existingCartItem,
          variants,
          restaurant.promotions,
          menuItem // Truyền menuItem vào
        );
  
        const updated = await this.cartItemsRepository.update(
          existingCartItem.id,
          {
            variants: updatedVariants,
            updated_at: Math.floor(Date.now() / 1000),
            item_id: existingCartItem.item_id,
            customer_id: existingCartItem.customer_id,
            restaurant_id: existingCartItem.restaurant_id,
          }
        );
  
        return createResponse(
          'OK',
          updated,
          'Cart item added quantity successfully'
        );
      }
  
      const populatedVariants = await this.populateVariants(
        variants,
        restaurant.promotions,
        menuItem // Truyền menuItem vào
      );
      const newCartItem = await this.cartItemsRepository.create({
        ...createCartItemDto,
        variants: populatedVariants,
        restaurant_id: menuItem.restaurant_id,
      });
  
      return createResponse('OK', newCartItem, 'Cart item created successfully');
    } catch (error) {
      console.log('error', error);
      return createResponse('ServerError', null, 'Failed to create cart item');
    }
  }
  
  async update(id: string, updateCartItemDto: UpdateCartItemDto): Promise<any> {
    const { variants, item_id, customer_id, ...updateData } = updateCartItemDto;
  
    try {
      let menuItem = null;
      if (item_id) {
        menuItem = await this.menuItemsRepository.findById(item_id);
        if (!menuItem) {
          return createResponse('NotFound', null, `MenuItem with ID ${item_id} not found`);
        }
      }
  
      if (customer_id) {
        const customer = await this.customersRepository.findById(customer_id);
        if (!customer) {
          return createResponse('NotFound', null, `Customer with ID ${customer_id} not found`);
        }
      }
  
      const existingCartItem = await this.cartItemsRepository.findById(id);
      if (!existingCartItem) {
        return createResponse('NotFound', null, `Cart item with ID ${id} not found`);
      }
  
      // Nếu không có item_id mới, dùng menuItem của existingCartItem
      menuItem = menuItem || (await this.menuItemsRepository.findById(existingCartItem.item_id));
      const restaurant = await this.restaurantRepository.findById(existingCartItem.restaurant_id);
      if (!restaurant) {
        return createResponse('NotFound', null, 'Restaurant not found');
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
  
      return createResponse('OK', updatedCartItem, 'Cart item updated successfully');
    } catch (error) {
      console.log('error', error);
      return createResponse('ServerError', null, 'Failed to update cart item');
    }
  }

  async findAll(query: Record<string, any> = {}): Promise<any> {
    try {
      const cartItems = await this.cartItemsRepository.findAll(query);

      const populatedCartItems = await Promise.all(
        cartItems.map(async (cartItem) => {
          const menuItem = await this.menuItemsRepository.findById(cartItem.item_id);
          if (!menuItem) {
            return createResponse('NotFound', null, `MenuItem with ID ${cartItem.item_id} not found`);
          }

          const restaurant = await this.restaurantRepository.findById(cartItem.restaurant_id);
          if (!restaurant) {
            return createResponse('NotFound', null, `Restaurant with ID ${cartItem.restaurant_id} not found`);
          }

          const now = Math.floor(Date.now() / 1000);
          const itemCategories = menuItem.category || [];
          const applicablePromotions = restaurant.promotions?.filter((promotion) => {
            const isActive =
              promotion.status === 'ACTIVE' &&
              now >= Number(promotion.start_date) &&
              now <= Number(promotion.end_date);
            const hasMatchingCategory = promotion.food_categories?.some((fc) =>
              itemCategories.includes(fc.id)
            ) || false;
            return isActive && hasMatchingCategory;
          }) || [];

          const populatedVariants = await Promise.all(
            cartItem.variants.map(async (variant) => {
              const variantDetails = await this.menuItemVariantsRepository.findById(variant.variant_id);
              let priceAfterPromotion: number | null = null;

              if (applicablePromotions.length > 0) {
                applicablePromotions.forEach((promotion) => {
                  const discountedPrice = this.calculateDiscountedPrice(
                    variantDetails.price,
                    promotion
                  );
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
            })
          );

          return {
            ...cartItem,
            item: menuItem,
            variants: populatedVariants,
            restaurantDetails: restaurant,
          };
        })
      );

      return createResponse('OK', populatedCartItems, 'Cart items fetched successfully');
    } catch (error) {
      console.log('error', error);
      return createResponse('ServerError', null, 'An error occurred while fetching cart items');
    }
  }

  async findById(id: string): Promise<any> {
    try {
      const cartItem = await this.cartItemsRepository.findById(id);
      if (!cartItem) {
        return createResponse('NotFound', null, 'Cart item not found');
      }

      const menuItem = await this.menuItemsRepository.findById(cartItem.item_id);
      const restaurant = await this.restaurantRepository.findById(cartItem.restaurant_id);

      const now = Math.floor(Date.now() / 1000);
      const itemCategories = menuItem.category || [];
      const applicablePromotions = restaurant.promotions?.filter((promotion) => {
        const isActive =
          promotion.status === 'ACTIVE' &&
          now >= Number(promotion.start_date) &&
          now <= Number(promotion.end_date);
        const hasMatchingCategory = promotion.food_categories?.some((fc) =>
          itemCategories.includes(fc.id)
        ) || false;
        return isActive && hasMatchingCategory;
      }) || [];

      const populatedVariants = await Promise.all(
        cartItem.variants.map(async (variant) => {
          const variantDetails = await this.menuItemVariantsRepository.findById(variant.variant_id);
          let priceAfterPromotion: number | null = null;

          if (applicablePromotions.length > 0) {
            applicablePromotions.forEach((promotion) => {
              const discountedPrice = this.calculateDiscountedPrice(
                variantDetails.price,
                promotion
              );
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
        })
      );

      return createResponse('OK', {
        ...cartItem,
        item: menuItem,
        variants: populatedVariants,
        restaurantDetails: restaurant,
      }, 'Fetched cart item successfully');
    } catch (error) {
      console.log('error', error);
      return createResponse('ServerError', null, 'An error occurred while fetching the cart item');
    }
  }

  async findOne(query: Record<string, any>): Promise<any> {
    try {
      const cartItem = await this.cartItemsRepository.findOne(query);
      if (!cartItem) {
        return createResponse('NotFound', null, 'Cart item not found');
      }

      const menuItem = await this.menuItemsRepository.findById(cartItem.item_id);
      const restaurant = await this.restaurantRepository.findById(cartItem.restaurant_id);

      const now = Math.floor(Date.now() / 1000);
      const itemCategories = menuItem.category || [];
      const applicablePromotions = restaurant.promotions?.filter((promotion) => {
        const isActive =
          promotion.status === 'ACTIVE' &&
          now >= Number(promotion.start_date) &&
          now <= Number(promotion.end_date);
        const hasMatchingCategory = promotion.food_categories?.some((fc) =>
          itemCategories.includes(fc.id)
        ) || false;
        return isActive && hasMatchingCategory;
      }) || [];

      const populatedVariants = await Promise.all(
        cartItem.variants.map(async (variant) => {
          const variantDetails = await this.menuItemVariantsRepository.findById(variant.variant_id);
          let priceAfterPromotion: number | null = null;

          if (applicablePromotions.length > 0) {
            applicablePromotions.forEach((promotion) => {
              const discountedPrice = this.calculateDiscountedPrice(
                variantDetails.price,
                promotion
              );
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
        })
      );

      return createResponse('OK', {
        ...cartItem,
        item: menuItem,
        variants: populatedVariants,
        restaurantDetails: restaurant,
      }, 'Fetched cart item successfully');
    } catch (error) {
      console.log('error', error);
      return createResponse('ServerError', null, 'An error occurred while fetching the cart item');
    }
  }

  async remove(id: string): Promise<any> {
    try {
      const deleted = await this.cartItemsRepository.remove(id);
      if (!deleted) {
        return createResponse('NotFound', null, 'Cart item not found');
      }
      return createResponse('OK', null, 'Cart item deleted successfully');
    } catch (error) {
      console.log('error', error);
      return createResponse('ServerError', null, 'An error occurred while deleting the cart item');
    }
  }

  private async populateVariants(variants: any[], promotions: Promotion[], menuItem: any) {
    const now = Math.floor(Date.now() / 1000);
    const itemCategories = menuItem.category || [];
  
    return Promise.all(
      variants.map(async (variant) => {
        const variantDetails = await this.menuItemVariantsRepository.findById(variant.variant_id);
        let priceToUse = variantDetails.price; // Giá gốc mặc định
  
        if (promotions && promotions.length > 0) {
          const applicablePromotions = promotions.filter((promotion) => {
            const isActive =
              promotion.status === 'ACTIVE' &&
              now >= Number(promotion.start_date) &&
              now <= Number(promotion.end_date);
            const hasMatchingCategory = promotion.food_categories?.some((fc) =>
              itemCategories.includes(fc.id)
            ) || false;
            return isActive && hasMatchingCategory;
          });
  
          if (applicablePromotions.length > 0) {
            let priceAfterPromotion: number | null = null;
            applicablePromotions.forEach((promotion) => {
              const discountedPrice = this.calculateDiscountedPrice(
                variantDetails.price,
                promotion
              );
              if (priceAfterPromotion === null || discountedPrice < priceAfterPromotion) {
                priceAfterPromotion = discountedPrice;
              }
            });
            if (priceAfterPromotion !== null) {
              priceToUse = priceAfterPromotion; // Dùng giá khuyến mãi nếu có
            }
          }
        }
  
        return {
          variant_id: variant.variant_id,
          variant_name: variantDetails.variant,
          variant_price_at_time_of_addition: priceToUse,
          quantity: variant.quantity,
        };
      })
    );
  }
  
  private async updateExistingCartItemVariants(
    existingCartItem: CartItem,
    newVariants: any[],
    promotions: Promotion[],
    menuItem: any
  ) {
    const updatedVariants = [...existingCartItem.variants];
    const now = Math.floor(Date.now() / 1000);
    const itemCategories = menuItem.category || [];
  
    for (const newVariant of newVariants) {
      const existingVariantIndex = updatedVariants.findIndex(
        (v) => v.variant_id === newVariant.variant_id
      );
  
      if (existingVariantIndex > -1) {
        updatedVariants[existingVariantIndex].quantity += newVariant.quantity;
  
        const variantDetails = await this.menuItemVariantsRepository.findById(newVariant.variant_id);
        let priceAfterPromotion: number | null = null;
  
        if (promotions && promotions.length > 0) {
          const applicablePromotions = promotions.filter((promotion) => {
            const isActive =
              promotion.status === 'ACTIVE' &&
              now >= Number(promotion.start_date) &&
              now <= Number(promotion.end_date);
            const hasMatchingCategory = promotion.food_categories?.some((fc) =>
              itemCategories.includes(fc.id)
            ) || false;
            return isActive && hasMatchingCategory;
          });
  
          if (applicablePromotions.length > 0) {
            applicablePromotions.forEach((promotion) => {
              const discountedPrice = this.calculateDiscountedPrice(
                variantDetails.price,
                promotion
              );
              if (priceAfterPromotion === null || discountedPrice < priceAfterPromotion) {
                priceAfterPromotion = discountedPrice;
              }
            });
            if (priceAfterPromotion !== null) {
              updatedVariants[existingVariantIndex].variant_price_at_time_of_addition = priceAfterPromotion;
            }
          }
        }
      } else {
        const variantDetails = await this.menuItemVariantsRepository.findById(newVariant.variant_id);
        let priceAfterPromotion: number | null = null;
  
        if (promotions && promotions.length > 0) {
          const applicablePromotions = promotions.filter((promotion) => {
            const isActive =
              promotion.status === 'ACTIVE' &&
              now >= Number(promotion.start_date) &&
              now <= Number(promotion.end_date);
            const hasMatchingCategory = promotion.food_categories?.some((fc) =>
              itemCategories.includes(fc.id)
            ) || false;
            return isActive && hasMatchingCategory;
          });
  
          if (applicablePromotions.length > 0) {
            applicablePromotions.forEach((promotion) => {
              const discountedPrice = this.calculateDiscountedPrice(
                variantDetails.price,
                promotion
              );
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
}