import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MenuItem } from './menu_items.schema';
import { createResponse } from 'src/utils/createResponse';
import { CreateMenuItemDto } from './dto/create-menu_item.dto';
import { UpdateMenuItemDto } from './dto/update-menu_item.dto';
import { MenuItemVariantsService } from 'src/menu_item_variants/menu_item_variants.service';
import { ApiResponse } from 'src/utils/createResponse';
import { FoodCategoriesRepository } from 'src/food_categories/food_categories.repository';
import { RestaurantsRepository } from 'src/restaurants/restaurants.repository';
@Injectable()
export class MenuItemsService {
  constructor(
    @InjectModel('MenuItem') private readonly menuItemModel: Model<MenuItem>,
    private readonly restaurantRepository: RestaurantsRepository,
    private readonly foodCategoriesRepository: FoodCategoriesRepository,
    private readonly menuItemVariantsService: MenuItemVariantsService
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
    } catch (error) {
      return this.handleError('Error creating menu item:', error);
    }
  }

  async findAll(): Promise<ApiResponse<MenuItem[]>> {
    try {
      const menuItems = await this.menuItemModel
        .find()
        .populate('category')
        .populate('variants')
        .exec();
      return createResponse('OK', menuItems, 'Fetched all menu items');
    } catch (error) {
      return this.handleError('Error fetching menu items:', error);
    }
  }

  async findOne(id: string): Promise<ApiResponse<any>> {
    try {
      const menuItem = await this.menuItemModel.findById(id).exec();
      if (!menuItem) {
        return createResponse('NotFound', null, 'Menu Item not found');
      }

      const menuItemVariants = await this.menuItemVariantsService.findAll({
        menu_id: id
      });

      return createResponse(
        'OK',
        { menuItem, variants: menuItemVariants.data },
        'Fetched menu item successfully'
      );
    } catch (error) {
      return this.handleError('Error fetching menu item:', error);
    }
  }

  async update(
    id: string,
    updateMenuItemDto: UpdateMenuItemDto
  ): Promise<ApiResponse<MenuItem>> {
    try {
      const existingMenuItem = await this.menuItemModel.findById(id).exec();
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
    } catch (error) {
      return this.handleError('Error updating menu item:', error);
    }
  }

  async remove(id: string): Promise<ApiResponse<null>> {
    try {
      const deletedMenuItem = await this.menuItemModel
        .findByIdAndDelete(id)
        .exec();
      if (!deletedMenuItem) {
        return createResponse('NotFound', null, 'Menu Item not found');
      }
      return createResponse('OK', null, 'Menu Item deleted successfully');
    } catch (error) {
      return this.handleError('Error deleting menu item:', error);
    }
  }

  async updateEntityAvatar(
    uploadResult: { url: string; public_id: string },
    menuItemId: string
  ): Promise<ApiResponse<MenuItem>> {
    try {
      const menuItem = await this.menuItemModel.findByIdAndUpdate(
        menuItemId,
        { avatar: { url: uploadResult.url, key: uploadResult.public_id } },
        { new: true }
      );
      return this.handleMenuItemResponse(menuItem);
    } catch (error) {
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
    return this.menuItemModel
      .findOne({ name, restaurant_id: restaurantId })
      .exec();
  }

  private async handleExistingMenuItem(
    existingMenuItem: MenuItem,
    createMenuItemDto: CreateMenuItemDto
  ): Promise<ApiResponse<any>> {
    const variantIds = await this.processVariants(
      createMenuItemDto.variants,
      existingMenuItem
    );
    existingMenuItem.variants.push(...variantIds);

    if (createMenuItemDto.discount) {
      existingMenuItem.discount = createMenuItemDto.discount;
    }

    await existingMenuItem.save();

    const createdVariants = await this.menuItemVariantsService.findAll({
      _id: { $in: variantIds }
    });

    return createResponse(
      'OK',
      { ...existingMenuItem.toObject(), variants: createdVariants.data },
      'Menu Item and variants updated successfully'
    );
  }

  private async createNewMenuItem(
    createMenuItemDto: CreateMenuItemDto
  ): Promise<ApiResponse<any>> {
    const newMenuItem = new this.menuItemModel({
      ...createMenuItemDto,
      variants: [],
      created_at: new Date().getTime(),
      updated_at: new Date().getTime()
    });

    await newMenuItem.save();

    const createdVariants = await this.createVariants(
      createMenuItemDto.variants,
      newMenuItem
    );

    return createResponse(
      'OK',
      { ...newMenuItem.toObject(), variants: createdVariants },
      'Menu Item and variants created successfully'
    );
  }

  private async processVariants(
    variants: any[],
    menuItem: MenuItem
  ): Promise<string[]> {
    const variantIds = [];
    for (const variant of variants) {
      const existingVariant =
        await this.menuItemVariantsService.findOneByDetails(
          variant.price,
          variant.description,
          menuItem._id.toString()
        );

      if (!existingVariant) {
        const newVariant = await this.createVariant(variant, menuItem);
        variantIds.push(newVariant._id);
      } else if (!menuItem.variants.includes(existingVariant._id as string)) {
        variantIds.push(existingVariant._id);
      }
    }
    return variantIds;
  }

  private async createVariant(
    variantData: any,
    menuItem: MenuItem
  ): Promise<any> {
    const newVariantData = {
      menu_id: menuItem._id.toString(),
      variant: variantData.description || '',
      price: variantData.price,
      description: variantData.description,
      avatar: menuItem.avatar || { key: '', url: '' },
      availability: true,
      default_restaurant_notes: [],
      discount_rate: 0
    };

    const result = await this.menuItemVariantsService.create(newVariantData);
    return result.data;
  }

  private async createVariants(
    variants: any[],
    menuItem: MenuItem
  ): Promise<any[]> {
    const createdVariants = [];
    for (const variant of variants) {
      const newVariant = await this.createVariant(variant, menuItem);
      createdVariants.push(newVariant);
    }
    return createdVariants;
  }

  private async updateExistingMenuItem(
    menuItem: MenuItem,
    updateData: UpdateMenuItemDto
  ): Promise<MenuItem> {
    Object.assign(menuItem, updateData);
    return menuItem.save();
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
}
