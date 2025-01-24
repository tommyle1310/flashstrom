import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MenuItemVariant } from './menu_item_variants.schema'; // Assuming MenuItemVariant schema is similar to the one we've defined earlier
import { createResponse } from 'src/utils/createResponse'; // Utility for creating responses
import { CreateMenuItemVariantDto } from './dto/create-menu_item_variant.dto';
import { UpdateMenuItemVariantDto } from './dto/update-menu_item_variant.dto';
import { MenuItem } from 'src/menu_items/menu_items.schema';

@Injectable()
export class MenuItemVariantsService {
  constructor(
    @InjectModel('MenuItemVariant')
    private readonly menuItemVariantModel: Model<MenuItemVariant>,
    @InjectModel('MenuItem')
    private readonly menuItemModel: Model<MenuItem>,
  ) {}

  async create(
    createMenuItemVariantDto: CreateMenuItemVariantDto,
  ): Promise<any> {
    const {
      menu_id,
      variant,
      description,
      avatar,
      availability,
      default_restaurant_notes,
      price,
      discount_rate,
    } = createMenuItemVariantDto;

    // Check if the menu item variant already exists by variant or other unique fields
    const existingVariant = await this.menuItemVariantModel
      .findOne({ variant, menu_id })
      .exec();
    if (existingVariant) {
      return createResponse(
        'DuplicatedRecord',
        null,
        'Menu Item Variant with this variant already exists for this menu',
      );
    }

    // Create the new menu item variant
    const newVariant = new this.menuItemVariantModel({
      menu_id,
      variant,
      description,
      avatar,
      availability,
      default_restaurant_notes,
      price,
      discount_rate,
      created_at: new Date().getTime(),
      updated_at: new Date().getTime(),
    });

    // Save the new variant
    await newVariant.save();

    // Now, update the corresponding menu item by adding this new variant's ID to the variants array
    await this.menuItemModel
      .findByIdAndUpdate(
        menu_id, // Find the menu item by its ID
        {
          $push: { variants: newVariant._id }, // Add the new variant's ID to the variants array
          updated_at: new Date().getTime(), // Update the `updated_at` timestamp
        },
        { new: true },
      )
      .exec();

    return createResponse(
      'OK',
      newVariant,
      'Menu Item Variant created and added to the menu item successfully',
    );
  }

  // Update a menu item variant by ID
  async update(
    id: string,
    updateMenuItemVariantDto: UpdateMenuItemVariantDto,
  ): Promise<any> {
    const updatedVariant = await this.menuItemVariantModel
      .findByIdAndUpdate(id, updateMenuItemVariantDto, { new: true })
      .exec();

    if (!updatedVariant) {
      return createResponse('NotFound', null, 'Menu Item Variant not found');
    }

    try {
      return createResponse(
        'OK',
        updatedVariant,
        'Menu Item Variant updated successfully',
      );
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while updating the menu item variant',
      );
    }
  }

  // Get all menu item variants
  async findAll(): Promise<any> {
    try {
      const variants = await this.menuItemVariantModel.find().exec();
      return createResponse('OK', variants, 'Fetched all menu item variants');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while fetching menu item variants',
      );
    }
  }

  // Get a menu item variant by ID
  async findOne(id: string): Promise<any> {
    const variant = await this.menuItemVariantModel.findById(id).exec();
    if (!variant) {
      return createResponse('NotFound', null, 'Menu Item Variant not found');
    }

    try {
      return createResponse(
        'OK',
        variant,
        'Fetched menu item variant successfully',
      );
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while fetching the menu item variant',
      );
    }
  }

  // Delete a menu item variant by ID
  async remove(id: string): Promise<any> {
    const deletedVariant = await this.menuItemVariantModel
      .findByIdAndDelete(id)
      .exec();

    if (!deletedVariant) {
      return createResponse('NotFound', null, 'Menu Item Variant not found');
    }

    try {
      return createResponse(
        'OK',
        null,
        'Menu Item Variant deleted successfully',
      );
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while deleting the menu item variant',
      );
    }
  }
}
