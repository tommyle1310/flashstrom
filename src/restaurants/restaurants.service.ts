import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { Restaurant } from './restaurants.schema'; // Assuming the restaurant schema
import { createResponse } from 'src/utils/createResponse';
import { MenuItemsService } from 'src/menu_items/menu_items.service';
import { CreateMenuItemDto } from 'src/menu_items/dto/create-menu_item.dto';
import { UpdateMenuItemDto } from 'src/menu_items/dto/update-menu_item.dto';
import { CreateMenuItemVariantDto } from 'src/menu_item_variants/dto/create-menu_item_variant.dto';
import { MenuItemVariantsService } from 'src/menu_item_variants/menu_item_variants.service';
import { UpdateMenuItemVariantDto } from 'src/menu_item_variants/dto/update-menu_item_variant.dto';
import { Order } from 'src/orders/orders.schema';
import { UserRepository } from 'src/users/users.repository';
import { ApiResponse } from 'src/utils/createResponse';
import { PromotionsRepository } from 'src/promotions/promotions.repository';
import { AddressBookRepository } from 'src/address_book/address_book.repository';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectModel('Restaurant')
    private readonly restaurantModel: Model<Restaurant>,
    private readonly userRepository: UserRepository,
    private readonly promotionRepository: PromotionsRepository,
    private readonly addressRepository: AddressBookRepository,
    @InjectModel('Order') private readonly orderModel: Model<Order>,

    private readonly menuItemsService: MenuItemsService,
    private readonly menuItemVariantsService: MenuItemVariantsService
  ) {}

  async create(
    createRestaurantDto: CreateRestaurantDto
  ): Promise<ApiResponse<Restaurant>> {
    try {
      const { owner_id, promotions, address } = createRestaurantDto;

      // Check if owner exists using repository pattern
      const owner = await this.userRepository.findById(owner_id);
      if (!owner) {
        return createResponse('NotFound', null, 'Owner not found');
      }

      // Check if address exists
      const addressBookEntry = await this.addressRepository.findById(address);
      if (!addressBookEntry) {
        return createResponse(
          'NotFound',
          null,
          'Address not found in address book'
        );
      }

      // Check if promotions exist using repository
      if (promotions) {
        const foundPromotions =
          await this.promotionRepository.findByIds(promotions);
        if (foundPromotions.length !== promotions.length) {
          return createResponse(
            'NotFound',
            null,
            'One or more promotions not found'
          );
        }
      }

      const newRestaurant = new this.restaurantModel(createRestaurantDto);
      const savedRestaurant = await newRestaurant.save();

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
      const { owner_id, promotions, address } = updateRestaurantDto;

      // Check if owner exists
      if (owner_id) {
        const owner = await this.userRepository.findById(owner_id);
        if (!owner) {
          return createResponse('NotFound', null, 'Owner not found');
        }
      }

      // Check if address exists
      if (address) {
        const addressBookEntry = await this.addressRepository.findById(address);
        if (!addressBookEntry) {
          return createResponse(
            'NotFound',
            null,
            'Address not found in address book'
          );
        }
      }

      // Check if promotions exist using TypeORM repository
      if (promotions) {
        const foundPromotions =
          await this.promotionRepository.findByIds(promotions);
        if (foundPromotions.length !== promotions.length) {
          return createResponse(
            'NotFound',
            null,
            'One or more promotions not found'
          );
        }
      }

      // Retrieve the current restaurant data before making changes
      const updatedRestaurant = await this.restaurantModel.findById(id).exec();

      if (!updatedRestaurant) {
        return createResponse('NotFound', null, 'Restaurant not found');
      }

      // Check and handle contact_phone numbers
      if (
        updateRestaurantDto.contact_phone &&
        updateRestaurantDto.contact_phone.length > 0
      ) {
        for (const newPhone of updateRestaurantDto.contact_phone) {
          // Check if the phone number already exists in the restaurant's contact_phone
          const existingPhone = updatedRestaurant.contact_phone.find(
            phone => phone.number === newPhone.number
          );

          if (!existingPhone) {
            // If phone number doesn't exist, push it to the contact_phone array
            updatedRestaurant.contact_phone.push(newPhone);
          }
        }
      }

      // Check and handle contact_email emails
      if (
        updateRestaurantDto.contact_email &&
        updateRestaurantDto.contact_email.length > 0
      ) {
        for (const newEmail of updateRestaurantDto.contact_email) {
          // Check if the email already exists in the restaurant's contact_email
          const existingEmail = updatedRestaurant.contact_email.find(
            email => email.email === newEmail.email
          );

          if (!existingEmail) {
            // If email doesn't exist, push it to the contact_email array
            updatedRestaurant.contact_email.push(newEmail);
          }
        }
      }

      // If a new description is provided, update the restaurant's description
      if (updateRestaurantDto.description) {
        updatedRestaurant.description = updateRestaurantDto.description;
      }

      // Merge the status object if provided
      if (updateRestaurantDto.status) {
        console.log('check status payload', updateRestaurantDto.status);

        updatedRestaurant.status = {
          ...updatedRestaurant.status,
          ...(updateRestaurantDto.status.is_open !== undefined && {
            is_open: updateRestaurantDto.status.is_open
          }),
          ...(updateRestaurantDto.status.is_active !== undefined && {
            is_active: updateRestaurantDto.status.is_active
          }),
          ...(updateRestaurantDto.status.is_accepted_orders !== undefined && {
            is_accepted_orders: updateRestaurantDto.status.is_accepted_orders
          }),
          ...(updateRestaurantDto.status.is_accepted_orders !== undefined && {
            is_accepted_orders: updateRestaurantDto.status.is_accepted_orders
          })
        };
      }

      // Instead of spreading updatedRestaurant, directly assign values
      const updateData: any = {
        ...updatedRestaurant.toObject(), // Spread existing data
        restaurant_name: updateRestaurantDto.restaurant_name, // Directly include the new restaurant_name
        address: updateRestaurantDto.address // Directly include the new address
      };

      // Update the restaurant with the modified contact details, restaurant_name, and description
      const finalUpdatedRestaurant = await this.restaurantModel
        .findByIdAndUpdate(id, updateData, { new: true })
        .exec();

      if (!finalUpdatedRestaurant) {
        return createResponse('NotFound', null, 'Restaurant not found');
      }

      return createResponse(
        'OK',
        finalUpdatedRestaurant,
        'Restaurant updated successfully'
      );
    } catch (error) {
      console.error('Error updating restaurant:', error);
      return createResponse('ServerError', null, 'Error updating restaurant');
    }
  }

  // Get all restaurants
  async findAll(): Promise<any> {
    try {
      // Find all restaurants and populate promotions and specialize_in
      const restaurants = await this.restaurantModel
        .find()
        .populate('address', '-created_at -updated_at')
        .populate('promotions', '-created_at -updated_at') // Populate promotions with full promotion documents
        .populate('specialize_in', '-created_at -updated_at') // Populate specialize_in with full food category documents
        .exec();
      // if (!restaurants || restaurants.length === 0) {
      //   return createResponse('NotFound', [], 'No restaurants found');
      // }
      return createResponse('OK', restaurants, 'Fetched all restaurants');
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      return createResponse(
        'ServerError',
        null,
        'An error occurred while fetching restaurants'
      );
    }
  }

  // Get a restaurant by ID
  async findOne(id: string): Promise<any> {
    try {
      const restaurant = await this.restaurantModel
        .findById(id) // Populate promotions with full promotion documents
        .populate('promotions', '-created_at -updated_at') // Exclude created_at and updated_at from promotions
        .populate('specialize_in', '-created_at -updated_at')
        .populate('address', '-created_at -updated_at')
        .exec();
      if (!restaurant) {
        return createResponse('NotFound', null, 'Restaurant not found');
      }
      return createResponse(
        'OK',
        restaurant,
        'Fetched restaurant successfully'
      );
    } catch (error) {
      console.error('Error fetching restaurant:', error);
      return createResponse(
        'ServerError',
        null,
        'An error occurred while fetching the restaurant'
      );
    }
  }

  // Delete a restaurant by ID
  async remove(id: string): Promise<any> {
    try {
      const deletedRestaurant = await this.restaurantModel
        .findByIdAndDelete(id)
        .exec();
      if (!deletedRestaurant) {
        return createResponse('NotFound', null, 'Restaurant not found');
      }
      return createResponse('OK', null, 'Restaurant deleted successfully');
    } catch (error) {
      console.error('Error deleting restaurant:', error);
      return createResponse(
        'ServerError',
        null,
        'An error occurred while deleting the restaurant'
      );
    }
  }

  async updateEntityAvatar(
    uploadResult: { url: string; public_id: string },
    entityId: string
  ) {
    const restaurant = await this.restaurantModel.findByIdAndUpdate(
      entityId,
      { avatar: { url: uploadResult.url, key: uploadResult.public_id } },
      { new: true }
    );

    if (!restaurant) {
      return createResponse('NotFound', null, 'Restaurant not found');
    }

    return createResponse(
      'OK',
      restaurant,
      'Restaurant avatar updated successfully'
    );
  }

  // New method to create a menu item for a specific restaurant
  async createMenuItemForRestaurant(
    restaurantId: string,
    createMenuItemDto: CreateMenuItemDto
  ): Promise<any> {
    // Set the restaurant_id in the createMenuItemDto
    createMenuItemDto.restaurant_id = restaurantId;

    // Call the create method from MenuItemsService
    return this.menuItemsService.create({
      ...createMenuItemDto,
      restaurant_id: restaurantId
    });
  }

  // New method to update a menu item for a specific restaurant
  async updateMenuItemForRestaurant(
    restaurantId: string,
    menuItemId: string,
    updateMenuItemDto: UpdateMenuItemDto
  ): Promise<any> {
    // Fetch the menu item to ensure it's associated with the restaurant
    const menuItem = await this.menuItemsService.findOne(menuItemId);

    if (menuItem.data.menuItem.restaurant_id !== restaurantId) {
      console.log('cehck is it here', menuItem);

      return createResponse(
        'Forbidden',
        null,
        'Menu Item does not belong to this restaurant'
      );
    }

    // Call the update method from MenuItemsService
    return this.menuItemsService.update(menuItemId, {
      ...updateMenuItemDto,
      restaurant_id: restaurantId
    });
  }

  // New method to delete a menu item for a specific restaurant
  async deleteMenuItemForRestaurant(
    restaurantId: string,
    menuItemId: string
  ): Promise<any> {
    // Fetch the menu item to ensure it's associated with the restaurant
    const menuItem = await this.menuItemsService.findOne(menuItemId);

    if (menuItem.data.restaurant_id !== restaurantId) {
      return createResponse(
        'Forbidden',
        null,
        'Menu Item does not belong to this restaurant'
      );
    }

    // Call the remove method from MenuItemsService
    return this.menuItemsService.remove(menuItemId);
  }

  // New method to fetch all menu items for a specific restaurant
  async getMenuItemsForRestaurant(restaurantId: string): Promise<any> {
    const allMenuItems = await this.menuItemsService.findAll();

    // Filter menu items by restaurant_id
    const restaurantMenuItems = allMenuItems.data.filter(
      item => item.restaurant_id.toString() === restaurantId
    );

    return createResponse(
      'OK',
      restaurantMenuItems,
      'Fetched menu items for the restaurant'
    );
  }
  // New method to create a menu item variant for a specific restaurant
  async createMenuItemVariantForRestaurant(
    menuId: string,
    createMenuItemVariantDto: CreateMenuItemVariantDto
  ): Promise<any> {
    // Optionally validate that the menu_id belongs to a valid menu item for a restaurant

    // Call the create method from MenuItemVariantsService to create the variant
    return this.menuItemVariantsService.create({
      ...createMenuItemVariantDto,
      menu_id: menuId // MenuItem ID that the variant belongs to
    });
  }

  // New method to update a menu item for a specific restaurant
  async updateMenuItemVariantForRestaurant(
    variantId: string,
    updateMenuItemVariantDto: UpdateMenuItemVariantDto
  ): Promise<any> {
    // Call the update method from MenuItemVariantsService
    return this.menuItemVariantsService.update(
      variantId,
      updateMenuItemVariantDto
    );
  }

  // New method to delete a menu item for a specific restaurant
  async deleteMenuItemVariantForRestaurant(
    menuItemVariantId: string
  ): Promise<any> {
    // Call the remove method from MenuItemVariantsService to delete the variant
    return this.menuItemVariantsService.remove(menuItemVariantId);
  }

  async getOrderById(orderId: string) {
    return this.orderModel
      .findById(orderId)
      .populate('customer_location')
      .populate('restaurant_location')
      .exec();
  }

  // Add new method to update order status
  async updateOrderStatus(orderId: string, status: string): Promise<any> {
    try {
      const updateData: any = {
        status,
        updated_at: Math.floor(Date.now() / 1000)
      };

      // Update tracking_info when status is RESTAURANT_ACCEPTED
      if (status === 'RESTAURANT_ACCEPTED') {
        updateData.tracking_info = 'PREPARING';
      }

      const updatedOrder = await this.orderModel
        .findByIdAndUpdate(orderId, updateData, { new: true })
        .exec();

      if (!updatedOrder) {
        return createResponse('NotFound', null, 'Order not found');
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
}
