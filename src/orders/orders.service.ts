import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Order, OrderStatus, OrderTrackingInfo } from './entities/order.entity';
import { createResponse, ApiResponse } from 'src/utils/createResponse';
import { FIXED_DELIVERY_DRIVER_WAGE } from 'src/utils/constants';
import { OrdersRepository } from './orders.repository';
import { RestaurantsGateway } from '../restaurants/restaurants.gateway';
import { AddressBookRepository } from 'src/address_book/address_book.repository';
import { RestaurantsRepository } from 'src/restaurants/restaurants.repository';
import { CustomersRepository } from 'src/customers/customers.repository';
import { MenuItemsRepository } from 'src/menu_items/menu_items.repository';
import { MenuItemVariantsRepository } from 'src/menu_item_variants/menu_item_variants.repository';
import { DataSource, EntityManager, In, DeepPartial } from 'typeorm';
import { CartItemsRepository } from 'src/cart_items/cart_items.repository';
import { CartItem } from 'src/cart_items/entities/cart_item.entity';
import { CustomersGateway } from 'src/customers/customers.gateway';
import { DriversGateway } from 'src/drivers/drivers.gateway';
import { TransactionService } from 'src/transactions/transactions.service';
import { CreateTransactionDto } from 'src/transactions/dto/create-transaction.dto';
import { FWalletsRepository } from 'src/fwallets/fwallets.repository';
import { Promotion } from 'src/promotions/entities/promotion.entity';
import { MenuItem } from 'src/menu_items/entities/menu_item.entity';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { DriverStatsService } from 'src/driver_stats_records/driver_stats_records.service';
import { DriverProgressStage } from 'src/driver_progress_stages/entities/driver_progress_stage.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';

const logger = new Logger('OrdersService');

