import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import {
  Order,
  OrderStatus,
  OrderTrackingInfo,
  OrderCancellationReason
} from './entities/order.entity';
import { createResponse, ApiResponse } from 'src/utils/createResponse';
// import { OrdersRepository } from './orders.repository';
// import { RestaurantsGateway } from '../restaurants/restaurants.gateway';
import { AddressBookRepository } from 'src/address_book/address_book.repository';
import { RestaurantsRepository } from 'src/restaurants/restaurants.repository';
import { CustomersRepository } from 'src/customers/customers.repository';
import { MenuItemsRepository } from 'src/menu_items/menu_items.repository';
import { MenuItemVariantsRepository } from 'src/menu_item_variants/menu_item_variants.repository';
import { DataSource, EntityManager, DeepPartial, Repository } from 'typeorm';
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
import { DriversService } from 'src/drivers/drivers.service';
import { createClient } from 'redis';
import * as dotenv from 'dotenv';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { RedisService } from 'src/redis/redis.service';

dotenv.config();

const logger = new Logger('OrdersService');

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redis.connect().catch(err => logger.error('Redis connection error:', err));

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) // Sử dụng Repository<Order> thay vì OrdersRepository
    private readonly ordersRepository: Repository<Order>,
    private readonly menuItemsRepository: MenuItemsRepository,
    private readonly menuItemVariantsRepository: MenuItemVariantsRepository,
    private readonly addressBookRepository: AddressBookRepository,
    private readonly customersRepository: CustomersRepository,
    private readonly driverStatsService: DriverStatsService,
    private readonly restaurantsRepository: RestaurantsRepository,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly cartItemsRepository: CartItemsRepository,
    private readonly customersGateway: CustomersGateway,
    @Inject(forwardRef(() => DriversGateway))
    private readonly driversGateway: DriversGateway,
    private readonly transactionService: TransactionService,
    private readonly fWalletsRepository: FWalletsRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly driverService: DriversService,
    private readonly redisService: RedisService
  ) {}

  async createOrder(createOrderDto: CreateOrderDto): Promise<ApiResponse<any>> {
    const start = Date.now();
    try {
      // 1. Batch fetch dữ liệu song song
      const fetchStart = Date.now();
      const [
        customer,
        restaurant,
        customerAddress,
        restaurantAddress,
        menuItems,
        variants,
        promotion,
        cartItems
      ] = await Promise.all([
        (async () => {
          const start = Date.now();
          const cacheKey = `customer:${createOrderDto.customer_id}`;
          const cached = await redis.get(cacheKey);
          if (cached) {
            logger.log(`Fetch customer (cache) took ${Date.now() - start}ms`);
            return JSON.parse(cached);
          }
          const result = await this.customersRepository.findById(
            createOrderDto.customer_id
          );
          if (result) {
            await redis.setEx(cacheKey, 7200, JSON.stringify(result));
            logger.log(`Stored customer in Redis: ${cacheKey}`);
          } else {
            logger.warn(`Customer not found: ${createOrderDto.customer_id}`);
          }
          logger.log(`Fetch customer took ${Date.now() - start}ms`);
          return result;
        })(),
        (async () => {
          const start = Date.now();
          const cacheKey = `restaurant:${createOrderDto.restaurant_id}`;
          const cached = await redis.get(cacheKey);
          if (cached) {
            logger.log(`Fetch restaurant (cache) took ${Date.now() - start}ms`);
            return JSON.parse(cached);
          }
          const result = await this.restaurantsRepository.findById(
            createOrderDto.restaurant_id
          );
          if (result) await redis.setEx(cacheKey, 7200, JSON.stringify(result));
          logger.log(`Fetch restaurant took ${Date.now() - start}ms`);
          return result;
        })(),
        (async () => {
          const start = Date.now();
          const cacheKey = `address:${createOrderDto.customer_location}`;
          const cached = await redis.get(cacheKey);
          if (cached) {
            logger.log(
              `Fetch customer address (cache) took ${Date.now() - start}ms`
            );
            return JSON.parse(cached);
          }
          const address = await this.addressBookRepository.findById(
            createOrderDto.customer_location
          );
          if (address)
            await redis.setEx(cacheKey, 7200, JSON.stringify(address));
          logger.log(`Fetch customer address took ${Date.now() - start}ms`);
          return address;
        })(),
        (async () => {
          const start = Date.now();
          const cacheKey = `address:${createOrderDto.restaurant_location}`;
          const cached = await redis.get(cacheKey);
          if (cached) {
            logger.log(
              `Fetch restaurant address (cache) took ${Date.now() - start}ms`
            );
            return JSON.parse(cached);
          }
          const address = await this.addressBookRepository.findById(
            createOrderDto.restaurant_location
          );
          if (address)
            await redis.setEx(cacheKey, 7200, JSON.stringify(address));
          logger.log(`Fetch restaurant address took ${Date.now() - start}ms`);
          return address;
        })(),
        (async () => {
          const start = Date.now();
          const itemIds = createOrderDto.order_items.map(item => item.item_id);
          const cacheKey = `menu_items:${itemIds.sort().join(',')}`; // Sử dụng danh sách item_id làm key
          const cached = await redis.get(cacheKey);
          if (cached) {
            logger.log(`Fetch menu items (cache) took ${Date.now() - start}ms`);
            return JSON.parse(cached);
          }
          const items = await this.menuItemsRepository.findByIds(itemIds);
          if (items.length > 0) {
            await redis.setEx(cacheKey, 7200, JSON.stringify(items));
            logger.log(`Stored menu items in Redis: ${cacheKey}`);
          } else {
            logger.warn(`No menu items found for IDs: ${itemIds.join(',')}`);
          }
          logger.log(`Fetch menu items took ${Date.now() - start}ms`);
          return items;
        })(),
        (async () => {
          const start = Date.now();
          const variantIds = createOrderDto.order_items
            .filter(item => item.variant_id)
            .map(item => item.variant_id);
          if (!variantIds.length) return [];
          const cacheKey = `variants:${variantIds.join(',')}`;
          const cached = await redis.get(cacheKey);
          if (cached) {
            logger.log(`Fetch variants (cache) took ${Date.now() - start}ms`);
            return JSON.parse(cached);
          }
          const variants =
            await this.menuItemVariantsRepository.findByIds(variantIds);
          await redis.setEx(cacheKey, 7200, JSON.stringify(variants));
          logger.log(`Fetch variants took ${Date.now() - start}ms`);
          return variants;
        })(),
        createOrderDto.promotion_applied
          ? (async () => {
              const start = Date.now();
              const cacheKey = `promotion:${createOrderDto.promotion_applied}`;
              const cached = await redis.get(cacheKey);
              if (cached) {
                logger.log(
                  `Fetch promotion (cache) took ${Date.now() - start}ms`
                );
                return JSON.parse(cached);
              }
              const promo = await this.dataSource
                .getRepository(Promotion)
                .findOne({ where: { id: createOrderDto.promotion_applied } });
              if (promo)
                await redis.setEx(cacheKey, 7200, JSON.stringify(promo));
              logger.log(`Fetch promotion took ${Date.now() - start}ms`);
              return promo;
            })()
          : Promise.resolve(null),
        (async () => {
          const start = Date.now();
          // Skip cart items nếu order_items đã đủ thông tin
          if (createOrderDto.order_items?.length > 0) {
            logger.log(`Skipping cart items fetch, using order_items`);
            return [];
          }
          const cacheKey = `cart_items:${createOrderDto.customer_id}`;
          const cached = await redis.get(cacheKey);
          if (cached) {
            logger.log(`Fetch cart items (cache) took ${Date.now() - start}ms`);
            return JSON.parse(cached);
          }
          const items = await this.cartItemsRepository.findByCustomerId(
            createOrderDto.customer_id,
            { take: 50 }
          );
          if (items.length > 0) {
            await redis.setEx(cacheKey, 600, JSON.stringify(items));
            logger.log(`Stored cart items in Redis: ${cacheKey}`);
          } else {
            logger.warn(
              `No cart items found for customer: ${createOrderDto.customer_id}`
            );
          }
          logger.log(`Fetch cart items took ${Date.now() - start}ms`);
          return items;
        })()
      ]);

      // Fetch wallets song song
      let customerWallet = null;
      let restaurantWallet = null;
      if (
        createOrderDto.payment_method === 'FWallet' &&
        customer &&
        restaurant
      ) {
        const walletStart = Date.now();
        [customerWallet, restaurantWallet] = await Promise.all([
          (async () => {
            const cacheKey = `fwallet:${customer.user_id}`;
            const cached = await redis.get(cacheKey);
            if (cached) {
              logger.log(
                `Fetch customer wallet (cache) took ${Date.now() - walletStart}ms`
              );
              return JSON.parse(cached);
            }
            const wallet = await this.fWalletsRepository.findByUserId(
              customer.user_id
            );
            if (wallet)
              await redis.setEx(cacheKey, 7200, JSON.stringify(wallet));
            logger.log(
              `Fetch customer wallet took ${Date.now() - walletStart}ms`
            );
            return wallet;
          })(),
          (async () => {
            const cacheKey = `fwallet:${restaurant.owner_id}`;
            const cached = await redis.get(cacheKey);
            if (cached) {
              logger.log(
                `Fetch restaurant wallet (cache) took ${Date.now() - walletStart}ms`
              );
              return JSON.parse(cached);
            }
            const wallet = await this.fWalletsRepository.findByUserId(
              restaurant.owner_id
            );
            if (wallet)
              await redis.setEx(cacheKey, 7200, JSON.stringify(wallet));
            logger.log(
              `Fetch restaurant wallet took ${Date.now() - walletStart}ms`
            );
            return wallet;
          })()
        ]);
      }
      logger.log(`Data fetch took ${Date.now() - fetchStart}ms`);

      // 2. Validate input
      const validationStart = Date.now();
      const validationResult = await this.validateOrderData(createOrderDto, {
        customer,
        restaurant,
        customerAddress,
        restaurantAddress,
        menuItems,
        variants
      });
      logger.log(`Validation took ${Date.now() - validationStart}ms`);
      if (validationResult !== true) {
        return validationResult;
      }

      // 3. Kiểm tra dữ liệu
      if (!customer) {
        return createResponse(
          'NotFound',
          null,
          `Customer ${createOrderDto.customer_id} not found`
        );
      }
      if (!restaurant) {
        return createResponse(
          'NotFound',
          null,
          `Restaurant ${createOrderDto.restaurant_id} not found`
        );
      }
      if (!customerAddress) {
        return createResponse(
          'NotFound',
          null,
          `Customer address ${createOrderDto.customer_location} not found`
        );
      }
      if (!restaurantAddress) {
        return createResponse(
          'NotFound',
          null,
          `Restaurant address ${createOrderDto.restaurant_location} not found`
        );
      }
      if (
        createOrderDto.payment_method === 'FWallet' &&
        (!customerWallet || !restaurantWallet)
      ) {
        logger.log(
          'Check customer wallet:',
          customerWallet,
          'restaurant wallet:',
          restaurantWallet
        );
        return createResponse('NotFound', null, `Wallet not found`);
      }

      // 4. Tính total_amount và promotion
      const calcStart = Date.now();
      let totalAmount = createOrderDto.total_amount;
      let appliedPromotion: Promotion | null = null;

      const menuItemMap = new Map(menuItems.map(mi => [mi.id, mi]));
      if (promotion && createOrderDto.promotion_applied) {
        const now = Math.floor(Date.now() / 1000);
        if (
          promotion.start_date <= now &&
          promotion.end_date >= now &&
          promotion.status === 'ACTIVE'
        ) {
          appliedPromotion = promotion;
          totalAmount = createOrderDto.order_items.reduce((sum, orderItem) => {
            const menuItem = menuItemMap.get(orderItem.item_id);
            if (!menuItem) return sum;
            const priceToUse =
              orderItem.price_after_applied_promotion ??
              orderItem.price_at_time_of_order;
            orderItem.price_at_time_of_order = priceToUse;
            return sum + priceToUse * orderItem.quantity;
          }, 0);
        }
      }
      logger.log(`Calculation took ${Date.now() - calcStart}ms`);

      // 5. Transaction
      const txStart = Date.now();
      const result = await this.dataSource.transaction(
        async transactionalEntityManager => {
          // Tạo order với minimal relations
          const orderData: DeepPartial<Order> = {
            ...createOrderDto,
            total_amount: totalAmount,
            promotions_applied: appliedPromotion ? [appliedPromotion] : [],
            status:
              (createOrderDto.status as OrderStatus) || OrderStatus.PENDING,
            tracking_info:
              (createOrderDto.tracking_info as OrderTrackingInfo) ||
              OrderTrackingInfo.ORDER_PLACED,
            customerAddress: { id: customerAddress.id },
            restaurantAddress: { id: restaurantAddress.id },
            created_at: Math.floor(Date.now() / 1000),
            updated_at: Math.floor(Date.now() / 1000)
          };

          // Xử lý thanh toán FWallet
          if (createOrderDto.payment_method === 'FWallet') {
            const txServiceStart = Date.now();
            const transactionDto = {
              user_id: customer.user_id,
              fwallet_id: customerWallet!.id,
              transaction_type: 'PURCHASE',
              amount: totalAmount,
              balance_after: Number(customerWallet!.balance) - totalAmount,
              status: 'PENDING',
              source: 'FWALLET',
              destination: restaurantWallet!.id,
              destination_type: 'FWALLET',
              version: customerWallet!.version || 0
            } as CreateTransactionDto;

            const transactionResponse = await this.transactionService.create(
              transactionDto,
              transactionalEntityManager
            );
            logger.log(
              `Transaction service took ${Date.now() - txServiceStart}ms`
            );
            if (transactionResponse.EC !== 0) {
              return transactionResponse;
            }
          }

          // Lưu order
          const newOrder = this.ordersRepository.create(orderData as any);
          const savedOrder = await transactionalEntityManager.save(
            Order,
            newOrder as any
          );

          // Cập nhật restaurant total_orders
          await transactionalEntityManager
            .createQueryBuilder()
            .update(Restaurant)
            .set({
              total_orders: () => `total_orders + 1`,
              updated_at: Math.floor(Date.now() / 1000)
            })
            .where('id = :id', { id: createOrderDto.restaurant_id })
            .execute();

          return createResponse(
            'OK',
            savedOrder,
            'Order created in transaction'
          );
        }
      );
      logger.log(`Transaction took ${Date.now() - txStart}ms`);

      if (result.EC !== 0) {
        return result;
      }
      const savedOrder = result.data as Order;

      // Xóa cart items bất đồng bộ
      if (cartItems.length > 0) {
        this.dataSource
          .createQueryBuilder()
          .update(CartItem)
          .set({ deleted_at: Math.floor(Date.now() / 1000) })
          .where('customer_id = :customerId', {
            customerId: createOrderDto.customer_id
          })
          .execute()
          .then(() => redis.del(`cart_items:${createOrderDto.customer_id}`))
          .catch(err => logger.error('Error deleting cart items:', err));
      }

      // Cập nhật menu item purchase count bất đồng bộ
      this.updateMenuItemPurchaseCount(createOrderDto.order_items).catch(err =>
        logger.error('Error updating menu item purchase count:', err)
      );

      // 6. Emit event
      const emitStart = Date.now();
      const eventId = `${savedOrder.id}-${Date.now()}`;
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
        eventId
      };

      // Emit chỉ 1 lần, dùng Redis để deduplicate
      const redisResult = await redis.set(`event:${eventId}`, '1', {
        NX: true,
        EX: 60
      });
      logger.log(`Emitting event ${eventId} with redisResult: ${redisResult}`);
      console.log('ceẹccejck redsi', redisResult);
      if (redisResult === 'OK') {
        this.notifyOrderStatus(trackingUpdate as any);
        this.eventEmitter.emit('listenUpdateOrderTracking', trackingUpdate);
        this.eventEmitter.emit('newOrderForRestaurant', {
          restaurant_id: savedOrder.restaurant_id,
          order: trackingUpdate
        });
        logger.log('check tracking update', trackingUpdate);
      } else {
        logger.log(`Event ${eventId} already emitted, skipped`);
      }
      logger.log(`Emit events took ${Date.now() - emitStart}ms`);
      logger.log(`Total execution took ${Date.now() - start}ms`);

      return result;
    } catch (error: any) {
      logger.error('Error creating order:', error);
      return createResponse('ServerError', null, 'Error creating order');
    }
  }

  async assignDriver(orderId: string, driverId: string) {
    const lockKey = `lock:order:assign:${orderId}`;
    const lockAcquired = await this.redisService.setNx(
      lockKey,
      driverId,
      300000
    ); // TTL 5 phút
    if (!lockAcquired) {
      console.log(
        `[OrdersService] Skipping duplicated assignDriver for order ${orderId}`
      );
      return;
    }

    try {
      const order = await this.ordersRepository.findOne({
        where: { id: orderId },
        relations: ['restaurantAddress', 'customerAddress']
      });

      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      order.driver_id = driverId;
      order.status = OrderStatus.DISPATCHED;
      await this.ordersRepository.save(order); // Sử dụng save của Repository<Order>

      this.eventEmitter.emit('order.assignedToDriver', { orderId, driverId });
      await this.notifyOrderStatus(order);
    } finally {
      await this.redisService.del(lockKey);
    }
  }

  async notifyOrderStatus(order: Order) {
    const lockKey = `lock:notify:order:${order.id}`;
    const lockAcquired = await this.redisService.setNx(
      lockKey,
      'notified',
      60000
    ); // TTL 1 phút
    if (!lockAcquired) {
      console.log(
        `[OrdersService] Skipping notify due to existing lock: ${order.id}`
      );
      return;
    }

    try {
      console.log(`Emitted notifyOrderStatus for order ${order.id}`);
      this.eventEmitter.emit('notifyOrderStatus', {
        orderId: order.id,
        status: order.status,
        customerId: order.customer_id,
        restaurantId: order.restaurant_id,
        driverId: order.driver_id
      });

      if (order.customer_id) {
        console.log(
          `Emitted notifyOrderStatus to customer_${order.customer_id}`
        );
        this.eventEmitter.emit('notifyOrderStatus', {
          room: `customer_${order.customer_id}`,
          orderId: order.id,
          status: order.status
        });
      }
    } finally {
      await this.redisService.del(lockKey);
    }
  }

  private async updateMenuItemPurchaseCount(
    orderItems: any[],
    transactionalEntityManager?: EntityManager
  ): Promise<void> {
    const manager = transactionalEntityManager || this.dataSource.manager;
    const updates = orderItems.map(item => ({
      id: item.item_id,
      purchase_count: () => `COALESCE(purchase_count, 0) + 1`,
      updated_at: Math.floor(Date.now() / 1000)
    }));

    if (updates.length > 0) {
      await manager
        .createQueryBuilder()
        .update(MenuItem)
        .set({
          purchase_count: () => `COALESCE(purchase_count, 0) + 1`,
          updated_at: Math.floor(Date.now() / 1000)
        })
        .where('id IN (:...ids)', { ids: updates.map(u => u.id) })
        .execute();
    }
  }

  async notifyRestaurantAndDriver(order: Order): Promise<ApiResponse<any>> {
    const restaurant = await this.restaurantsRepository.findById(
      order.restaurant_id
    );
    if (!restaurant) {
      return createResponse(
        'NotFound',
        null,
        `Restaurant ${order.restaurant_id} not found`
      );
    }
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
        relations: ['promotions_applied']
      });
      if (!order) {
        return createResponse('NotFound', null, 'Order not found');
      }

      let promotionsApplied: Promotion[] = order.promotions_applied || [];
      if (updateOrderDto.promotion_applied) {
        const promotion = await manager.getRepository(Promotion).findOne({
          where: { id: updateOrderDto.promotion_applied }
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
          : order.tracking_info
      };

      const updatedOrder = await manager.save(Order, updatedData);
      return createResponse('OK', updatedOrder, 'Order updated successfully');
    } catch (error: any) {
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
        [OrderStatus.DELIVERED]: OrderTrackingInfo.DELIVERED
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
    } catch (error: any) {
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

      const order = await this.ordersRepository.findOneOrFail({
        where: { id: orderId }
      });
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
            .findOne({ where: { id: orderId } });

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
    } catch (error: any) {
      logger.error('Error tipping driver:', error);
      return createResponse('ServerError', null, 'Error tipping driver');
    }
  }

  async findAll(): Promise<ApiResponse<Order[]>> {
    try {
      const orders = await this.ordersRepository.find();
      return createResponse('OK', orders, 'Fetched all orders');
    } catch (error: any) {
      return this.handleError('Error fetching orders:', error);
    }
  }

  async findOne(
    id: string,
    transactionalEntityManager?: EntityManager,
    relations: string[] = ['driver', 'customer', 'restaurant']
  ): Promise<ApiResponse<Order>> {
    try {
      const manager = transactionalEntityManager || this.dataSource.manager;
      const order = await manager
        .getRepository(Order)
        .findOne({ where: { id }, relations });
      return this.handleOrderResponse(order);
    } catch (error: any) {
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
    } catch (error: any) {
      return this.handleError('Error deleting order:', error);
    }
  }

  async cancelOrder(
    orderId: string,
    cancelledBy: 'customer' | 'restaurant' | 'driver',
    cancelledById: string,
    reason: OrderCancellationReason,
    title: string,
    description: string
  ): Promise<ApiResponse<Order>> {
    try {
      const order = await this.ordersRepository.findOneOrFail({
        where: { id: orderId }
      });
      if (!order) {
        return createResponse('NotFound', null, 'Order not found');
      }

      // Validate the cancelling entity exists
      let entityExists = false;
      switch (cancelledBy) {
        case 'customer':
          const customer =
            await this.customersRepository.findById(cancelledById);
          entityExists = !!customer;
          break;
        case 'restaurant':
          const restaurant =
            await this.restaurantsRepository.findById(cancelledById);
          entityExists = !!restaurant;
          break;
        case 'driver':
          const driver = await this.driverService.findDriverById(cancelledById);
          entityExists = !!driver;
          break;
      }

      if (!entityExists) {
        return createResponse(
          'NotFound',
          null,
          `${cancelledBy} with ID ${cancelledById} not found`
        );
      }

      // Check if order can be cancelled based on its current status
      if (!this.canOrderBeCancelled(order.status)) {
        return createResponse(
          'Forbidden',
          null,
          'Order cannot be cancelled in its current status'
        );
      }

      const updatedOrder = await this.dataSource.transaction(
        async transactionalEntityManager => {
          const orderToUpdate = await transactionalEntityManager
            .getRepository(Order)
            .findOne({ where: { id: orderId } });
          if (!orderToUpdate) throw new Error('Order not found in transaction');

          orderToUpdate.status = OrderStatus.CANCELLED;
          orderToUpdate.tracking_info = OrderTrackingInfo.CANCELLED;
          orderToUpdate.cancelled_by = cancelledBy;
          orderToUpdate.cancelled_by_id = cancelledById;
          orderToUpdate.cancellation_reason = reason;
          orderToUpdate.cancellation_title = title;
          orderToUpdate.cancellation_description = description;
          orderToUpdate.cancelled_at = Math.floor(Date.now() / 1000);
          orderToUpdate.updated_at = Math.floor(Date.now() / 1000);

          await transactionalEntityManager.save(Order, orderToUpdate);
          return orderToUpdate;
        }
      );

      await this.notifyRestaurantAndDriver(updatedOrder);
      return createResponse('OK', updatedOrder, 'Order cancelled successfully');
    } catch (error: any) {
      logger.error('Error cancelling order:', error);
      return createResponse('ServerError', null, 'Error cancelling order');
    }
  }

  private canOrderBeCancelled(status: OrderStatus): boolean {
    const nonCancellableStatuses = [
      OrderStatus.DELIVERED,
      OrderStatus.CANCELLED,
      OrderStatus.RETURNED,
      OrderStatus.DELIVERY_FAILED
    ];
    return !nonCancellableStatuses.includes(status);
  }

  private async validateOrderData(
    orderDto: CreateOrderDto | UpdateOrderDto,
    fetchedData: {
      customer: any;
      restaurant: any;
      customerAddress: any;
      restaurantAddress: any;
      menuItems: any[];
      variants: any[];
    }
  ): Promise<true | ApiResponse<null>> {
    const validationStart = Date.now();
    const { customer_id, order_items } = orderDto;

    if (!customer_id) {
      logger.log(
        `Validation failed: Customer ID missing (${Date.now() - validationStart}ms)`
      );
      return createResponse('MissingInput', null, 'Customer ID is required');
    }

    if (!fetchedData.customer) {
      logger.log(
        `Validation failed: Customer not found (${Date.now() - validationStart}ms)`
      );
      return createResponse('NotFound', null, 'Customer not found');
    }

    if (!fetchedData.restaurant) {
      logger.log(
        `Validation failed: Restaurant not found (${Date.now() - validationStart}ms)`
      );
      return createResponse('NotFound', null, 'Restaurant not found');
    }

    if (!fetchedData.restaurant.status.is_accepted_orders) {
      logger.log(
        `Validation failed: Restaurant not accepting orders (${Date.now() - validationStart}ms)`
      );
      return createResponse(
        'NotAcceptingOrders',
        null,
        'Restaurant is not accepting orders'
      );
    }

    if (!fetchedData.customerAddress) {
      logger.log(
        `Validation failed: Customer address not found (${Date.now() - validationStart}ms)`
      );
      return createResponse('NotFound', null, 'Customer address not found');
    }

    if (!fetchedData.restaurantAddress) {
      logger.log(
        `Validation failed: Restaurant address not found (${Date.now() - validationStart}ms)`
      );
      return createResponse('NotFound', null, 'Restaurant address not found');
    }

    const itemValidation = await this.validateOrderItems(
      order_items,
      fetchedData.menuItems,
      fetchedData.variants
    );
    logger.log(`Item validation took ${Date.now() - validationStart}ms`);
    if (itemValidation !== true) {
      return itemValidation;
    }

    logger.log(`Validation passed (${Date.now() - validationStart}ms)`);
    return true;
  }

  private async validateOrderItems(
    orderItems: any[],
    menuItems: any[],
    variants: any[]
  ): Promise<true | ApiResponse<null>> {
    const validationStart = Date.now();
    const menuItemMap = new Map(menuItems.map(item => [item.id, item]));
    const variantMap = new Map(variants.map(variant => [variant.id, variant]));

    for (const item of orderItems) {
      if (!menuItemMap.has(item.item_id)) {
        logger.warn(
          `Menu item ${item.item_id} not in cache, trying direct fetch`
        );
        const menuItem = await this.menuItemsRepository.findById(item.item_id);
        if (!menuItem) {
          logger.log(
            `Item validation failed: Menu item ${item.item_id} not found (${Date.now() - validationStart}ms)`
          );
          return createResponse(
            'NotFound',
            null,
            `Menu item ${item.item_id} not found`
          );
        }
        menuItemMap.set(item.item_id, menuItem);
      }

      if (item.variant_id && !variantMap.has(item.variant_id)) {
        logger.log(
          `Item validation failed: Variant ${item.variant_id} not found (${Date.now() - validationStart}ms)`
        );
        return createResponse(
          'NotFound',
          null,
          `Variant ${item.variant_id} not found for item ${item.item_id}`
        );
      }
    }

    logger.log(`Item validation passed (${Date.now() - validationStart}ms)`);
    return true;
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
