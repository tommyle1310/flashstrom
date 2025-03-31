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
const constants_1 = require("../utils/constants");
const orders_repository_1 = require("./orders.repository");
const restaurants_gateway_1 = require("../restaurants/restaurants.gateway");
const address_book_repository_1 = require("../address_book/address_book.repository");
const restaurants_repository_1 = require("../restaurants/restaurants.repository");
const customers_repository_1 = require("../customers/customers.repository");
const menu_items_repository_1 = require("../menu_items/menu_items.repository");
const menu_item_variants_repository_1 = require("../menu_item_variants/menu_item_variants.repository");
const order_entity_2 = require("./entities/order.entity");
const typeorm_1 = require("typeorm");
const cart_items_repository_1 = require("../cart_items/cart_items.repository");
const cart_item_entity_1 = require("../cart_items/entities/cart_item.entity");
const customers_gateway_1 = require("../customers/customers.gateway");
const drivers_gateway_1 = require("../drivers/drivers.gateway");
const transactions_service_1 = require("../transactions/transactions.service");
const fwallets_repository_1 = require("../fwallets/fwallets.repository");
const promotion_entity_1 = require("../promotions/entities/promotion.entity");
const promotion_entity_2 = require("../promotions/entities/promotion.entity");
const typeorm_2 = require("typeorm");
const menu_item_entity_1 = require("../menu_items/entities/menu_item.entity");
const restaurant_entity_1 = require("../restaurants/entities/restaurant.entity");
let OrdersService = class OrdersService {
    constructor(ordersRepository, menuItemsRepository, menuItemVariantsRepository, addressRepository, customersRepository, restaurantRepository, restaurantsGateway, dataSource, cartItemsRepository, customersGateway, driversGateway, transactionsService, fWalletsRepository) {
        this.ordersRepository = ordersRepository;
        this.menuItemsRepository = menuItemsRepository;
        this.menuItemVariantsRepository = menuItemVariantsRepository;
        this.addressRepository = addressRepository;
        this.customersRepository = customersRepository;
        this.restaurantRepository = restaurantRepository;
        this.restaurantsGateway = restaurantsGateway;
        this.dataSource = dataSource;
        this.cartItemsRepository = cartItemsRepository;
        this.customersGateway = customersGateway;
        this.driversGateway = driversGateway;
        this.transactionsService = transactionsService;
        this.fWalletsRepository = fWalletsRepository;
    }
    async createOrder(createOrderDto) {
        try {
            const validationResult = await this.validateOrderData(createOrderDto);
            if (validationResult !== true) {
                return validationResult;
            }
            console.log('check input', createOrderDto);
            const user = await this.customersRepository.findById(createOrderDto.customer_id);
            if (!user) {
                return (0, createResponse_1.createResponse)('NotFound', null, `Customer ${createOrderDto.customer_id} not found`);
            }
            const result = await this.dataSource.transaction(async (transactionalEntityManager) => {
                const menuItems = await transactionalEntityManager
                    .getRepository(menu_item_entity_1.MenuItem)
                    .findBy({
                    id: (0, typeorm_2.In)(createOrderDto.order_items.map(item => item.item_id))
                });
                let totalAmount = createOrderDto.total_amount;
                const appliedPromotions = [];
                if (createOrderDto.promotions_applied?.length > 0) {
                    const promotions = await transactionalEntityManager
                        .getRepository(promotion_entity_1.Promotion)
                        .find({
                        where: { id: (0, typeorm_2.In)(createOrderDto.promotions_applied) },
                        relations: ['food_categories']
                    });
                    for (const promotion of promotions) {
                        const now = Math.floor(Date.now() / 1000);
                        if (promotion.start_date > now ||
                            promotion.end_date < now ||
                            promotion.status !== promotion_entity_2.PromotionStatus.ACTIVE) {
                            continue;
                        }
                        if (!promotion.food_categories ||
                            promotion.food_categories.length === 0) {
                            if (promotion.discount_type === promotion_entity_2.DiscountType.FIXED) {
                                totalAmount = Math.max(0, totalAmount - promotion.discount_value);
                            }
                            else if (promotion.discount_type === promotion_entity_2.DiscountType.PERCENTAGE) {
                                totalAmount =
                                    totalAmount * (1 - promotion.discount_value / 100);
                            }
                            appliedPromotions.push(promotion);
                            continue;
                        }
                        const promotionCategories = promotion.food_categories.map(fc => fc.id);
                        createOrderDto.order_items = createOrderDto.order_items.map(orderItem => {
                            const menuItem = menuItems.find(mi => mi.id === orderItem.item_id);
                            if (!menuItem)
                                return orderItem;
                            const hasMatchingCategory = menuItem.category.some(cat => promotionCategories.includes(cat));
                            if (hasMatchingCategory) {
                                let discountedPrice = orderItem.price_at_time_of_order;
                                if (promotion.discount_type === promotion_entity_2.DiscountType.FIXED) {
                                    discountedPrice = Math.max(0, discountedPrice - promotion.discount_value);
                                }
                                else if (promotion.discount_type === promotion_entity_2.DiscountType.PERCENTAGE) {
                                    discountedPrice =
                                        discountedPrice * (1 - promotion.discount_value / 100);
                                }
                                const discount = (orderItem.price_at_time_of_order - discountedPrice) *
                                    orderItem.quantity;
                                totalAmount -= discount;
                                return {
                                    ...orderItem,
                                    price_at_time_of_order: discountedPrice
                                };
                            }
                            return orderItem;
                        });
                        appliedPromotions.push(promotion);
                    }
                }
                const orderData = {
                    ...createOrderDto,
                    total_amount: totalAmount,
                    promotions_applied: appliedPromotions,
                    status: createOrderDto.status,
                    tracking_info: order_entity_2.OrderTrackingInfo.ORDER_PLACED
                };
                if (createOrderDto.payment_method === 'FWallet') {
                    const customerWallet = await this.fWalletsRepository.findByUserId(user.user_id);
                    if (!customerWallet) {
                        return (0, createResponse_1.createResponse)('NotFound', null, `Wallet not found for customer ${createOrderDto.customer_id}`);
                    }
                    const restaurant = await this.restaurantRepository.findById(createOrderDto.restaurant_id);
                    if (!restaurant) {
                        return (0, createResponse_1.createResponse)('NotFound', null, `Restaurant ${createOrderDto.restaurant_id} not found`);
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
                        destination_type: 'FWALLET'
                    };
                    const transactionResponse = await this.transactionsService.create(transactionDto, transactionalEntityManager);
                    console.log('check transac res', transactionResponse);
                    if (transactionResponse.EC === -8) {
                        console.log('Transaction failed:', transactionResponse.EM);
                        return (0, createResponse_1.createResponse)('InsufficientBalance', null, 'Balance in the source wallet is not enough for this transaction.');
                    }
                    console.log('Transaction succeeded:', transactionResponse.data);
                }
                const cartItems = await transactionalEntityManager
                    .getRepository(cart_item_entity_1.CartItem)
                    .find({
                    where: { customer_id: createOrderDto.customer_id }
                });
                for (const orderItem of createOrderDto.order_items) {
                    const cartItem = cartItems.find(ci => ci.item_id === orderItem.item_id);
                    if (!cartItem) {
                        console.log(`Cart item with item_id ${orderItem.item_id} not found for customer ${createOrderDto.customer_id}. Proceeding without modifying cart.`);
                        continue;
                    }
                    const cartVariant = cartItem.variants.find(v => v.variant_id === orderItem.variant_id);
                    if (!cartVariant) {
                        console.log(`Variant ${orderItem.variant_id} not found in cart item ${cartItem.id}. Proceeding without modifying cart.`);
                        continue;
                    }
                    const orderQuantity = orderItem.quantity;
                    const cartQuantity = cartVariant.quantity;
                    if (orderQuantity > cartQuantity) {
                        return (0, createResponse_1.createResponse)('NotAcceptingOrders', null, `Order quantity (${orderQuantity}) exceeds cart quantity (${cartQuantity}) for item ${orderItem.item_id}, variant ${orderItem.variant_id}`);
                    }
                    if (orderQuantity === cartQuantity) {
                        await transactionalEntityManager
                            .getRepository(cart_item_entity_1.CartItem)
                            .delete(cartItem.id);
                        console.log(`Deleted cart item ${cartItem.id} as order quantity matches cart quantity`);
                    }
                    else if (orderQuantity < cartQuantity) {
                        const updatedVariants = cartItem.variants.map(v => v.variant_id === orderItem.variant_id
                            ? { ...v, quantity: v.quantity - orderQuantity }
                            : v);
                        await transactionalEntityManager
                            .getRepository(cart_item_entity_1.CartItem)
                            .update(cartItem.id, {
                            variants: updatedVariants,
                            updated_at: Math.floor(Date.now() / 1000),
                            item_id: cartItem.item_id,
                            customer_id: cartItem.customer_id,
                            restaurant_id: cartItem.restaurant_id
                        });
                        console.log(`Updated cart item ${cartItem.id} with reduced quantity`);
                    }
                }
                const orderRepository = transactionalEntityManager.getRepository(order_entity_1.Order);
                const newOrder = orderRepository.create(orderData);
                const savedOrder = await orderRepository.save(newOrder);
                await this.updateMenuItemPurchaseCount(createOrderDto.order_items);
                const restaurant = await transactionalEntityManager
                    .getRepository(restaurant_entity_1.Restaurant)
                    .findOne({ where: { id: createOrderDto.restaurant_id } });
                if (restaurant) {
                    await transactionalEntityManager
                        .getRepository(restaurant_entity_1.Restaurant)
                        .update(createOrderDto.restaurant_id, {
                        total_orders: restaurant.total_orders + 1,
                        updated_at: Math.floor(Date.now() / 1000)
                    });
                }
                else {
                    console.error(`Restaurant ${createOrderDto.restaurant_id} not found during order creation`);
                }
                const orderResponse = await this.notifyRestaurantAndDriver(savedOrder);
                console.log('Order transaction completed, result:', orderResponse);
                return (0, createResponse_1.createResponse)('OK', savedOrder, 'Order created in transaction');
            });
            if (!result || typeof result.EC === 'undefined') {
                return (0, createResponse_1.createResponse)('OK', result, 'Order created successfully');
            }
            if (result.EC !== 0) {
                return (0, createResponse_1.createResponse)('ServerError', result.data, result.EM);
            }
            console.log('Order fully committed to DB');
            return (0, createResponse_1.createResponse)('OK', result.data, 'Order created successfully');
        }
        catch (error) {
            console.error('Error creating order:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error creating order');
        }
    }
    async update(id, updateOrderDto, transactionalEntityManager) {
        try {
            const manager = transactionalEntityManager || this.dataSource.manager;
            const order = await manager.findOne(order_entity_1.Order, {
                where: { id },
                relations: ['promotions_applied']
            });
            if (!order) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Order not found');
            }
            let promotionsApplied = order.promotions_applied || [];
            if (updateOrderDto.promotions_applied?.length > 0) {
                promotionsApplied = await manager.getRepository(promotion_entity_1.Promotion).find({
                    where: {
                        id: (0, typeorm_2.In)(updateOrderDto.promotions_applied)
                    }
                });
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
                    : order.tracking_info
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
            console.log('🔍 Finding order:', orderId);
            const order = await manager.findOne(order_entity_1.Order, { where: { id: orderId } });
            console.log('📋 Found order:', order);
            if (!order) {
                console.log('❌ Order not found:', orderId);
                return (0, createResponse_1.createResponse)('NotFound', null, 'Order not found');
            }
            order.status = status;
            console.log('➡️ Updating order status to:', status);
            const updatedOrder = await manager.save(order_entity_1.Order, order);
            console.log('✅ Updated order:', updatedOrder);
            const trackingInfoMap = {
                [order_entity_2.OrderStatus.PENDING]: order_entity_2.OrderTrackingInfo.ORDER_PLACED,
                [order_entity_2.OrderStatus.RESTAURANT_ACCEPTED]: order_entity_2.OrderTrackingInfo.ORDER_RECEIVED,
                [order_entity_2.OrderStatus.PREPARING]: order_entity_2.OrderTrackingInfo.PREPARING,
                [order_entity_2.OrderStatus.IN_PROGRESS]: order_entity_2.OrderTrackingInfo.IN_PROGRESS,
                [order_entity_2.OrderStatus.READY_FOR_PICKUP]: order_entity_2.OrderTrackingInfo.PREPARING,
                [order_entity_2.OrderStatus.RESTAURANT_PICKUP]: order_entity_2.OrderTrackingInfo.RESTAURANT_PICKUP,
                [order_entity_2.OrderStatus.DISPATCHED]: order_entity_2.OrderTrackingInfo.DISPATCHED,
                [order_entity_2.OrderStatus.EN_ROUTE]: order_entity_2.OrderTrackingInfo.EN_ROUTE,
                [order_entity_2.OrderStatus.OUT_FOR_DELIVERY]: order_entity_2.OrderTrackingInfo.OUT_FOR_DELIVERY,
                [order_entity_2.OrderStatus.DELIVERY_FAILED]: order_entity_2.OrderTrackingInfo.DELIVERY_FAILED,
                [order_entity_2.OrderStatus.DELIVERED]: order_entity_2.OrderTrackingInfo.DELIVERED
            };
            const trackingInfo = trackingInfoMap[status];
            if (trackingInfo) {
                order.tracking_info = trackingInfo;
                await manager.save(order_entity_1.Order, order);
                console.log('✅ Updated tracking_info:', trackingInfo);
            }
            else {
                console.warn(`No tracking info mapped for status: ${status}`);
            }
            return (0, createResponse_1.createResponse)('OK', updatedOrder, 'Order status updated successfully');
        }
        catch (error) {
            console.error('Error updating order status:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error updating order status');
        }
    }
    async tipToDriver(orderId, tipAmount) {
        try {
            if (tipAmount < 0) {
                return (0, createResponse_1.createResponse)('InvalidFormatInput', null, 'Tip amount cannot be negative');
            }
            const order = await this.ordersRepository.findById(orderId);
            if (!order) {
                console.log('❌ Order not found:', orderId);
                return (0, createResponse_1.createResponse)('NotFound', null, 'Order not found');
            }
            if (!order.driver_id) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'No driver assigned to this order');
            }
            if (order.status !== order_entity_2.OrderStatus.DELIVERED &&
                order.status !== order_entity_2.OrderStatus.EN_ROUTE &&
                order.status !== order_entity_2.OrderStatus.RESTAURANT_PICKUP &&
                order.status !== order_entity_2.OrderStatus.READY_FOR_PICKUP &&
                order.status !== order_entity_2.OrderStatus.DISPATCHED) {
                return (0, createResponse_1.createResponse)('Forbidden', null, 'Can only tip when order is out for delivery or delivered');
            }
            const updatedOrder = await this.ordersRepository.updateDriverTips(orderId, tipAmount);
            console.log('✅ Updated driver_tips:', tipAmount, 'for order:', updatedOrder);
            await this.driversGateway.notifyPartiesOnce(updatedOrder);
            console.log(`Notified driver ${updatedOrder.driver_id} about tip of ${tipAmount} for order ${orderId}`);
            return (0, createResponse_1.createResponse)('OK', updatedOrder, 'Driver tipped successfully');
        }
        catch (error) {
            console.error('Error tipping driver:', error);
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
    async findOne(id, transactionalEntityManager) {
        try {
            const manager = transactionalEntityManager || this.dataSource.manager;
            const order = await manager.getRepository(order_entity_1.Order).findOne({
                where: { id },
                relations: ['driver', 'customer', 'restaurant']
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
            const variant = await this.menuItemVariantsRepository.findById(item.variant_id);
            if (!variant) {
                return (0, createResponse_1.createResponse)('NotFound', null, `Variant ${item.variant_id} not found for item ${item.item_id}`);
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
    async notifyRestaurantAndDriver(order) {
        const orderWithDriverWage = {
            ...order,
            driver_wage: constants_1.FIXED_DELIVERY_DRIVER_WAGE
        };
        await this.restaurantsGateway.handleNewOrder(orderWithDriverWage);
        await this.customersGateway.handleCustomerPlaceOrder(orderWithDriverWage);
        return orderWithDriverWage;
    }
    handleOrderResponse(order) {
        if (!order) {
            return (0, createResponse_1.createResponse)('NotFound', null, 'Order not found');
        }
        return (0, createResponse_1.createResponse)('OK', order, 'Order retrieved successfully');
    }
    handleError(message, error) {
        console.error(message, error);
        return (0, createResponse_1.createResponse)('ServerError', null, 'An error occurred while processing your request');
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __param(10, (0, common_1.Inject)((0, common_1.forwardRef)(() => drivers_gateway_1.DriversGateway))),
    __metadata("design:paramtypes", [orders_repository_1.OrdersRepository,
        menu_items_repository_1.MenuItemsRepository,
        menu_item_variants_repository_1.MenuItemVariantsRepository,
        address_book_repository_1.AddressBookRepository,
        customers_repository_1.CustomersRepository,
        restaurants_repository_1.RestaurantsRepository,
        restaurants_gateway_1.RestaurantsGateway,
        typeorm_1.DataSource,
        cart_items_repository_1.CartItemsRepository,
        customers_gateway_1.CustomersGateway,
        drivers_gateway_1.DriversGateway,
        transactions_service_1.TransactionService,
        fwallets_repository_1.FWalletsRepository])
], OrdersService);
//# sourceMappingURL=orders.service.js.map