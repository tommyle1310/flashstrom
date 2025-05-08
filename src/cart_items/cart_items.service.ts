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

      console.log('Starting cart item creation:', { item_id, customer_id });

      const [menuItem, customer] = await Promise.all([
        this.menuItemsRepository.findById(item_id),
        this.customersRepository.findById(customer_id)
      ]);

      if (!menuItem || !customer) {
        console.log('MenuItem or Customer not found:', { menuItem, customer });
        return createResponse(
          'NotFound',
          null,
          'MenuItem or Customer not found'
        );
      }

      console.log('Fetched menuItem and customer successfully');

      const restaurant = await this.restaurantRepository.findById(
        menuItem.restaurant_id
      );
      if (!restaurant) {
        console.log('Restaurant not found:', menuItem.restaurant_id);
        return createResponse('NotFound', null, 'Restaurant not found');
      }

      console.log('Fetched restaurant successfully');

      const existingCartItem = await this.cartItemsRepository.findOne({
        where: { customer_id: Equal(customer_id), item_id: Equal(item_id) }
      });

      console.log('Checked existing cart item:', { existingCartItem });

      if (existingCartItem) {
        console.log('Updating existing cart item:', existingCartItem.id);
        const updatedVariants = await Promise.race([
          this.updateExistingCartItemVariants(
            existingCartItem,
            variants || [],
            restaurant.promotions || [],
            menuItem
          ),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('updateExistingCartItemVariants timeout')),
              5000
            )
          )
        ]);

        console.log('Updated variants:', updatedVariants);

        const updated = await this.cartItemsRepository.update(
          existingCartItem.id,
          {
            variants: updatedVariants as any,
            updated_at: Math.floor(Date.now() / 1000),
            item_id: existingCartItem.item_id,
            customer_id: existingCartItem.customer_id,
            restaurant_id: existingCartItem.restaurant_id
          }
        );

        console.log('Cart item updated:', updated);

        return createResponse(
          'OK',
          updated,
          'Cart item added quantity successfully'
        );
      }

      console.log('Creating new cart item');
      const populatedVariants = await Promise.race([
        this.populateVariants(
          variants || [],
          restaurant.promotions || [],
          menuItem
        ),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('populateVariants timeout')), 5000)
        )
      ]);

      console.log('Populated variants:', populatedVariants);

      const newCartItem = await this.cartItemsRepository.create({
        ...createCartItemDto,
        variants: populatedVariants as any,
        restaurant_id: menuItem.restaurant_id
      });

      console.log('Created new cart item:', newCartItem);

      return createResponse(
        'OK',
        newCartItem,
        'Cart item created successfully'
      );
    } catch (error: any) {
      console.error('Error creating cart item:', error);
      return createResponse(
        'ServerError',
        null,
        `Failed to create cart item: ${error.message}`
      );
    }
  }

  async update(id: string, updateCartItemDto: UpdateCartItemDto): Promise<any> {
    const { variants, item_id, customer_id, ...updateData } = updateCartItemDto;

    try {
      let menuItem = null;
      if (item_id) {
        menuItem = await this.menuItemsRepository.findById(item_id);
        if (!menuItem) {
          return createResponse(
            'NotFound',
            null,
            `MenuItem with ID ${item_id} not found`
          );
        }
      }

      if (customer_id) {
        const customer = await this.customersRepository.findById(customer_id);
        if (!customer) {
          return createResponse(
            'NotFound',
            null,
            `Customer with ID ${customer_id} not found`
          );
        }
      }

      const existingCartItem = await this.cartItemsRepository.findById(id);
      if (!existingCartItem) {
        return createResponse(
          'NotFound',
          null,
          `Cart item with ID ${id} not found`
        );
      }

      menuItem =
        menuItem ||
        (await this.menuItemsRepository.findById(existingCartItem.item_id));
      const restaurant = await this.restaurantRepository.findById(
        existingCartItem.restaurant_id
      );
      if (!restaurant) {
        return createResponse('NotFound', null, 'Restaurant not found');
      }

      const updatedVariants = variants
        ? await this.populateVariants(
            variants,
            restaurant.promotions || [],
            menuItem
          )
        : existingCartItem.variants;

      const updatedCartItem = await this.cartItemsRepository.update(id, {
        ...updateData,
        updated_at: Math.floor(Date.now() / 1000),
        item_id: existingCartItem.item_id,
        customer_id: existingCartItem.customer_id,
        variants: updatedVariants
      });

      return createResponse(
        'OK',
        updatedCartItem,
        'Cart item updated successfully'
      );
    } catch (error: any) {
      console.error('Error updating cart item:', error);
      return createResponse(
        'ServerError',
        null,
        `Failed to update cart item: ${error.message}`
      );
    }
  }

  async findAll(query: Record<string, any> = {}): Promise<any> {
    try {
      const cartItems = await this.cartItemsRepository.findAll(query);

      const populatedCartItems = await Promise.all(
        cartItems.map(async cartItem => {
          const menuItem = await this.menuItemsRepository.findById(
            cartItem.item_id
          );
          if (!menuItem) {
            return createResponse(
              'NotFound',
              null,
              `MenuItem with ID ${cartItem.item_id} not found`
            );
          }

          const restaurant = await this.restaurantRepository.findById(
            cartItem.restaurant_id
          );
          if (!restaurant) {
            return createResponse(
              'NotFound',
              null,
              `Restaurant with ID ${cartItem.restaurant_id} not found`
            );
          }

          const now = Math.floor(Date.now() / 1000);
          const itemCategories = menuItem.category || [];
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
              return isActive && hasMatchingCategory;
            }) || [];

          const populatedVariants = await Promise.all(
            cartItem.variants.map(async variant => {
              const variantDetails =
                await this.menuItemVariantsRepository.findById(
                  variant.variant_id
                );
              if (!variantDetails) {
                return {
                  variant_id: variant.variant_id,
                  variant_name: 'Unknown',
                  variant_price_at_time_of_addition: 0,
                  quantity: variant.quantity,
                  price_after_applied_promotion: null
                };
              }

              let priceAfterPromotion: number | null = null;
              if (applicablePromotions.length > 0) {
                applicablePromotions.forEach(promotion => {
                  const discountedPrice = this.calculateDiscountedPrice(
                    variantDetails.price,
                    promotion
                  );
                  if (
                    priceAfterPromotion === null ||
                    discountedPrice < priceAfterPromotion
                  ) {
                    priceAfterPromotion = discountedPrice;
                  }
                });
              }

              return {
                variant_id: variant.variant_id,
                variant_name: variantDetails.variant,
                variant_price_at_time_of_addition: variantDetails.price,
                quantity: variant.quantity,
                price_after_applied_promotion: priceAfterPromotion
              };
            })
          );

          return {
            ...cartItem,
            item: menuItem,
            variants: populatedVariants,
            restaurantDetails: restaurant
          };
        })
      );

      return createResponse(
        'OK',
        populatedCartItems,
        'Cart items fetched successfully'
      );
    } catch (error: any) {
      console.error('Error fetching cart items:', error);
      return createResponse(
        'ServerError',
        null,
        `Failed to fetch cart items: ${error.message}`
      );
    }
  }

  async findById(id: string): Promise<any> {
    try {
      const cartItem = await this.cartItemsRepository.findById(id);
      if (!cartItem) {
        return createResponse('NotFound', null, 'Cart item not found');
      }

      const menuItem = await this.menuItemsRepository.findById(
        cartItem.item_id
      );
      const restaurant = await this.restaurantRepository.findById(
        cartItem.restaurant_id
      );

      const now = Math.floor(Date.now() / 1000);
      const itemCategories = menuItem.category || [];
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
          return isActive && hasMatchingCategory;
        }) || [];

      const populatedVariants = await Promise.all(
        cartItem.variants.map(async variant => {
          const variantDetails = await this.menuItemVariantsRepository.findById(
            variant.variant_id
          );
          if (!variantDetails) {
            return {
              variant_id: variant.variant_id,
              variant_name: 'Unknown',
              variant_price_at_time_of_addition: 0,
              quantity: variant.quantity,
              price_after_applied_promotion: null
            };
          }

          let priceAfterPromotion: number | null = null;
          if (applicablePromotions.length > 0) {
            applicablePromotions.forEach(promotion => {
              const discountedPrice = this.calculateDiscountedPrice(
                variantDetails.price,
                promotion
              );
              if (
                priceAfterPromotion === null ||
                discountedPrice < priceAfterPromotion
              ) {
                priceAfterPromotion = discountedPrice;
              }
            });
          }

          return {
            variant_id: variant.variant_id,
            variant_name: variantDetails.variant,
            variant_price_at_time_of_addition: variantDetails.price,
            quantity: variant.quantity,
            price_after_applied_promotion: priceAfterPromotion
          };
        })
      );

      return createResponse(
        'OK',
        {
          ...cartItem,
          item: menuItem,
          variants: populatedVariants,
          restaurantDetails: restaurant
        },
        'Fetched cart item successfully'
      );
    } catch (error: any) {
      console.error('Error fetching cart item:', error);
      return createResponse(
        'ServerError',
        null,
        `Failed to fetch cart item: ${error.message}`
      );
    }
  }

  async findOne(query: Record<string, any>): Promise<any> {
    try {
      const cartItem = await this.cartItemsRepository.findOne(query);
      if (!cartItem) {
        return createResponse('NotFound', null, 'Cart item not found');
      }

      const menuItem = await this.menuItemsRepository.findById(
        cartItem.item_id
      );
      const restaurant = await this.restaurantRepository.findById(
        cartItem.restaurant_id
      );

      const now = Math.floor(Date.now() / 1000);
      const itemCategories = menuItem.category || [];
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
          return isActive && hasMatchingCategory;
        }) || [];

      const populatedVariants = await Promise.all(
        cartItem.variants.map(async variant => {
          const variantDetails = await this.menuItemVariantsRepository.findById(
            variant.variant_id
          );
          if (!variantDetails) {
            return {
              variant_id: variant.variant_id,
              variant_name: 'Unknown',
              variant_price_at_time_of_addition: 0,
              quantity: variant.quantity,
              price_after_applied_promotion: null
            };
          }

          let priceAfterPromotion: number | null = null;
          if (applicablePromotions.length > 0) {
            applicablePromotions.forEach(promotion => {
              const discountedPrice = this.calculateDiscountedPrice(
                variantDetails.price,
                promotion
              );
              if (
                priceAfterPromotion === null ||
                discountedPrice < priceAfterPromotion
              ) {
                priceAfterPromotion = discountedPrice;
              }
            });
          }

          return {
            variant_id: variant.variant_id,
            variant_name: variantDetails.variant,
            variant_price_at_time_of_addition: variantDetails.price,
            quantity: variant.quantity,
            price_after_applied_promotion: priceAfterPromotion
          };
        })
      );

      return createResponse(
        'OK',
        {
          ...cartItem,
          item: menuItem,
          variants: populatedVariants,
          restaurantDetails: restaurant
        },
        'Fetched cart item successfully'
      );
    } catch (error: any) {
      console.error('Error fetching cart item:', error);
      return createResponse(
        'ServerError',
        null,
        `Failed to fetch cart item: ${error.message}`
      );
    }
  }

  async remove(id: string): Promise<any> {
    try {
      const deleted = await this.cartItemsRepository.remove(id);
      if (!deleted) {
        return createResponse('NotFound', null, 'Cart item not found');
      }
      return createResponse('OK', null, 'Cart item deleted successfully');
    } catch (error: any) {
      console.error('Error deleting cart item:', error);
      return createResponse(
        'ServerError',
        null,
        `Failed to delete cart item: ${error.message}`
      );
    }
  }

  private async populateVariants(
    variants: { variant_id: string; quantity: number }[],
    promotions: Promotion[],
    menuItem: any
  ) {
    const now = Math.floor(Date.now() / 1000);
    const itemCategories = menuItem.category || [];

    return Promise.all(
      variants.map(async variant => {
        const variantDetails = await this.menuItemVariantsRepository.findById(
          variant.variant_id
        );
        if (!variantDetails) {
          console.warn(`Variant not found: ${variant.variant_id}`);
          throw new Error(`Variant with ID ${variant.variant_id} not found`);
        }

        let priceToUse = variantDetails.price;

        if (promotions?.length > 0) {
          const applicablePromotions = promotions.filter(promotion => {
            const isActive =
              promotion.status === 'ACTIVE' &&
              now >= Number(promotion.start_date) &&
              now <= Number(promotion.end_date);
            const hasMatchingCategory =
              promotion.food_category_ids?.some(categoryId =>
                itemCategories.includes(categoryId)
              ) || false;
            return isActive && hasMatchingCategory;
          });

          if (applicablePromotions.length > 0) {
            let priceAfterPromotion: number | null = null;
            applicablePromotions.forEach(promotion => {
              const discountedPrice = this.calculateDiscountedPrice(
                variantDetails.price,
                promotion
              );
              if (
                priceAfterPromotion === null ||
                discountedPrice < priceAfterPromotion
              ) {
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
          quantity: variant.quantity
        };
      })
    );
  }

  private async updateExistingCartItemVariants(
    existingCartItem: CartItem,
    newVariants: { variant_id: string; quantity: number }[],
    promotions: Promotion[],
    menuItem: any
  ) {
    const updatedVariants = [...existingCartItem.variants];
    const now = Math.floor(Date.now() / 1000);
    const itemCategories = menuItem.category || [];

    for (const newVariant of newVariants) {
      const existingVariantIndex = updatedVariants.findIndex(
        v => v.variant_id === newVariant.variant_id
      );

      const variantDetails = await this.menuItemVariantsRepository.findById(
        newVariant.variant_id
      );
      if (!variantDetails) {
        console.warn(`Variant not found: ${newVariant.variant_id}`);
        throw new Error(`Variant with ID ${newVariant.variant_id} not found`);
      }

      let priceToUse = variantDetails.price;

      if (promotions?.length > 0) {
        const applicablePromotions = promotions.filter(promotion => {
          const isActive =
            promotion.status === 'ACTIVE' &&
            now >= Number(promotion.start_date) &&
            now <= Number(promotion.end_date);
          const hasMatchingCategory =
            promotion.food_category_ids?.some(categoryId =>
              itemCategories.includes(categoryId)
            ) || false;
          return isActive && hasMatchingCategory;
        });

        if (applicablePromotions.length > 0) {
          let priceAfterPromotion: number | null = null;
          applicablePromotions.forEach(promotion => {
            const discountedPrice = this.calculateDiscountedPrice(
              variantDetails.price,
              promotion
            );
            if (
              priceAfterPromotion === null ||
              discountedPrice < priceAfterPromotion
            ) {
              priceAfterPromotion = discountedPrice;
            }
          });
          if (priceAfterPromotion !== null) {
            priceToUse = priceAfterPromotion;
          }
        }
      }

      if (existingVariantIndex > -1) {
        updatedVariants[existingVariantIndex].quantity += newVariant.quantity;
        updatedVariants[
          existingVariantIndex
        ].variant_price_at_time_of_addition = priceToUse;
      } else {
        updatedVariants.push({
          variant_id: newVariant.variant_id,
          variant_name: variantDetails.variant,
          variant_price_at_time_of_addition: priceToUse,
          quantity: newVariant.quantity
        });
      }
    }

    return updatedVariants;
  }
}
