import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Order, OrderStatus } from './entities/order.entity';
import { ApiResponse } from 'src/utils/createResponse';
import { OrdersRepository } from './orders.repository';
import { RestaurantsGateway } from '../restaurants/restaurants.gateway';
import { AddressBookRepository } from 'src/address_book/address_book.repository';
import { RestaurantsRepository } from 'src/restaurants/restaurants.repository';
import { CustomersRepository } from 'src/customers/customers.repository';
import { MenuItemsRepository } from 'src/menu_items/menu_items.repository';
import { MenuItemVariantsRepository } from 'src/menu_item_variants/menu_item_variants.repository';
import { DataSource, EntityManager } from 'typeorm';
import { CartItemsRepository } from 'src/cart_items/cart_items.repository';
import { CustomersGateway } from 'src/customers/customers.gateway';
import { DriversGateway } from 'src/drivers/drivers.gateway';
import { TransactionService } from 'src/transactions/transactions.service';
import { FWalletsRepository } from 'src/fwallets/fwallets.repository';
import { DriverStatsService } from 'src/driver_stats_records/driver_stats_records.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
export declare class OrdersService {
    private readonly ordersRepository;
    private readonly menuItemsRepository;
    private readonly menuItemVariantsRepository;
    private readonly addressRepository;
    private readonly customersRepository;
    private readonly driverStatsService;
    private readonly restaurantRepository;
    private readonly addressBookRepository;
    private readonly restaurantsGateway;
    private readonly dataSource;
    private readonly cartItemsRepository;
    private readonly customersGateway;
    private readonly driversGateway;
    private readonly transactionsService;
    private readonly fWalletsRepository;
    private readonly eventEmitter;
    constructor(ordersRepository: OrdersRepository, menuItemsRepository: MenuItemsRepository, menuItemVariantsRepository: MenuItemVariantsRepository, addressRepository: AddressBookRepository, customersRepository: CustomersRepository, driverStatsService: DriverStatsService, restaurantRepository: RestaurantsRepository, addressBookRepository: AddressBookRepository, restaurantsGateway: RestaurantsGateway, dataSource: DataSource, cartItemsRepository: CartItemsRepository, customersGateway: CustomersGateway, driversGateway: DriversGateway, transactionsService: TransactionService, fWalletsRepository: FWalletsRepository, eventEmitter: EventEmitter2);
    createOrder(createOrderDto: CreateOrderDto): Promise<ApiResponse<any>>;
    notifyRestaurantAndDriver(order: Order): Promise<ApiResponse<any>>;
    update(id: string, updateOrderDto: UpdateOrderDto, transactionalEntityManager?: EntityManager): Promise<ApiResponse<Order>>;
    updateOrderStatus(orderId: string, status: OrderStatus, transactionalEntityManager?: EntityManager): Promise<ApiResponse<Order>>;
    tipToDriver(orderId: string, tipAmount: number): Promise<ApiResponse<Order>>;
    findAll(): Promise<ApiResponse<Order[]>>;
    findOne(id: string, transactionalEntityManager?: EntityManager, relations?: string[]): Promise<ApiResponse<Order>>;
    remove(id: string): Promise<ApiResponse<null>>;
    private validateOrderData;
    private validateOrderItems;
    private updateMenuItemPurchaseCount;
    private handleOrderResponse;
    private handleError;
}
