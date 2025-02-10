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
import { MenuItemVariantsService } from 'src/menu_item_variants/menu_item_variants.service';
import { UpdateMenuItemVariantDto } from 'src/menu_item_variants/dto/update-menu_item_variant.dto';
import { MenuItemVariant } from 'src/menu_item_variants/menu_item_variants.schema';

@Injectable()
export class MenuItemsService {
  constructor(
    @InjectModel('MenuItem') private readonly menuItemModel: Model<MenuItem>,
    // @InjectModel('MenuItemVariant') private readonly menuItemVariantModel: Model<MenuItemVariant>,
    @InjectModel('Restaurant')
    private readonly restaurantModel: Model<Restaurant>,
    @InjectModel('FoodCategory')
    private readonly foodCategoryModel: Model<FoodCategory>,
    private readonly menuItemVariantsService: MenuItemVariantsService,
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
      discount,
    } = createMenuItemDto;

    // Check if the restaurant exists
    const existingRestaurant = await this.restaurantModel
      .findById(restaurant_id)
      .exec();
    if (!existingRestaurant) {
      return createResponse('NotFound', null, 'Restaurant not found');
    }
    console.log('check variant', variants);

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

    let variantIds = [];
    let createdVariants = []; // Track newly created variants

    // If the menu item already exists
    if (existingMenuItem) {
      // Handle existing menu item update with new variants
      for (const variant of variants) {
        const existingVariant =
          await this.menuItemVariantsService.findOneByDetails(
            variant.price,
            variant.description,
            existingMenuItem._id.toString(),
          );

        if (!existingVariant) {
          const newVariantData = {
            menu_id: existingMenuItem._id.toString(),
            variant: variant.description || '',
            price: variant.price,
            description: variant.description,
            avatar: existingMenuItem.avatar || { url: '', key: '' },
            availability: true,
            default_restaurant_notes: [],
            discount_rate: 0,
          };

          const newVariant =
            await this.menuItemVariantsService.create(newVariantData);
          createdVariants.push(newVariant); // Save the created variant
          variantIds.push(newVariant._id);
        } else {
          variantIds.push(existingVariant._id);
          const stringExistingVariantId = existingVariant._id as string;
          const variantExistsInMenuItem = existingMenuItem.variants.includes(
            stringExistingVariantId,
          );
          if (variantExistsInMenuItem) {
            return createResponse(
              'DuplicatedRecord',
              null,
              `Variant with ID ${existingVariant._id} already exists for this menu item`,
            );
          }
        }
      }

      existingMenuItem.variants.push(...variantIds);

      // Update the discount if provided
      if (discount) {
        existingMenuItem.discount = discount;
      }

      await existingMenuItem.save();

      return createResponse(
        'OK',
        {
          ...existingMenuItem,
          variants: [...existingMenuItem.variants, ...createdVariants],
        }, // Return both existing and newly created variants
        'Menu Item and variants updated successfully',
      );
    }

    // Create a new menu item
    const newMenuItem = new this.menuItemModel({
      restaurant_id,
      name,
      description,
      category,
      avatar,
      availability,
      suggest_notes,
      variants: variantIds,
      created_at: new Date().getTime(),
      updated_at: new Date().getTime(),
      discount, // Add discount here if present
    });

    // Save the new menu item
    await newMenuItem.save();

    // Handle the variants: create any missing variants and associate them with the menu item
    for (const variant of variants) {
      const existingVariant =
        await this.menuItemVariantsService.findOneByDetails(
          variant.price,
          variant.description,
          newMenuItem._id.toString(),
        );

      if (!existingVariant) {
        const newVariantData = {
          menu_id: newMenuItem._id.toString(),
          variant: variant.description || '',
          price: variant.price,
          description: variant.description,
          avatar: newMenuItem.avatar || { key: '', url: '' },
          availability: true,
          default_restaurant_notes: [],
          discount_rate: 0,
        };

        const newVariant =
          await this.menuItemVariantsService.create(newVariantData);
        createdVariants.push(newVariant.data); // Track created variant
      } else {
        if (!existingVariant.menu_id) {
          existingVariant.menu_id = newMenuItem._id.toString();
          await existingVariant.save();
        }
      }
    }

    // Return the newly created menu item with variants
    return createResponse(
      'OK',
      { ...newMenuItem.toObject(), variants: createdVariants }, // Return the newly created variants
      'Menu Item and variants created successfully',
    );
  }

  // Update a menu item by ID
  async update(id: string, updateMenuItemDto: UpdateMenuItemDto): Promise<any> {
    const {
      restaurant_id,
      name,
      description,
      category,
      avatar,
      availability,
      suggest_notes,
      variants,
      discount,
    } = updateMenuItemDto;

    // Check if the menu item exists
    const existingMenuItem = await this.menuItemModel.findById(id).exec();
    if (!existingMenuItem) {
      return createResponse('NotFound', null, 'Menu Item not found');
    }

    // Update the menu item details
    existingMenuItem.restaurant_id =
      restaurant_id || existingMenuItem.restaurant_id;
    existingMenuItem.name = name || existingMenuItem.name;
    existingMenuItem.description = description || existingMenuItem.description;
    existingMenuItem.category = category || existingMenuItem.category;
    existingMenuItem.avatar = avatar || existingMenuItem.avatar;
    existingMenuItem.availability =
      availability !== undefined ? availability : existingMenuItem.availability;
    existingMenuItem.suggest_notes =
      suggest_notes || existingMenuItem.suggest_notes;

    // If a discount is provided, update it
    if (discount !== undefined) {
      existingMenuItem.discount = discount;
    }

    // Handle variants if any
    if (variants && variants.length > 0) {
      const variantIds = [];

      for (const variant of variants) {
        const existingVariant =
          await this.menuItemVariantsService.findOneByDetails(
            variant.price,
            variant.description,
            existingMenuItem._id.toString(),
          );

        if (!existingVariant) {
          const newVariantData = {
            menu_id: existingMenuItem._id.toString(),
            variant: variant.description || '',
            price: variant.price,
            description: variant.description,
            avatar: existingMenuItem.avatar || { url: '', key: '' },
            availability: true,
            default_restaurant_notes: [],
            discount_rate: 0,
          };

          const newVariant =
            await this.menuItemVariantsService.create(newVariantData);
          variantIds.push(newVariant._id);
        } else {
          variantIds.push(existingVariant._id);
        }
      }

      existingMenuItem.variants = variantIds;
    }

    await existingMenuItem.save();

    return createResponse(
      'OK',
      existingMenuItem,
      'Menu Item updated successfully',
    );
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
    const menuItemVariants = await this.menuItemVariantsService.findAll({
      menu_id: id,
    });

    try {
      return createResponse(
        'OK',
        { menuItem, variants: menuItemVariants.data },
        'Fetched menu item successfully',
      );
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while fetching the menu item',
      );
    }
  }

  // Update a menu item by ID

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
