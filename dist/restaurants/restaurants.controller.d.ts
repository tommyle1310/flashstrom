import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { UpdateMenuItemDto } from 'src/menu_items/dto/update-menu_item.dto';
import { CreateMenuItemDto } from 'src/menu_items/dto/create-menu_item.dto';
import { CreateMenuItemVariantDto } from 'src/menu_item_variants/dto/create-menu_item_variant.dto';
import { UpdateMenuItemVariantDto } from 'src/menu_item_variants/dto/update-menu_item_variant.dto';
export declare class RestaurantsController {
    private readonly restaurantsService;
    constructor(restaurantsService: RestaurantsService);
    create(createRestaurantDto: CreateRestaurantDto): Promise<import("../utils/createResponse").ApiResponse<import("./entities/restaurant.entity").Restaurant>>;
    applyPromotion(restaurantId: string, promotionId: string): Promise<import("../utils/createResponse").ApiResponse<any>>;
    findAll(): Promise<import("../utils/createResponse").ApiResponse<import("./entities/restaurant.entity").Restaurant[]>>;
    findOne(id: string): Promise<import("../utils/createResponse").ApiResponse<import("./entities/restaurant.entity").Restaurant>>;
    update(id: string, updateRestaurantDto: UpdateRestaurantDto): Promise<import("../utils/createResponse").ApiResponse<import("./entities/restaurant.entity").Restaurant>>;
    remove(id: string): Promise<import("../utils/createResponse").ApiResponse<boolean>>;
    createMenuItem(restaurantId: string, createMenuItemDto: CreateMenuItemDto): Promise<any>;
    getMenuItemsForRestaurant(restaurantId: string): Promise<any>;
    findOneMenuItem(restaurantId: string, id: string): Promise<import("../utils/createResponse").ApiResponse<import("./entities/restaurant.entity").Restaurant>>;
    updateMenuItem(restaurantId: string, id: string, updateMenuItemDto: UpdateMenuItemDto): Promise<any>;
    removeMenuItem(restaurantId: string, id: string): Promise<any>;
    createMenuItemVariant(variantId: string, createMenuItemVariantDto: CreateMenuItemVariantDto): Promise<any>;
    updateMenuItemVariant(variantId: string, updateMenuItemVariantDto: UpdateMenuItemVariantDto): Promise<any>;
    removeMenuItemVariantForRestaurant(variantId: string): Promise<any>;
}
