import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MenuItem } from './menu_items.schema'; // Assuming MenuItem schema is similar to the one we've defined earlier
import { createResponse } from 'src/utils/createResponse'; // Utility for creating responses
import { CreateMenuItemDto } from './dto/create-menu_item.dto';
import { UpdateMenuItemDto } from './dto/update-menu_item.dto';
import { Restaurant } from 'src/restaurants/restaurants.schema';
import { helpers } from 'handlebars';
import { FoodCategory } from 'src/food_categories/food_categories.schema';

@Injectable()
export class MenuItemsService {
  constructor(
    @InjectModel('MenuItem') private readonly menuItemModel: Model<MenuItem>,
    @InjectModel('Restaurant')
    private readonly restaurantModel: Model<Restaurant>,
    @InjectModel('FoodCategory')
    private readonly foodCategoryModel: Model<FoodCategory>,
  ) {}

  // Create a new menu item
  async create(createMenuItemDto: CreateMenuItemDto): Promise<any> {
    const {
      restaurant_id,
      name,
      description,
      category,
      avatar,
      availability,
      suggest_notes,
      variants,
    } = createMenuItemDto;

    // Check if the restaurant exists
    const existingRestaurant = await this.restaurantModel
      .findById(restaurant_id)
      .exec();
    if (!existingRestaurant) {
      return createResponse('NotFound', null, 'Restaurant not found');
    }

    // Check if each food category exists
    for (const categoryId of category) {
      const existingFoodCategory = await this.foodCategoryModel
        .findById(categoryId)
        .exec();
      if (!existingFoodCategory) {
        return createResponse(
          'NotFound',
          null,
          `Food Category with ID ${categoryId} not found`,
        );
      }
    }

    // Check if the menu item already exists by name and restaurant_id
    const existingMenuItem = await this.menuItemModel
      .findOne({ name, restaurant_id })
      .exec();
    if (existingMenuItem) {
      return createResponse(
        'DuplicatedRecord',
        null,
        'Menu Item with this name already exists in this restaurant',
      );
    }

    // Create the new menu item
    const newMenuItem = new this.menuItemModel({
      restaurant_id,
      name,
      description,
      category,
      avatar,
      availability,
      suggest_notes,
      variants,
      created_at: new Date().getTime(),
      updated_at: new Date().getTime(),
    });

    // Save the menu item and return the success response
    await newMenuItem.save();
    return createResponse('OK', newMenuItem, 'Menu Item created successfully');
  }

  // Get all menu items
  // Fetch all menu items with populated category and variants
  async findAll(): Promise<any> {
    try {
      // Find all menu items and populate category and variants
      const menuItems = await this.menuItemModel
        .find()
        .populate('category') // Populate category with full category document
        .populate('variants') // Populate variants with full variant documents
        .exec();

      return createResponse('OK', menuItems, 'Fetched all menu items');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while fetching menu items',
      );
    }
  }

  // Get a menu item by ID
  async findOne(id: string): Promise<any> {
    const menuItem = await this.menuItemModel.findById(id).exec();
    if (!menuItem) {
      return createResponse('NotFound', null, 'Menu Item not found');
    }

    try {
      return createResponse('OK', menuItem, 'Fetched menu item successfully');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while fetching the menu item',
      );
    }
  }

  // Update a menu item by ID
  async update(id: string, updateMenuItemDto: UpdateMenuItemDto): Promise<any> {
    const updatedMenuItem = await this.menuItemModel
      .findByIdAndUpdate(id, updateMenuItemDto, { new: true })
      .exec();

    if (!updatedMenuItem) {
      return createResponse('NotFound', null, 'Menu Item not found');
    }

    try {
      return createResponse(
        'OK',
        updatedMenuItem,
        'Menu Item updated successfully',
      );
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while updating the menu item',
      );
    }
  }

  // Delete a menu item by ID
  async remove(id: string): Promise<any> {
    const deletedMenuItem = await this.menuItemModel
      .findByIdAndDelete(id)
      .exec();

    if (!deletedMenuItem) {
      return createResponse('NotFound', null, 'Menu Item not found');
    }

    try {
      return createResponse('OK', null, 'Menu Item deleted successfully');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while deleting the menu item',
      );
    }
  }

  async updateEntityAvatar(
    uploadResult: { url: string; public_id: string },
    menuItemId: string,
  ) {
    // Update the menu item's avatar in the database
    const menuItem = await this.menuItemModel.findByIdAndUpdate(
      menuItemId, // Identify the menu item by its ID
      {
        avatar: { url: uploadResult.url, key: uploadResult.public_id }, // Update the avatar field
      },
      { new: true }, // Return the updated document
    );

    // If the menu item is not found, return an error response
    if (!menuItem) {
      return createResponse('NotFound', null, 'Menu item not found');
    }

    // Return a success response with the updated menu item
    return createResponse(
      'OK',
      menuItem,
      'Menu item avatar updated successfully',
    );
  }
}
