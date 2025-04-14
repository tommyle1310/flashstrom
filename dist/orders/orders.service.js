"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const order_entity_1 = require("./entities/order.entity");
const createResponse_1 = require("../utils/createResponse");
const orders_repository_1 = require("./orders.repository");
const restaurants_gateway_1 = require("../restaurants/restaurants.gateway");
const address_book_repository_1 = require("../address_book/address_book.repository");
const restaurants_repository_1 = require("../restaurants/restaurants.repository");
const customers_repository_1 = require("../customers/customers.repository");
const menu_items_repository_1 = require("../menu_items/menu_items.repository");
const menu_item_variants_repository_1 = require("../menu_item_variants/menu_item_variants.repository");
const typeorm_1 = require("typeorm");
const cart_items_repository_1 = require("../cart_items/cart_items.repository");
const cart_item_entity_1 = require("../cart_items/entities/cart_item.entity");
const customers_gateway_1 = require("../customers/customers.gateway");
const drivers_gateway_1 = require("../drivers/drivers.gateway");
const transactions_service_1 = require("../transactions/transactions.service");
const fwallets_repository_1 = require("../fwallets/fwallets.repository");
const promotion_entity_1 = require("../promotions/entities/promotion.entity");
const menu_item_entity_1 = require("../menu_items/entities/menu_item.entity");
const restaurant_entity_1 = require("../restaurants/entities/restaurant.entity");
const driver_stats_records_service_1 = require("../driver_stats_records/driver_stats_records.service");
const driver_progress_stage_entity_1 = require("../driver_progress_stages/entities/driver_progress_stage.entity");
const event_emitter_1 = require("@nestjs/event-emitter");
const common_2 = require("@nestjs/common");
const logger = new common_2.Logger('OrdersService');
let OrdersService = class OrdersService {
    constructor(ordersRepository, menuItemsRepository, menuItemVariantsRepository, addressRepository, customersRepository, driverStatsService, restaurantRepository, addressBookRepository, restaurantsGateway, dataSource, cartItemsRepository, customersGateway, driversGateway, transactionsService, fWalletsRepository, eventEmitter) {
        this.ordersRepository = ordersRepository;
        this.menuItemsRepository = menuItemsRepository;
        this.menuItemVariantsRepository = menuItemVariantsRepository;
        this.addressRepository = addressRepository;
        this.customersRepository = customersRepository;
        this.driverStatsService = driverStatsService;
        this.restaurantRepository = restaurantRepository;
        this.addressBookRepository = addressBookRepository;
        this.restaurantsGateway = restaurantsGateway;
        this.dataSource = dataSource;
        this.cartItemsRepository = cartItemsRepository;
        this.customersGateway = customersGateway;
        this.driversGateway = driversGateway;
        this.transactionsService = transactionsService;
        this.fWalletsRepository = fWalletsRepository;
        this.eventEmitter = eventEmitter;
    }
    async createOrder(createOrderDto) {
        try {
            const validationResult = await this.validateOrderData(createOrderDto);
            if (validationResult !== true) {
                return validationResult;
            }
            logger.log('Input DTO:', createOrderDto);
            const user = await this.customersRepository.findById(createOrderDto.customer_id);
            if (!user) {
                return (0, createResponse_1.createResponse)('NotFound', null, `Customer ${createOrderDto.customer_id} not found`);
            }
            const result = await this.dataSource.transaction(async (transactionalEntityManager) => {
                const menuItems = await transactionalEntityManager
                    .getRepository(menu_item_entity_1.MenuItem)
                    .findBy({
                    id: (0, typeorm_1.In)(createOrderDto.order_items.map((item) => item.item_id)),
                });
                let totalAmount = createOrderDto.total_amount;
                let appliedPromotion = null;
                if (createOrderDto.promotion_applied) {
                    const promotion = await transactionalEntityManager
                        .getRepository(promotion_entity_1.Promotion)
                        .findOne({
                        where: { id: createOrderDto.promotion_applied },
                    });
                    if (promotion) {
                        const now = Math.floor(Date.now() / 1000);
                        if (promotion.start_date <= now &&
                            promotion.end_date >= now &&
                            promotion.status === 'ACTIVE') {
                            appliedPromotion = promotion;
                            totalAmount = 0;
                            createOrderDto.order_items = createOrderDto.order_items.map((orderItem) => {
                                const menuItem = menuItems.find((mi) => mi.id === orderItem.item_id);
                                if (!menuItem)
                                    return orderItem;
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
                    return (0, createResponse_1.createResponse)('NotFound', null, `Restaurant ${createOrderDto.restaurant_id} not found`);
                }
                const customerAddress = await this.addressBookRepository.findById(createOrderDto.customer_location);
                const restaurantAddress = await this.addressBookRepository.findById(createOrderDto.restaurant_location);
                if (!customerAddress) {
                    return (0, createResponse_1.createResponse)('NotFound', null, `Customer address ${createOrderDto.customer_location} not found`);
                }
                if (!restaurantAddress) {
                    return (0, createResponse_1.createResponse)('NotFound', null, `Restaurant address ${createOrderDto.restaurant_location} not found`);
                }
                const orderData = {
                    ...createOrderDto,
                    total_amount: totalAmount,
                    promotions_applied: appliedPromotion ? [appliedPromotion] : [],
                    status: createOrderDto.status || order_entity_1.OrderStatus.PENDING,
                    tracking_info: createOrderDto.tracking_info || order_entity_1.OrderTrackingInfo.ORDER_PLACED,
                    customerAddress: customerAddress,
                    restaurantAddress: restaurantAddress,
                    created_at: Math.floor(Date.now() / 1000),
                    updated_at: Math.floor(Date.now() / 1000),
                };
                if (createOrderDto.payment_method === 'FWallet') {
                    const customerWallet = await this.fWalletsRepository.findByUserId(user.user_id);
                    if (!customerWallet) {
                        return (0, createResponse_1.createResponse)('NotFound', null, `Wallet not found for customer ${createOrderDto.customer_id}`);
                    }
                    const restaurantWallet = await this.fWalletsRepository.findByUserId(restaurant.owner_id);
                    if (!restaurantWallet) {
                        return (0, createResponse_1.createResponse)('NotFound', null, `Wallet not found for restaurant ${createOrderDto.restaurant_id}`);
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
                    };
                    const transactionResponse = await this.transactionsService.create(transactionDto, transactionalEntityManager);
                    logger.log('Transaction response:', transactionResponse);
                    if (transactionResponse.EC === -8) {
                        return (0, createResponse_1.createResponse)('InsufficientBalance', null, 'Balance in the source wallet is not enough for this transaction.');
                    }
                }
                const cartItems = await transactionalEntityManager
                    .getRepository(cart_item_entity_1.CartItem)
                    .find({
                    where: { customer_id: createOrderDto.customer_id },
                });
                for (const orderItem of createOrderDto.order_items) {
                    const cartItem = cartItems.find((ci) => ci.item_id === orderItem.item_id);
                    if (cartItem) {
                        await transactionalEntityManager.getRepository(cart_item_entity_1.CartItem).delete(cartItem.id);
                        logger.log(`Deleted cart item ${cartItem.id}`);
                    }
                }
                const orderRepository = transactionalEntityManager.getRepository(order_entity_1.Order);
                const newOrder = orderRepository.create(orderData);
                const savedOrder = await orderRepository.save(newOrder);
                await this.updateMenuItemPurchaseCount(createOrderDto.order_items);
                await transactionalEntityManager
                    .getRepository(restaurant_entity_1.Restaurant)
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
                return (0, createResponse_1.createResponse)('OK', savedOrder, 'Order created in transaction');
            });
            if (!result || typeof result.EC === 'undefined') {
                return (0, createResponse_1.createResponse)('OK', result, 'Order created successfully');
            }
            if (result.EC !== 0) {
                return (0, createResponse_1.createResponse)('ServerError', result.data, result.EM);
            }
            logger.log('Order committed to DB');
            return (0, createResponse_1.createResponse)('OK', result.data, 'Order created successfully');
        }
        catch (error) {
            logger.error('Error creating order:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error creating order');
        }
    }
    async notifyRestaurantAndDriver(order) {
        const restaurant = await this.restaurantRepository.findById(order.restaurant_id);
        if (!restaurant) {
            return (0, createResponse_1.createResponse)('NotFound', null, `Restaurant ${order.restaurant_id} not found`);
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
        return (0, createResponse_1.createResponse)('OK', trackingUpdate, 'Notified successfully');
    }
    async update(id, updateOrderDto, transactionalEntityManager) {
        try {
            const manager = transactionalEntityManager || this.dataSource.manager;
            const order = await manager.findOne(order_entity_1.Order, {
                where: { id },
                relations: ['promotions_applied'],
            });
            if (!order) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Order not found');
            }
            let promotionsApplied = order.promotions_applied || [];
            if (updateOrderDto.promotion_applied) {
                const promotion = await manager.getRepository(promotion_entity_1.Promotion).findOne({
                    where: { id: updateOrderDto.promotion_applied },
                });
                promotionsApplied = promotion ? [promotion] : [];
            }
            const updatedData = {
                ...order,
                ...updateOrderDto,
                promotions_applied: promotionsApplied,
                status: updateOrderDto.status
                    ? updateOrderDto.status
                    : order.status,
                tracking_info: updateOrderDto.tracking_info
                    ? updateOrderDto.tracking_info
                    : order.tracking_info,
            };
            const updatedOrder = await manager.save(order_entity_1.Order, updatedData);
            return (0, createResponse_1.createResponse)('OK', updatedOrder, 'Order updated successfully');
        }
        catch (error) {
            return this.handleError('Error updating order:', error);
        }
    }
    async updateOrderStatus(orderId, status, transactionalEntityManager) {
        try {
            const manager = transactionalEntityManager || this.dataSource.manager;
            logger.log('🔍 Finding order:', orderId);
            const order = await manager.findOne(order_entity_1.Order, { where: { id: orderId } });
            logger.log('📋 Found order:', order);
            if (!order) {
                logger.log('❌ Order not found:', orderId);
                return (0, createResponse_1.createResponse)('NotFound', null, 'Order not found');
            }
            order.status = status;
            logger.log('➡️ Updating order status to:', status);
            const updatedOrder = await manager.save(order_entity_1.Order, order);
            logger.log('✅ Updated order:', updatedOrder);
            const trackingInfoMap = {
                [order_entity_1.OrderStatus.PENDING]: order_entity_1.OrderTrackingInfo.ORDER_PLACED,
                [order_entity_1.OrderStatus.RESTAURANT_ACCEPTED]: order_entity_1.OrderTrackingInfo.ORDER_RECEIVED,
                [order_entity_1.OrderStatus.PREPARING]: order_entity_1.OrderTrackingInfo.PREPARING,
                [order_entity_1.OrderStatus.IN_PROGRESS]: order_entity_1.OrderTrackingInfo.IN_PROGRESS,
                [order_entity_1.OrderStatus.READY_FOR_PICKUP]: order_entity_1.OrderTrackingInfo.PREPARING,
                [order_entity_1.OrderStatus.RESTAURANT_PICKUP]: order_entity_1.OrderTrackingInfo.RESTAURANT_PICKUP,
                [order_entity_1.OrderStatus.DISPATCHED]: order_entity_1.OrderTrackingInfo.DISPATCHED,
                [order_entity_1.OrderStatus.EN_ROUTE]: order_entity_1.OrderTrackingInfo.EN_ROUTE,
                [order_entity_1.OrderStatus.OUT_FOR_DELIVERY]: order_entity_1.OrderTrackingInfo.OUT_FOR_DELIVERY,
                [order_entity_1.OrderStatus.DELIVERY_FAILED]: order_entity_1.OrderTrackingInfo.DELIVERY_FAILED,
                [order_entity_1.OrderStatus.DELIVERED]: order_entity_1.OrderTrackingInfo.DELIVERED,
            };
            const trackingInfo = trackingInfoMap[status];
            if (trackingInfo) {
                order.tracking_info = trackingInfo;
                await manager.save(order_entity_1.Order, order);
                logger.log('✅ Updated tracking_info:', trackingInfo);
            }
            else {
                logger.warn(`No tracking info mapped for status: ${status}`);
            }
            return (0, createResponse_1.createResponse)('OK', updatedOrder, 'Order status updated successfully');
        }
        catch (error) {
            logger.error('Error updating order status:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error updating order status');
        }
    }
    async tipToDriver(orderId, tipAmount) {
        logger.log('check tipamount', tipAmount, typeof tipAmount);
        try {
            if (tipAmount < 0) {
                return (0, createResponse_1.createResponse)('InvalidFormatInput', null, 'Tip amount cannot be negative');
            }
            const order = await this.ordersRepository.findById(orderId);
            if (!order) {
                logger.log('❌ Order not found:', orderId);
                return (0, createResponse_1.createResponse)('NotFound', null, 'Order not found');
            }
            if (!order.driver_id) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'No driver assigned to this order');
            }
            if (order.status !== order_entity_1.OrderStatus.DELIVERED &&
                order.status !== order_entity_1.OrderStatus.EN_ROUTE &&
                order.status !== order_entity_1.OrderStatus.RESTAURANT_PICKUP &&
                order.status !== order_entity_1.OrderStatus.READY_FOR_PICKUP &&
                order.status !== order_entity_1.OrderStatus.DISPATCHED) {
                return (0, createResponse_1.createResponse)('Forbidden', null, 'Can only tip when order is out for delivery or delivered');
            }
            const updatedOrder = await this.dataSource.transaction(async (transactionalEntityManager) => {
                const updatedOrder = await transactionalEntityManager
                    .getRepository(order_entity_1.Order)
                    .createQueryBuilder('order')
                    .where('order.id = :orderId', { orderId })
                    .getOne();
                if (!updatedOrder)
                    throw new Error('Order not found in transaction');
                updatedOrder.driver_tips =
                    (updatedOrder.driver_tips || 0) + tipAmount;
                await transactionalEntityManager.save(order_entity_1.Order, updatedOrder);
                logger.log('✅ Updated driver_tips:', tipAmount, 'for order:', updatedOrder);
                const existingDPS = await transactionalEntityManager
                    .getRepository(driver_progress_stage_entity_1.DriverProgressStage)
                    .createQueryBuilder('dps')
                    .where('dps.driver_id = :driverId', { driverId: order.driver_id })
                    .andWhere('dps.current_state NOT LIKE :completedState', {
                    completedState: 'delivery_complete_%'
                })
                    .andWhere('dps.id IN (SELECT driver_progress_id FROM driver_progress_orders WHERE order_id = :orderId)', { orderId })
                    .getOne();
                if (existingDPS) {
                    existingDPS.total_tips =
                        Number(existingDPS.total_tips || 0) + Number(tipAmount);
                    await transactionalEntityManager.save(driver_progress_stage_entity_1.DriverProgressStage, existingDPS);
                    logger.log(`[DEBUG] Updated DPS total_tips to ${existingDPS.total_tips} for driver ${order.driver_id}`);
                }
                else {
                    logger.warn(`[DEBUG] No active DPS found for driver ${order.driver_id} with order ${orderId}`);
                }
                return updatedOrder;
            });
            await this.driverStatsService.updateStatsForDriver(order.driver_id, 'daily');
            await this.driversGateway.notifyPartiesOnce(updatedOrder);
            logger.log(`Notified driver ${updatedOrder.driver_id} about tip of ${tipAmount} for order ${orderId}`);
            return (0, createResponse_1.createResponse)('OK', updatedOrder, 'Driver tipped successfully');
        }
        catch (error) {
            logger.error('Error tipping driver:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error tipping driver');
        }
    }
    async findAll() {
        try {
            const orders = await this.ordersRepository.findAll();
            return (0, createResponse_1.createResponse)('OK', orders, 'Fetched all orders');
        }
        catch (error) {
            return this.handleError('Error fetching orders:', error);
        }
    }
    async findOne(id, transactionalEntityManager, relations = ['driver', 'customer', 'restaurant']) {
        try {
            const manager = transactionalEntityManager || this.dataSource.manager;
            const order = await manager.getRepository(order_entity_1.Order).findOne({
                where: { id },
                relations
            });
            return this.handleOrderResponse(order);
        }
        catch (error) {
            return this.handleError('Error fetching order:', error);
        }
    }
    async remove(id) {
        try {
            const deletedOrder = await this.ordersRepository.delete(id);
            if (!deletedOrder) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Order not found');
            }
            return (0, createResponse_1.createResponse)('OK', null, 'Order deleted successfully');
        }
        catch (error) {
            return this.handleError('Error deleting order:', error);
        }
    }
    async validateOrderData(orderDto) {
        const { customer_id, restaurant_id, customer_location, restaurant_location, order_items } = orderDto;
        if (!customer_id) {
            return (0, createResponse_1.createResponse)('MissingInput', null, 'Customer ID is required');
        }
        const customer = await this.customersRepository.findById(customer_id);
        if (!customer) {
            return (0, createResponse_1.createResponse)('NotFound', null, 'Customer not found');
        }
        const restaurant = await this.restaurantRepository.findById(restaurant_id);
        if (!restaurant) {
            return (0, createResponse_1.createResponse)('NotFound', null, 'Restaurant not found');
        }
        if (!restaurant.status.is_accepted_orders) {
            return (0, createResponse_1.createResponse)('NotAcceptingOrders', null, 'Restaurant is not accepting orders');
        }
        const customerAddress = await this.addressRepository.findById(customer_location);
        if (!customerAddress) {
            return (0, createResponse_1.createResponse)('NotFound', null, 'Customer address not found');
        }
        const restaurantAddress = await this.addressRepository.findById(restaurant_location);
        if (!restaurantAddress) {
            return (0, createResponse_1.createResponse)('NotFound', null, 'Restaurant address not found');
        }
        const itemValidation = await this.validateOrderItems(order_items);
        if (itemValidation !== true) {
            return itemValidation;
        }
        return true;
    }
    async validateOrderItems(orderItems) {
        for (const item of orderItems) {
            const menuItem = await this.menuItemsRepository.findById(item.item_id);
            if (!menuItem) {
                return (0, createResponse_1.createResponse)('NotFound', null, `Menu item ${item.item_id} not found`);
            }
            if (item.variant_id) {
                const variant = await this.menuItemVariantsRepository.findById(item.variant_id);
                if (!variant) {
                    return (0, createResponse_1.createResponse)('NotFound', null, `Variant ${item.variant_id} not found for item ${item.item_id}`);
                }
            }
        }
        return true;
    }
    async updateMenuItemPurchaseCount(orderItems) {
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
    handleOrderResponse(order) {
        if (!order) {
            return (0, createResponse_1.createResponse)('NotFound', null, 'Order not found');
        }
        return (0, createResponse_1.createResponse)('OK', order, 'Order retrieved successfully');
    }
    handleError(message, error) {
        logger.error(message, error);
        return (0, createResponse_1.createResponse)('ServerError', null, 'An error occurred while processing your request');
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __param(12, (0, common_1.Inject)((0, common_1.forwardRef)(() => drivers_gateway_1.DriversGateway))),
    __metadata("design:paramtypes", [orders_repository_1.OrdersRepository,
        menu_items_repository_1.MenuItemsRepository,
        menu_item_variants_repository_1.MenuItemVariantsRepository,
        address_book_repository_1.AddressBookRepository,
        customers_repository_1.CustomersRepository,
        driver_stats_records_service_1.DriverStatsService,
        restaurants_repository_1.RestaurantsRepository,
        address_book_repository_1.AddressBookRepository,
        restaurants_gateway_1.RestaurantsGateway,
        typeorm_1.DataSource,
        cart_items_repository_1.CartItemsRepository,
        customers_gateway_1.CustomersGateway,
        drivers_gateway_1.DriversGateway,
        transactions_service_1.TransactionService,
        fwallets_repository_1.FWalletsRepository,
        event_emitter_1.EventEmitter2])
], OrdersService);
//# sourceMappingURL=orders.service.js.map