@Injectable()
export class OrdersService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly menuItemsRepository: MenuItemsRepository,
    private readonly menuItemVariantsRepository: MenuItemVariantsRepository,
    private readonly addressRepository: AddressBookRepository,
    private readonly customersRepository: CustomersRepository,
    private readonly driverStatsService: DriverStatsService,
    private readonly restaurantRepository: RestaurantsRepository,
    private readonly addressBookRepository: AddressBookRepository,
    private readonly restaurantsGateway: RestaurantsGateway,
    private readonly dataSource: DataSource,
    private readonly cartItemsRepository: CartItemsRepository,
    private readonly customersGateway: CustomersGateway,
    @Inject(forwardRef(() => DriversGateway))
    private readonly driversGateway: DriversGateway,
    private readonly transactionsService: TransactionService,
    private readonly fWalletsRepository: FWalletsRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createOrder(createOrderDto: CreateOrderDto): Promise<ApiResponse<any>> {
    try {
      const validationResult = await this.validateOrderData(createOrderDto);
      if (validationResult !== true) {
        return validationResult;
      }
      logger.log('Input DTO:', createOrderDto);

      const user = await this.customersRepository.findById(createOrderDto.customer_id);
      if (!user) {
        return createResponse('NotFound', null, `Customer ${createOrderDto.customer_id} not found`);
      }

      const result = await this.dataSource.transaction(async (transactionalEntityManager) => {
        const menuItems = await transactionalEntityManager
          .getRepository(MenuItem)
          .findBy({
            id: In(createOrderDto.order_items.map((item) => item.item_id)),
          });

        let totalAmount = createOrderDto.total_amount;
        let appliedPromotion: Promotion | null = null;

        if (createOrderDto.promotion_applied) {
          const promotion = await transactionalEntityManager
            .getRepository(Promotion)
            .findOne({
              where: { id: createOrderDto.promotion_applied },
            });

          if (promotion) {
            const now = Math.floor(Date.now() / 1000);
            if (
              promotion.start_date <= now &&
              promotion.end_date >= now &&
              promotion.status === 'ACTIVE'
            ) {
              appliedPromotion = promotion;
              totalAmount = 0;
              createOrderDto.order_items = createOrderDto.order_items.map((orderItem) => {
                const menuItem = menuItems.find((mi) => mi.id === orderItem.item_id);
                if (!menuItem) return orderItem;

                const priceToUse = orderItem.price_after_applied_promotion ?? orderItem.price_at_time_of_order;
                totalAmount += priceToUse * orderItem.quantity;

                return {
                  ...orderItem,
                  price_at_time_of_order: priceToUse,
                };
              });
            }
          }
        }

        const restaurant = await this.restaurantRepository.findById(createOrderDto.restaurant_id);
        if (!restaurant) {
          return createResponse('NotFound', null, `Restaurant ${createOrderDto.restaurant_id} not found`);
        }

        // Lấy địa chỉ từ AddressBook
        const customerAddress = await this.addressBookRepository.findById(createOrderDto.customer_location);
        const restaurantAddress = await this.addressBookRepository.findById(createOrderDto.restaurant_location);

        if (!customerAddress) {
          return createResponse('NotFound', null, `Customer address ${createOrderDto.customer_location} not found`);
        }
        if (!restaurantAddress) {
          return createResponse('NotFound', null, `Restaurant address ${createOrderDto.restaurant_location} not found`);
        }

        const orderData: DeepPartial<Order> = {
          ...createOrderDto,
          total_amount: totalAmount + createOrderDto.delivery_fee + createOrderDto.service_fee,
          promotions_applied: appliedPromotion ? [appliedPromotion] : [],
          status: createOrderDto.status as OrderStatus || OrderStatus.PENDING,
          tracking_info: createOrderDto.tracking_info as OrderTrackingInfo || OrderTrackingInfo.ORDER_PLACED,
          customerAddress: customerAddress,
          restaurantAddress: restaurantAddress,
          created_at: Math.floor(Date.now() / 1000),
          updated_at: Math.floor(Date.now() / 1000),
        };

        if (createOrderDto.payment_method === 'FWallet') {
          const customerWallet = await this.fWalletsRepository.findByUserId(user.user_id);
          if (!customerWallet) {
            return createResponse('NotFound', null, `Wallet not found for customer ${createOrderDto.customer_id}`);
          }

          const restaurantWallet = await this.fWalletsRepository.findByUserId(restaurant.owner_id);
          if (!restaurantWallet) {
            return createResponse('NotFound', null, `Wallet not found for restaurant ${createOrderDto.restaurant_id}`);
          }

          const transactionDto = {
            user_id: user.user_id,
            fwallet_id: customerWallet.id,
            transaction_type: 'PURCHASE',
            amount: totalAmount,
            balance_after: 0,
            status: 'PENDING',
            source: 'FWALLET',
            destination: restaurantWallet.id,
            destination_type: 'FWALLET',
          } as CreateTransactionDto;

          const transactionResponse = await this.transactionsService.create(
            transactionDto,
            transactionalEntityManager,
          );
          logger.log('Transaction response:', transactionResponse);
          if (transactionResponse.EC === -8) {
            return createResponse(
              'InsufficientBalance',
              null,
              'Balance in the source wallet is not enough for this transaction.',
            );
          }
        }

        const cartItems = await transactionalEntityManager
          .getRepository(CartItem)
          .find({
            where: { customer_id: createOrderDto.customer_id },
          });

        for (const orderItem of createOrderDto.order_items) {
          const cartItem = cartItems.find((ci) => ci.item_id === orderItem.item_id);
          if (cartItem) {
            await transactionalEntityManager.getRepository(CartItem).delete(cartItem.id);
            logger.log(`Deleted cart item ${cartItem.id}`);
          }
        }

        const orderRepository = transactionalEntityManager.getRepository(Order);
        const newOrder = orderRepository.create(orderData);
        const savedOrder = await orderRepository.save(newOrder);
        await this.updateMenuItemPurchaseCount(createOrderDto.order_items);

        await transactionalEntityManager
          .getRepository(Restaurant)
          .update(createOrderDto.restaurant_id, {
            total_orders: restaurant.total_orders + 1,
            updated_at: Math.floor(Date.now() / 1000),
          });

        const trackingUpdate = {
          orderId: savedOrder.id,
          status: savedOrder.status,
          tracking_info: savedOrder.tracking_info,
          updated_at: savedOrder.updated_at,
          customer_id: savedOrder.customer_id,
          driver_id: savedOrder.driver_id,
          restaurant_id: savedOrder.restaurant_id,
          restaurantAddress: savedOrder.restaurantAddress,
          customerAddress: savedOrder.customerAddress,
          order_items: createOrderDto.order_items,
          total_amount: savedOrder.total_amount,
          delivery_fee: savedOrder.delivery_fee,
          service_fee: savedOrder.service_fee,
          promotions_applied: savedOrder.promotions_applied,
          restaurant_avatar: restaurant.avatar || null,
        };

        this.eventEmitter.emit('listenUpdateOrderTracking', trackingUpdate);
        this.eventEmitter.emit('newOrderForRestaurant', {
          restaurant_id: savedOrder.restaurant_id,
          order: trackingUpdate,
        });
        logger.log('Emitted events:', trackingUpdate);

        return createResponse('OK', savedOrder, 'Order created in transaction');
      });

      if (!result || typeof result.EC === 'undefined') {
        return createResponse('OK', result, 'Order created successfully');
      }

      if (result.EC !== 0) {
        return createResponse('ServerError', result.data, result.EM);
      }

      logger.log('Order committed to DB');
      return createResponse('OK', result.data, 'Order created successfully');
    } catch (error) {
      logger.error('Error creating order:', error);
      return createResponse('ServerError', null, 'Error creating order');
    }
  }

  async notifyRestaurantAndDriver(order: Order): Promise<ApiResponse<any>> {
    const restaurant = await this.restaurantRepository.findById(order.restaurant_id);
    if (!restaurant) {
      return createResponse('NotFound', null, `Restaurant ${order.restaurant_id} not found`);
    }

    const trackingUpdate = {
      orderId: order.id,
      status: order.status,
      tracking_info: order.tracking_info,
      updated_at: order.updated_at,
      customer_id: order.customer_id,
      driver_id: order.driver_id,
      restaurant_id: order.restaurant_id,
      restaurantAddress: order.restaurantAddress,
      customerAddress: order.customerAddress,
      order_items: order.order_items,
      total_amount: order.total_amount,
      delivery_fee: order.delivery_fee,
      service_fee: order.service_fee,
      promotions_applied: order.promotions_applied,
      restaurant_avatar: restaurant.avatar || null,
    };

    this.eventEmitter.emit('listenUpdateOrderTracking', trackingUpdate);
    this.eventEmitter.emit('newOrderForRestaurant', {
      restaurant_id: order.restaurant_id,
      order: trackingUpdate,
    });

    logger.log('Notified restaurant and driver:', trackingUpdate);
    return createResponse('OK', trackingUpdate, 'Notified successfully');
  }

  async update(
    id: string,
    updateOrderDto: UpdateOrderDto,
    transactionalEntityManager?: EntityManager
  ): Promise<ApiResponse<Order>> {
    try {
      const manager = transactionalEntityManager || this.dataSource.manager;
      const order = await manager.findOne(Order, {
        where: { id },
        relations: ['promotions_applied'],
      });
      if (!order) {
        return createResponse('NotFound', null, 'Order not found');
      }

      let promotionsApplied: Promotion[] = order.promotions_applied || [];
      if (updateOrderDto.promotion_applied) {
        const promotion = await manager.getRepository(Promotion).findOne({
          where: { id: updateOrderDto.promotion_applied },
        });
        promotionsApplied = promotion ? [promotion] : [];
      }

      const updatedData: DeepPartial<Order> = {
        ...order,
        ...updateOrderDto,
        promotions_applied: promotionsApplied,
        status: updateOrderDto.status
          ? (updateOrderDto.status as OrderStatus)
          : order.status,
        tracking_info: updateOrderDto.tracking_info
          ? (updateOrderDto.tracking_info as OrderTrackingInfo)
          : order.tracking_info,
      };

      const updatedOrder = await manager.save(Order, updatedData);
      return createResponse('OK', updatedOrder, 'Order updated successfully');
    } catch (error) {
      return this.handleError('Error updating order:', error);
    }
  }

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    transactionalEntityManager?: EntityManager
  ): Promise<ApiResponse<Order>> {
    try {
      const manager = transactionalEntityManager || this.dataSource.manager;
      logger.log('🔍 Finding order:', orderId);
      const order = await manager.findOne(Order, { where: { id: orderId } });
      logger.log('📋 Found order:', order);
      if (!order) {
        logger.log('❌ Order not found:', orderId);
        return createResponse('NotFound', null, 'Order not found');
      }

      order.status = status;
      logger.log('➡️ Updating order status to:', status);
      const updatedOrder = await manager.save(Order, order);
      logger.log('✅ Updated order:', updatedOrder);

      const trackingInfoMap = {
        [OrderStatus.PENDING]: OrderTrackingInfo.ORDER_PLACED,
        [OrderStatus.RESTAURANT_ACCEPTED]: OrderTrackingInfo.ORDER_RECEIVED,
        [OrderStatus.PREPARING]: OrderTrackingInfo.PREPARING,
        [OrderStatus.IN_PROGRESS]: OrderTrackingInfo.IN_PROGRESS,
        [OrderStatus.READY_FOR_PICKUP]: OrderTrackingInfo.PREPARING,
        [OrderStatus.RESTAURANT_PICKUP]: OrderTrackingInfo.RESTAURANT_PICKUP,
        [OrderStatus.DISPATCHED]: OrderTrackingInfo.DISPATCHED,
        [OrderStatus.EN_ROUTE]: OrderTrackingInfo.EN_ROUTE,
        [OrderStatus.OUT_FOR_DELIVERY]: OrderTrackingInfo.OUT_FOR_DELIVERY,
        [OrderStatus.DELIVERY_FAILED]: OrderTrackingInfo.DELIVERY_FAILED,
        [OrderStatus.DELIVERED]: OrderTrackingInfo.DELIVERED,
      };
      const trackingInfo = trackingInfoMap[status];
      if (trackingInfo) {
        order.tracking_info = trackingInfo;
        await manager.save(Order, order);
        logger.log('✅ Updated tracking_info:', trackingInfo);
      } else {
        logger.warn(`No tracking info mapped for status: ${status}`);
      }

      return createResponse(
        'OK',
        updatedOrder,
        'Order status updated successfully'
      );
    } catch (error) {
      logger.error('Error updating order status:', error);
      return createResponse('ServerError', null, 'Error updating order status');
    }
  }

  async tipToDriver(
    orderId: string,
    tipAmount: number
  ): Promise<ApiResponse<Order>> {
    logger.log('check tipamount', tipAmount, typeof tipAmount);
    try {
      if (tipAmount < 0) {
        return createResponse(
          'InvalidFormatInput',
          null,
          'Tip amount cannot be negative'
        );
      }

      const order = await this.ordersRepository.findById(orderId);
      if (!order) {
        logger.log('❌ Order not found:', orderId);
        return createResponse('NotFound', null, 'Order not found');
      }

      if (!order.driver_id) {
        return createResponse(
          'NotFound',
          null,
          'No driver assigned to this order'
        );
      }

      if (
        order.status !== OrderStatus.DELIVERED &&
        order.status !== OrderStatus.EN_ROUTE &&
        order.status !== OrderStatus.RESTAURANT_PICKUP &&
        order.status !== OrderStatus.READY_FOR_PICKUP &&
        order.status !== OrderStatus.DISPATCHED
      ) {
        return createResponse(
          'Forbidden',
          null,
          'Can only tip when order is out for delivery or delivered'
        );
      }

      const updatedOrder = await this.dataSource.transaction(
        async transactionalEntityManager => {
          const updatedOrder = await transactionalEntityManager
            .getRepository(Order)
            .createQueryBuilder('order')
            .where('order.id = :orderId', { orderId })
            .getOne();

          if (!updatedOrder) throw new Error('Order not found in transaction');

          updatedOrder.driver_tips =
            (updatedOrder.driver_tips || 0) + tipAmount;
          await transactionalEntityManager.save(Order, updatedOrder);
          logger.log(
            '✅ Updated driver_tips:',
            tipAmount,
            'for order:',
            updatedOrder
          );

          const existingDPS = await transactionalEntityManager
            .getRepository(DriverProgressStage)
            .createQueryBuilder('dps')
            .where('dps.driver_id = :driverId', { driverId: order.driver_id })
            .andWhere('dps.current_state NOT LIKE :completedState', {
              completedState: 'delivery_complete_%'
            })
            .andWhere(
              'dps.id IN (SELECT driver_progress_id FROM driver_progress_orders WHERE order_id = :orderId)',
              { orderId }
            )
            .getOne();

          if (existingDPS) {
            existingDPS.total_tips =
              Number(existingDPS.total_tips || 0) + Number(tipAmount);
            await transactionalEntityManager.save(
              DriverProgressStage,
              existingDPS
            );
            logger.log(
              `[DEBUG] Updated DPS total_tips to ${existingDPS.total_tips} for driver ${order.driver_id}`
            );
          } else {
            logger.warn(
              `[DEBUG] No active DPS found for driver ${order.driver_id} with order ${orderId}`
            );
          }

          return updatedOrder;
        }
      );

      await this.driverStatsService.updateStatsForDriver(
        order.driver_id,
        'daily'
      );

      await this.driversGateway.notifyPartiesOnce(updatedOrder);
      logger.log(
        `Notified driver ${updatedOrder.driver_id} about tip of ${tipAmount} for order ${orderId}`
      );

      return createResponse('OK', updatedOrder, 'Driver tipped successfully');
    } catch (error) {
      logger.error('Error tipping driver:', error);
      return createResponse('ServerError', null, 'Error tipping driver');
    }
  }

  async findAll(): Promise<ApiResponse<Order[]>> {
    try {
      const orders = await this.ordersRepository.findAll();
      return createResponse('OK', orders, 'Fetched all orders');
    } catch (error) {
      return this.handleError('Error fetching orders:', error);
    }
  }

  async findOne(
    id: string,
    transactionalEntityManager?: EntityManager,
    relations: string[] = ['driver', 'customer', 'restaurant'] // Default relations for backward compatibility
  ): Promise<ApiResponse<Order>> {
    try {
      const manager = transactionalEntityManager || this.dataSource.manager;
      const order = await manager.getRepository(Order).findOne({
        where: { id },
        relations
      });
  
      return this.handleOrderResponse(order);
    } catch (error) {
      return this.handleError('Error fetching order:', error);
    }
  }

  async remove(id: string): Promise<ApiResponse<null>> {
    try {
      const deletedOrder = await this.ordersRepository.delete(id);
      if (!deletedOrder) {
        return createResponse('NotFound', null, 'Order not found');
      }
      return createResponse('OK', null, 'Order deleted successfully');
    } catch (error) {
      return this.handleError('Error deleting order:', error);
    }
  }

  private async validateOrderData(
    orderDto: CreateOrderDto | UpdateOrderDto
  ): Promise<true | ApiResponse<null>> {
    const {
      customer_id,
      restaurant_id,
      customer_location,
      restaurant_location,
      order_items
    } = orderDto;

    if (!customer_id) {
      return createResponse('MissingInput', null, 'Customer ID is required');
    }

    const customer = await this.customersRepository.findById(customer_id);
    if (!customer) {
      return createResponse('NotFound', null, 'Customer not found');
    }

    const restaurant = await this.restaurantRepository.findById(restaurant_id);
    if (!restaurant) {
      return createResponse('NotFound', null, 'Restaurant not found');
    }

    if (!restaurant.status.is_accepted_orders) {
      return createResponse(
        'NotAcceptingOrders',
        null,
        'Restaurant is not accepting orders'
      );
    }

    const customerAddress = await this.addressRepository.findById(customer_location);
    if (!customerAddress) {
      return createResponse('NotFound', null, 'Customer address not found');
    }

    const restaurantAddress = await this.addressRepository.findById(restaurant_location);
    if (!restaurantAddress) {
      return createResponse('NotFound', null, 'Restaurant address not found');
    }

    const itemValidation = await this.validateOrderItems(order_items);
    if (itemValidation !== true) {
      return itemValidation;
    }

    return true;
  }

  private async validateOrderItems(
    orderItems: any[]
  ): Promise<true | ApiResponse<null>> {
    for (const item of orderItems) {
      const menuItem = await this.menuItemsRepository.findById(item.item_id);
      if (!menuItem) {
        return createResponse(
          'NotFound',
          null,
          `Menu item ${item.item_id} not found`
        );
      }

      if (item.variant_id) {
        const variant = await this.menuItemVariantsRepository.findById(item.variant_id);
        if (!variant) {
          return createResponse(
            'NotFound',
            null,
            `Variant ${item.variant_id} not found for item ${item.item_id}`
          );
        }
      }
    }
    return true;
  }

  private async updateMenuItemPurchaseCount(orderItems: any[]): Promise<void> {
    for (const item of orderItems) {
      const menuItem = await this.menuItemsRepository.findById(item.item_id);
      if (menuItem) {
        const updateData = {
          purchase_count: (menuItem.purchase_count || 0) + 1,
          updated_at: Math.floor(Date.now() / 1000)
        };

        await this.menuItemsRepository.update(menuItem.id, updateData);
      }
    }
  }

  private handleOrderResponse(order: Order | null): ApiResponse<Order> {
    if (!order) {
      return createResponse('NotFound', null, 'Order not found');
    }
    return createResponse('OK', order, 'Order retrieved successfully');
  }

  private handleError(message: string, error: any): ApiResponse<null> {
    logger.error(message, error);
    return createResponse(
      'ServerError',
      null,
      'An error occurred while processing your request'
    );
  }
}