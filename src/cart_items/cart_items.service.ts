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
    let {
      customer_id,
      item_id,
      quantity,
      price_at_time_of_addition,
      variant_id,
      restaurant_id,
    } = createCartItemDto;

    // Check if the restaurant exists
    if (restaurant_id) {
      const RestaurantModel = await this.restaurantModel
        .findById(restaurant_id)
        .exec();
      if (!RestaurantModel) {
        return createResponse('NotFound', null, 'This restaurant not found.');
      }
    }

    // Check if the variant_id is provided and update the price accordingly
    if (variant_id) {
      const variantModel = await this.menuItemVariantModel
        .findById(variant_id) // Correctly find by variant_id
        .exec();
      if (!variantModel) {
        return createResponse('NotFound', null, 'This variant not found.');
      }
      price_at_time_of_addition = variantModel.price; // Set price from the variant
    } else {
      // If no variant is provided, fetch the menu item price
      const menuItemModel = await this.menuItemModel.findById(item_id).exec();
      if (!menuItemModel) {
        return createResponse('NotFound', null, 'This menu item not found.');
      }
      price_at_time_of_addition = menuItemModel.price; // Set price from the menu item
      restaurant_id = menuItemModel.restaurant_id; // Assign restaurant_id from the menu item
    }

    // Multiply price_at_time_of_addition by quantity to get the total price at the time of addition
    const total_price_at_time_of_addition =
      +price_at_time_of_addition * +quantity;

    // Check if the customer exists
    const CustomerModel = await this.customerModel.findById(customer_id).exec();
    if (!CustomerModel) {
      return createResponse('NotFound', null, 'This customer not found.');
    }

    // Check if the cart item already exists for the customer and item
    const existingCartItem = await this.cartItemModel
      .findOne({ customer_id, item_id })
      .exec();

    if (existingCartItem) {
      // If it exists, update the quantity by adding the new quantity to the old one
      existingCartItem.quantity += +quantity;

      // Add the new price to the existing total price
      existingCartItem.price_at_time_of_addition +=
        total_price_at_time_of_addition;

      existingCartItem.updated_at = new Date().getTime(); // Update the timestamp

      // Save the updated cart item
      await existingCartItem.save();
      return createResponse(
        'OK',
        existingCartItem,
        'Cart item quantity updated successfully',
      );
    }

    // If it doesn't exist, create a new cart item
    const newCartItem = new this.cartItemModel({
      customer_id,
      item_id,
      restaurant_id, // Include restaurant_id here
      quantity,
      price_at_time_of_addition: total_price_at_time_of_addition, // Set the total price
      created_at: new Date().getTime(),
      updated_at: new Date().getTime(),
    });

    // Save the new cart item
    const result = await newCartItem.save();
    let finalData;
    if (result) {
      finalData = await this.findById(newCartItem._id as string);
    }

    return createResponse('OK', finalData.data, 'Cart item added successfully');
  }

  async update(id: string, updateCartItemDto: UpdateCartItemDto): Promise<any> {
    const { customer_id, item_id, variant_id, quantity, restaurant_id } =
      updateCartItemDto;

    // Check if the customer exists
    if (customer_id) {
      const CustomerModel = await this.customerModel
        .findById(customer_id)
        .exec();
      if (!CustomerModel) {
        return createResponse('NotFound', null, 'This customer not found.');
      }
    }

    let existingRestaurant;
    // Check if the menu item exists
    if (item_id) {
      const existingMenuItem = await this.menuItemModel
        .findById(item_id)
        .populate('restaurant_id')
        .exec();
      if (!existingMenuItem) {
        return createResponse('NotFound', null, 'This menu item not found.');
      }
      existingRestaurant = existingMenuItem;

      // Set the price based on the variant or menu item
      if (variant_id) {
        // Check if variant_id is provided and get the variant price
        const variantModel = await this.menuItemVariantModel
          .findById(variant_id)
          .exec();
        if (!variantModel) {
          return createResponse('NotFound', null, 'This variant not found.');
        }

        // Update the price to the variant price
        updateCartItemDto.price_at_time_of_addition = variantModel.price;
      } else {
        // If no variant_id is provided, use the menu item price
        updateCartItemDto.price_at_time_of_addition = existingMenuItem.price;
      }
    }

    // Multiply price_at_time_of_addition by quantity to get the total price at the time of update
    const total_price_at_time_of_addition =
      +updateCartItemDto.price_at_time_of_addition * +quantity;
    updateCartItemDto.price_at_time_of_addition =
      total_price_at_time_of_addition;
    updateCartItemDto.restaurant_id = existingRestaurant.restaurant_id;

    // Update the cart item with the provided data
    const updatedCartItem = await this.cartItemModel
      .findByIdAndUpdate(id, updateCartItemDto, { new: true })
      .exec();

    if (!updatedCartItem) {
      return createResponse('NotFound', null, 'Cart item not found');
    }

    try {
      return createResponse(
        'OK',
        updatedCartItem,
        'Cart item updated successfully',
      );
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while updating the cart item',
      );
    }
  }

  // Get all cart items
  async findAll(query: Record<string, any> = {}): Promise<any> {
    try {
      // Use the query object to filter the results if provided
      const cartItems = await this.cartItemModel
        .find(query)
        .populate(
          'restaurant_id', // Keep 'restaurant_id' to populate it
          '-promotions -contact_email -contact_phone -created_at -updated_at -description -images-gallery -specialize_in -address',
        )
        .populate('item_id', '-created_at -updated_at -restaurant_id -_id') // Populate item_id
        .exec();

      if (cartItems.length === 0) {
        return createResponse(
          'NotFound',
          null,
          'No cart items found matching the criteria',
        );
      }

      // Change 'restaurant_id' to 'restaurant' and move the 'item_id' content to 'item'
      const transformedCartItems = cartItems.map((item) => {
        const { restaurant_id, item_id, ...rest } = item.toObject(); // Extract restaurant_id and item_id

        return {
          ...rest,
          restaurant: restaurant_id, // Rename restaurant_id to restaurant
          item: item_id, // Move item_id to item
          item_id: item._id, // Add the _id of the cart item as item_id at the top level
        };
      });

      return createResponse(
        'OK',
        transformedCartItems,
        'Fetched cart items successfully',
      );
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while fetching cart items',
      );
    }
  }

  // Get a cart item by ID
  // Get a cart item by ID
  async findById(id: string): Promise<any> {
    try {
      // Find the cart item by ID and populate restaurant and item
      const cartItem = await this.cartItemModel
        .findById(id)
        .populate(
          'restaurant_id', // Populate the 'restaurant_id'
          '-promotions -contact_email -contact_phone -created_at -updated_at -description -images-gallery -specialize_in -address',
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
