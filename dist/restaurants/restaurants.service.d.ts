import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { MenuItemsService } from 'src/menu_items/menu_items.service';
import { CreateMenuItemDto } from 'src/menu_items/dto/create-menu_item.dto';
import { UpdateMenuItemDto } from 'src/menu_items/dto/update-menu_item.dto';
import { CreateMenuItemVariantDto } from 'src/menu_item_variants/dto/create-menu_item_variant.dto';
import { MenuItemVariantsService } from 'src/menu_item_variants/menu_item_variants.service';
import { UpdateMenuItemVariantDto } from 'src/menu_item_variants/dto/update-menu_item_variant.dto';
import { UserRepository } from 'src/users/users.repository';
import { ApiResponse } from 'src/utils/createResponse';
import { PromotionsRepository } from 'src/promotions/promotions.repository';
import { AddressBookRepository } from 'src/address_book/address_book.repository';
import { Restaurant } from './entities/restaurant.entity';
import { RestaurantsRepository } from './restaurants.repository';
import { OrdersRepository } from 'src/orders/orders.repository';
import { RestaurantsGateway } from 'src/restaurants/restaurants.gateway';
import { FoodCategoriesRepository } from 'src/food_categories/food_categories.repository';
import { FWalletsRepository } from 'src/fwallets/fwallets.repository';
import { TransactionService } from 'src/transactions/transactions.service';
import { MenuItemsRepository } from 'src/menu_items/menu_items.repository';
export declare class RestaurantsService {
    private readonly restaurantsRepository;
    private readonly userRepository;
    private readonly promotionRepository;
    private readonly addressRepository;
    private readonly ordersRepository;
    private readonly menuItemRepository;
    private readonly menuItemsService;
    private readonly menuItemVariantsService;
    private readonly transactionsService;
    private readonly restaurantsGateway;
    private readonly foodCategoryRepository;
    private readonly fWalletsRepository;
    constructor(restaurantsRepository: RestaurantsRepository, userRepository: UserRepository, promotionRepository: PromotionsRepository, addressRepository: AddressBookRepository, ordersRepository: OrdersRepository, menuItemRepository: MenuItemsRepository, menuItemsService: MenuItemsService, menuItemVariantsService: MenuItemVariantsService, transactionsService: TransactionService, restaurantsGateway: RestaurantsGateway, foodCategoryRepository: FoodCategoriesRepository, fWalletsRepository: FWalletsRepository);
    create(createRestaurantDto: CreateRestaurantDto): Promise<ApiResponse<Restaurant>>;
    update(id: string, updateRestaurantDto: UpdateRestaurantDto): Promise<ApiResponse<Restaurant>>;
    updateEntityAvatar(uploadResult: {
        url: string;
        public_id: string;
    }, entityId: string): Promise<ApiResponse<any>>;
    createMenuItemForRestaurant(restaurantId: string, createMenuItemDto: CreateMenuItemDto): Promise<any>;
    updateMenuItemForRestaurant(restaurantId: string, menuItemId: string, updateMenuItemDto: UpdateMenuItemDto): Promise<any>;
    deleteMenuItemForRestaurant(restaurantId: string, menuItemId: string): Promise<any>;
    private calculateDiscountedPrice;
    getMenuItemsForRestaurant(restaurantId: string): Promise<any>;
    createMenuItemVariantForRestaurant(menuId: string, createMenuItemVariantDto: CreateMenuItemVariantDto): Promise<any>;
    updateMenuItemVariantForRestaurant(variantId: string, updateMenuItemVariantDto: UpdateMenuItemVariantDto): Promise<any>;
    deleteMenuItemVariantForRestaurant(menuItemVariantId: string): Promise<any>;
    getOrderById(orderId: string): Promise<import("src/orders/entities/order.entity").Order>;
    updateOrderStatus(orderId: string, status: string): Promise<any>;
    findAll(): Promise<ApiResponse<Restaurant[]>>;
    findOne(id: string): Promise<ApiResponse<Restaurant>>;
    remove(id: string): Promise<ApiResponse<boolean>>;
    updateImageGalleries(uploadResults: Array<{
        key: string;
        url: string;
    }>, entityId: string): Promise<ApiResponse<any>>;
    applyPromotion(restaurantId: string, promotionId: string): Promise<ApiResponse<any>>;
}
