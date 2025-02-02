import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Order } from './orders.schema'; // Assuming you have an Order schema
import { Customer } from 'src/customers/customer.schema'; // Customer schema (assumed)
import { Restaurant } from 'src/restaurants/restaurants.schema'; // Restaurant schema (assumed)
import { createResponse } from 'src/utils/createResponse'; // Utility for creating responses
import { AddressBook } from 'src/address_book/address_book.schema';
import { MenuItem } from 'src/menu_items/menu_items.schema';
import { MenuItemVariant } from 'src/menu_item_variants/menu_item_variants.schema';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel('Order') private readonly orderModel: Model<Order>, // Inject Order model
    @InjectModel('MenuItem') private readonly menuItemModel: Model<MenuItem>, // Inject Order model
    @InjectModel('MenuItemVariant')
    private readonly menuItemVariantModel: Model<MenuItemVariant>, // Inject Order model
    @InjectModel('AddressBook')
    private readonly addressBookModel: Model<AddressBook>, // Inject Order model
    @InjectModel('Customer') private readonly customerModel: Model<Customer>, // Inject Customer model
    @InjectModel('Restaurant')
    private readonly restaurantModel: Model<Restaurant>, // Inject Restaurant model
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<any> {
    const {
      customer_id,
      restaurant_id,
      status,
      total_amount,
      delivery_fee,
      service_fee,
      payment_status,
      payment_method,
      customer_location,
      restaurant_location,
      order_items,
      customer_note,
      restaurant_note,
      order_time,
      delivery_time,
      tracking_info,
    } = createOrderDto;

    // Check if the customer exists
    const customerExists = await this.customerModel
      .findById(customer_id)
      .exec();
    if (!customerExists) {
      return createResponse('NotFound', null, 'Customer not found');
    }

    // Check if the restaurant exists
    const restaurantExists = await this.restaurantModel
      .findById(restaurant_id)
      .exec();
    if (!restaurantExists) {
      return createResponse('NotFound', null, 'Restaurant not found');
    }

    // Check if the customer location exists in AddressBook
    const customerAddressExists = await this.addressBookModel
      .findById(customer_location)
      .exec();
    if (!customerAddressExists) {
      return createResponse('NotFound', null, 'Customer address not found');
    }

    // Check if the restaurant location exists in AddressBook
    const restaurantAddressExists = await this.addressBookModel
      .findById(restaurant_location)
      .exec();
    if (!restaurantAddressExists) {
      return createResponse('NotFound', null, 'Restaurant address not found');
    }

    // Check if all items and variants in order_items exist
    for (const item of order_items) {
      const itemExists = await this.menuItemModel.findById(item.item_id).exec();
      if (!itemExists) {
        return createResponse(
          'NotFound',
          null,
          `Menu item ${item.item_id} not found`,
        );
      }

      const variantExists = await this.menuItemVariantModel
        .findById(item.variant_id)
        .exec();
      if (!variantExists) {
        return createResponse(
          'NotFound',
          null,
          `Variant ${item.variant_id} not found for item ${item.item_id}`,
        );
      }
    }

    // Create a new order instance
    const newOrder = new this.orderModel({
      customer_id,
      restaurant_id,
      status,
      total_amount,
      payment_status,
      payment_method,
      delivery_fee,
      service_fee,
      customer_location,
      restaurant_location,
      order_items,
      customer_note,
      restaurant_note,
      order_time,
      delivery_time,
      tracking_info,
      created_at: new Date().getTime(),
      updated_at: new Date().getTime(),
    });

    try {
      // Save the new order
      await newOrder.save();
      return createResponse('OK', newOrder, 'Order created successfully');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while creating the order',
      );
    }
  }

  async update(id: string, updateOrderDto: UpdateOrderDto): Promise<any> {
    const {
      customer_id,
      restaurant_id,
      status,
      total_amount,
      payment_status,
      payment_method,
      customer_location,
      restaurant_location,
      order_items,
      customer_note,
      restaurant_note,
      order_time,
      delivery_time,
      tracking_info,
    } = updateOrderDto;

    // Check if the customer exists
    const customerExists = await this.customerModel
      .findById(customer_id)
      .exec();
    if (!customerExists) {
      return createResponse('NotFound', null, 'Customer not found');
    }

    // Check if the restaurant exists
    const restaurantExists = await this.restaurantModel
      .findById(restaurant_id)
      .exec();
    if (!restaurantExists) {
      return createResponse('NotFound', null, 'Restaurant not found');
    }

    // Check if the customer location exists in AddressBook
    const customerAddressExists = await this.addressBookModel
      .findById(customer_location)
      .exec();
    if (!customerAddressExists) {
      return createResponse('NotFound', null, 'Customer address not found');
    }

    // Check if the restaurant location exists in AddressBook
    const restaurantAddressExists = await this.addressBookModel
      .findById(restaurant_location)
      .exec();
    if (!restaurantAddressExists) {
      return createResponse('NotFound', null, 'Restaurant address not found');
    }

    // Check if all items and variants in order_items exist
    for (const item of order_items) {
      const itemExists = await this.menuItemModel.findById(item.item_id).exec();
      if (!itemExists) {
        return createResponse(
          'NotFound',
          null,
          `Menu item ${item.item_id} not found`,
        );
      }

      const variantExists = await this.menuItemVariantModel
        .findById(item.variant_id)
        .exec();
      if (!variantExists) {
        return createResponse(
          'NotFound',
          null,
          `Variant ${item.variant_id} not found for item ${item.item_id}`,
        );
      }
    }

    // Update the order
    const updatedOrder = await this.orderModel
      .findByIdAndUpdate(id, updateOrderDto, { new: true })
      .exec();

    if (!updatedOrder) {
      return createResponse('NotFound', null, 'Order not found');
    }

    try {
      return createResponse('OK', updatedOrder, 'Order updated successfully');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while updating the order',
      );
    }
  }

  // Get all orders
  async findAll(): Promise<any> {
    try {
      const orders = await this.orderModel.find().exec();
      return createResponse('OK', orders, 'Fetched all orders');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while fetching orders',
      );
    }
  }

  // Get a specific order by ID
  async findOne(id: string): Promise<any> {
    const order = await this.orderModel.findById(id).exec();
    if (!order) {
      return createResponse('NotFound', null, 'Order not found');
    }

    try {
      return createResponse('OK', order, 'Fetched order successfully');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while fetching the order',
      );
    }
  }

  // Delete an order by ID
  async remove(id: string): Promise<any> {
    const deletedOrder = await this.orderModel.findByIdAndDelete(id).exec();

    if (!deletedOrder) {
      return createResponse('NotFound', null, 'Order not found');
    }

    try {
      return createResponse('OK', null, 'Order deleted successfully');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while deleting the order',
      );
    }
  }
}
