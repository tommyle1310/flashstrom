import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateCartItemDto } from './dto/create-cart_item.dto';
import { UpdateCartItemDto } from './dto/update-cart_item.dto';
import { CartItem } from './cart_items.schema'; // Assuming the CartItem schema is defined like the one we discussed
import { createResponse } from 'src/utils/createResponse'; // Utility for creating responses
import { Customer } from 'src/customers/customer.schema';
import { MenuItem } from 'src/menu_items/menu_items.schema';
import { MenuItemVariant } from 'src/menu_item_variants/menu_item_variants.schema';
import { Restaurant } from 'src/restaurants/restaurants.schema';

@Injectable()
export class CartItemsService {
  constructor(
    @InjectModel('CartItem')
    private readonly cartItemModel: Model<CartItem>,
    @InjectModel('Restaurant')
    private readonly restaurantModel: Model<Restaurant>,
    @InjectModel('MenuItemVariant')
    private readonly menuItemVariantModel: Model<MenuItemVariant>,
    @InjectModel('Customer')
    private readonly customerModel: Model<Customer>,
    @InjectModel('MenuItem')
    private readonly menuItemModel: Model<MenuItem>,
  ) {}

  async create(createCartItemDto: CreateCartItemDto): Promise<any> {
    const { variants, item_id, customer_id, ...cartItemData } =
      createCartItemDto;
    // Ensure required fields are present
    console.log('check req', createCartItemDto);

    if (!item_id || !customer_id) {
      return createResponse(
        'MissingInput',
        null,
        'Item ID and Customer ID are required',
      );
    }

    // Check if MenuItem exists
    const menuItem = await this.menuItemModel.findById(item_id);
    if (!menuItem) {
      return createResponse(
        'NotFound',
        null,
        `MenuItem with ID ${item_id} not found`,
      );
    }

    // Check if Customer exists
    const customer = await this.customerModel.findById(customer_id);
    if (!customer) {
      return createResponse(
        'NotFound',
        null,
        `Customer with ID ${customer_id} not found`,
      );
    }

    // Check if a cart item already exists for the same customer and item
    let existingCartItem = await this.cartItemModel.findOne({
      customer_id,
      item_id,
    });

    if (existingCartItem) {
      // Iterate over existing variants and update their quantity or add new variants
      for (let i = 0; i < variants.length; i++) {
        const newVariant = variants[i];

        // Find the existing variant in the cart item
        const existingVariant = existingCartItem.variants.find(
          (variant) => variant.variant_id === newVariant.variant_id,
        );

        if (existingVariant) {
          // If the variant exists, update the quantity
          existingVariant.quantity += +newVariant.quantity;
        } else {
          // If the variant doesn't exist, fetch variant details and add it to the cart
          const variantDetails = await this.menuItemVariantModel.findById(
            newVariant.variant_id,
          );
          if (variantDetails) {
            existingCartItem.variants.push({
              variant_id: `${newVariant.variant_id}`,
              variant_name: variantDetails.variant,
              variant_price_at_time_of_addition: variantDetails.price, // Store price at time of addition
              quantity: +newVariant.quantity,
            });
          } else {
            return createResponse(
              'NotFound',
              null,
              `Variant with ID ${newVariant.variant_id} not found`,
            );
          }
        }
      }

      // Update the modified timestamp
      existingCartItem.updated_at = Math.floor(Date.now() / 1000);

      // Save the updated cart item
      await existingCartItem.save();

      return createResponse(
        'OK',
        existingCartItem,
        'Cart item updated successfully',
      );
    }

    // If no existing cart item, create a new one
    const populatedVariants = await Promise.all(
      variants.map(async (variant) => {
        const variantDetails = await this.menuItemVariantModel.findById(
          variant.variant_id,
        );
        if (!variantDetails) {
          return createResponse(
            'NotFound',
            null,
            `Variant with ID ${variant.variant_id} not found`,
          );
        }
        return {
          variant_id: variant.variant_id,
          variant_name: variantDetails.variant, // Add variant name
          variant_price_at_time_of_addition: variantDetails.price, // Add price
          quantity: variant.quantity,
        };
      }),
    );

    // Create the cart item
    const newCartItem = new this.cartItemModel({
      ...cartItemData,
      item_id,
      customer_id,
      variants: populatedVariants,
      created_at: Math.floor(Date.now() / 1000),
      updated_at: Math.floor(Date.now() / 1000),
    });

    await newCartItem.save();
    return createResponse('OK', newCartItem, 'Cart item created successfully');
  }

