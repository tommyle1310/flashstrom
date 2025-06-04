import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query
} from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { UpdateMenuItemDto } from 'src/menu_items/dto/update-menu_item.dto';
import { CreateMenuItemDto } from 'src/menu_items/dto/create-menu_item.dto';
import { CreateMenuItemVariantDto } from 'src/menu_item_variants/dto/create-menu_item_variant.dto';
import { UpdateMenuItemVariantDto } from 'src/menu_item_variants/dto/update-menu_item_variant.dto';
import { ApiResponse } from 'src/utils/createResponse';
import { Restaurant } from './entities/restaurant.entity';
import { ToggleRestaurantAvailabilityDto } from './dto/restaurant-availability.dto';
import { OrdersService } from 'src/orders/orders.service';

@Controller('restaurants')
export class RestaurantsController {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly ordersService: OrdersService
  ) {}

  @Post()
  create(@Body() createRestaurantDto: CreateRestaurantDto) {
    return this.restaurantsService.create(createRestaurantDto);
  }

  @Post('apply-promotion')
  applyPromotion(
    @Body('restaurantId') restaurantId: string,
    @Body('promotionId') promotionId: string
  ) {
    return this.restaurantsService.applyPromotion(restaurantId, promotionId);
  }

  @Post('/accept-order/:orderId/:restaurantId')
  async acceptOrder(
    @Param('orderId') orderId: string,
    @Param('restaurantId') restaurantId: string
  ): Promise<any> {
    return this.ordersService.restaurantAcceptOrder(orderId, restaurantId);
  }

  @Post('clear-redis')
  clearRedis(): Promise<ApiResponse<null>> {
    return this.restaurantsService.clearRedis();
  }

  @Get()
  findAll() {
    return this.restaurantsService.findAll();
  }

  @Get('paginated')
  findAllPaginated(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ) {
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    return this.restaurantsService.findAllPaginated(parsedPage, parsedLimit);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ApiResponse<Restaurant>> {
    return this.restaurantsService.findOne(id);
  }

  @Get(':id/ratings-reviews')
  async getRestaurantRatingsReviews(@Param('id') id: string) {
    return this.restaurantsService.getRestaurantRatingsReviews(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateRestaurantDto: UpdateRestaurantDto
  ) {
    return this.restaurantsService.update(id, updateRestaurantDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.restaurantsService.remove(id);
  }

  // Create a menu item for a specific restaurant
  @Post('/menu-items/:restaurantId')
  createMenuItem(
    @Param('restaurantId') restaurantId: string, // Get restaurantId from the URL
    @Body() createMenuItemDto: CreateMenuItemDto // Get menu item data from the body
  ) {
    return this.restaurantsService.createMenuItemForRestaurant(
      restaurantId, // Pass restaurantId to the service
      createMenuItemDto
    );
  }

  // Get all menu items for a specific restaurant
  @Get('/menu-items/:restaurantId')
  getMenuItemsForRestaurant(@Param('restaurantId') restaurantId: string) {
    return this.restaurantsService.getMenuItemsForRestaurant(restaurantId); // Fetch all menu items for a specific restaurant
  }

  // Get a specific menu item by its id
  @Get('/menu-items/:restaurantId/:id')
  findOneMenuItem(
    @Param('restaurantId') restaurantId: string, // Get restaurantId from the URL
    @Param('id') id: string // Get menu item id from the URL
  ) {
    return this.restaurantsService.findOne(id); // Fetch menu item by its id
  }

  // Update a menu item for a specific restaurant
  @Patch('/menu-items/:restaurantId/:id')
  updateMenuItem(
    @Param('restaurantId') restaurantId: string, // Get restaurantId from the URL
    @Param('id') id: string, // Get menu item id from the URL
    @Body() updateMenuItemDto: UpdateMenuItemDto // Get updated data from the body
  ) {
    return this.restaurantsService.updateMenuItemForRestaurant(
      restaurantId, // Pass restaurantId to the service
      id, // Pass menuItemId to the service
      updateMenuItemDto // Pass update data to the service
    );
  }

  @Patch(':id/availability')
  toggleAvailability(
    @Param('id') id: string,
    @Body() toggleDto: ToggleRestaurantAvailabilityDto
  ): Promise<ApiResponse<Restaurant>> {
    return this.restaurantsService.toggleAvailability(id, toggleDto);
  }

  // Remove a menu item for a specific restaurant
  @Delete('/menu-items/:restaurantId/:id')
  removeMenuItem(
    @Param('restaurantId') restaurantId: string, // Get restaurantId from the URL
    @Param('id') id: string // Get menu item id from the URL
  ) {
    return this.restaurantsService.deleteMenuItemForRestaurant(
      restaurantId, // Pass restaurantId to the service
      id // Pass menuItemId to the service
    );
  }

  // Create a menu item variant for a specific restaurant
  @Post('/menu-item-variants/:variantId')
  createMenuItemVariant(
    @Param('variantId') variantId: string, // Get variantId from the URL
    @Body() createMenuItemVariantDto: CreateMenuItemVariantDto // Get menu item variant data from the body
  ) {
    // Call the service method to create the menu item variant for the given restaurant
    return this.restaurantsService.createMenuItemVariantForRestaurant(
      variantId, // Pass variantId to the service
      createMenuItemVariantDto
    );
  }

  // Update a menu item variant for a specific restaurant
  @Patch('/menu-item-variants/:variantId')
  updateMenuItemVariant(
    @Param('variantId') variantId: string, // Get restaurantId from the URL
    @Body() updateMenuItemVariantDto: UpdateMenuItemVariantDto // Get updated data from the body
  ) {
    // Pass all the necessary data to the service
    return this.restaurantsService.updateMenuItemVariantForRestaurant(
      variantId, // Pass menu item variant id
      updateMenuItemVariantDto // Pass update data
    );
  }

  // Remove a menu item variant for a specific restaurant
  @Delete('/menu-item-variants/:variantId')
  removeMenuItemVariantForRestaurant(
    @Param('variantId') variantId: string // Get menu item variant id from the URL
  ) {
    // Call the service method to delete the menu item variant for the given restaurant
    return this.restaurantsService.deleteMenuItemVariantForRestaurant(
      variantId // Pass menu item variant id
    );
  }

  @Get(':restaurantId/orders')
  getRestaurantOrders(
    @Param('restaurantId') restaurantId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ) {
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    return this.restaurantsService.getRestaurantOrders(
      restaurantId,
      parsedPage,
      parsedLimit
    );
  }
}