  async update(id: string, updateCartItemDto: UpdateCartItemDto): Promise<any> {
    const { variants, item_id, customer_id, ...updateData } = updateCartItemDto;

    try {
      // Check if MenuItem exists
      if (item_id) {
        const menuItem = await this.menuItemModel.findById(item_id);
        if (!menuItem) {
          return createResponse(
            'NotFound',
            null,
            `MenuItem with ID ${item_id} not found`,
          );
        }
      }

      // Check if Customer exists
      if (customer_id) {
        const customer = await this.customerModel.findById(customer_id);
        if (!customer) {
          return createResponse(
            'NotFound',
            null,
            `Customer with ID ${customer_id} not found`,
          );
        }
      }

      if (variants) {
        // Populate variants
        const populatedVariants = await Promise.all(
          variants.map(async (variant) => {
            const variantDetails = await this.menuItemVariantModel.findById(
              variant.variant_id,
            );
            if (!variantDetails) {
              return createResponse(
                'NotFound',
                null,
                `Variant with ID ${variant.variant_id} not found`,
              );
            }
            return {
              ...variant,
              variant_name: variantDetails.variant,
            };
          }),
        );
        (updateData as any).variants = populatedVariants;
      }
      console.log('check update data', updateData);

      // Update the cart item
      const updatedCartItem = await this.cartItemModel.findByIdAndUpdate(
        id,
        { variants, item_id, customer_id, ...updateData },
        { new: true },
      );

      if (!updatedCartItem) {
        return createResponse(
          'NotFound',
          null,
          `Cart item with ID ${id} not found`,
        );
      }

      return createResponse(
        'OK',
        { variants, item_id, customer_id, ...updateData },
        'Cart item updated successfully',
      );
    } catch (error) {
      return createResponse('ServerError', null, 'Failed to update cart item');
    }
  }

  async findAll(query: Record<string, any> = {}): Promise<any> {
    const cartItems = await this.cartItemModel
      .find()
      // .populate('item_id')
      .exec();
    console.log('check cart item', cartItems);

    // Populate variant names for all cart items
    const populatedCartItems = await Promise.all(
      cartItems.map(async (cartItem) => {
        // Convert the cart item document to a plain object
        const cartItemObj = cartItem.toObject();

        // Map over the variants and populate their names
        const populatedVariants = await Promise.all(
          cartItemObj.variants.map(async (variant) => {
            const variantDetails = await this.menuItemVariantModel.findById(
              variant.variant_id,
            );
            return {
              ...variant,
              variant_name: variantDetails ? variantDetails.variant : 'Unknown',
            };
          }),
        );

        // Replace the variants with populated ones
        cartItemObj.variants = populatedVariants;

        return cartItemObj;
      }),
    );

    // console.log('Check cart items:', populatedCartItems);

    // Transform the cart items to add the item_id as item
    const transformedCartItems = populatedCartItems.map((cartItem) => {
      const { item_id, ...rest } = cartItem;
      return {
        ...rest,
        item: item_id, // Adding item_id as item
      };
    });

    // Fetch restaurant details for each cart item and include them inside the item
    const finalResult = await Promise.all(
      transformedCartItems.map(async (item) => {
        // Fetch the item object using the item_id (which is the item reference)
        const menuItem = await this.menuItemModel.findById(item.item);
        // console.log('cehck here', item, 'and check here', menuItem);

        if (!menuItem) {
          return createResponse('NotFound', null, 'Menu item not found');
        }

        const itemObj = menuItem as { restaurant_id: string };
        const restaurantDetails = await this.restaurantModel.findById(
          itemObj.restaurant_id,
        );

        return {
          ...item,
          item: {
            ...menuItem.toObject(), // Now spread the full item object here
            restaurantDetails, // Add restaurantDetails inside the item object
          },
        };
      }),
    );

    return createResponse(
      'OK',
      finalResult, // Return the final result with restaurant details
      'Cart items fetched successfully',
    );
  }

  // Get a cart item by ID
  async findById(id: string): Promise<any> {
    try {
      // Find the cart item by ID and populate restaurant and item
      const cartItem = await this.cartItemModel
        .findById(id)
        .populate(
          'restaurant_id', // Populate the 'restaurant_id'
          '-promotions -contact_email -contact_phone -created_at -updated_at -description -images-gallery -specialize_in',
        )
        .populate('item_id', '-created_at -updated_at -restaurant_id -_id') // Populate the 'item_id'
        .exec();

      if (!cartItem) {
        return createResponse('NotFound', null, 'Cart item not found');
      }

      // Transform the cart item by renaming 'restaurant_id' to 'restaurant' and moving 'item_id' to 'item'
      const { restaurant_id, item_id, ...rest } = cartItem.toObject(); // Extract restaurant_id and item_id

      const transformedCartItem = {
        ...rest,
        restaurant: restaurant_id, // Rename restaurant_id to restaurant
        item: item_id, // Move item_id to item
        item_id: cartItem._id, // Add the _id of the cart item as item_id at the top level
      };

      return createResponse(
        'OK',
        transformedCartItem,
        'Fetched cart item successfully',
      );
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while fetching the cart item',
      );
    }
  }

  async findOne(query: Record<string, any>): Promise<any> {
    try {
      const cartItem = await this.cartItemModel.findOne(query).exec();

      if (!cartItem) {
        return createResponse('NotFound', null, 'Cart item not found');
      }

      return createResponse('OK', cartItem, 'Fetched cart item successfully');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while fetching the cart item',
      );
    }
  }

  // Update a cart item by ID

  // Delete a cart item by ID
  async remove(id: string): Promise<any> {
    const deletedCartItem = await this.cartItemModel
      .findByIdAndDelete(id)
      .exec();

    if (!deletedCartItem) {
      return createResponse('NotFound', null, 'Cart item not found');
    }

    try {
      return createResponse('OK', null, 'Cart item deleted successfully');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while deleting the cart item',
      );
    }
  }
}
