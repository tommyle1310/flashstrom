import {
  Body,
  Controller,
  Param,
  Post,
  Get,
  Patch,
  Delete,
  Query
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import {
  ToggleCustomerFavoriteRestaurantDto,
  UpdateCustomerDto,
  UpdateCustomerPreferredCategoryDto
} from './dto/update-customer.dto';
import { CartItemsService } from 'src/cart_items/cart_items.service';
import { CreateCartItemDto } from 'src/cart_items/dto/create-cart_item.dto';
import { UpdateCartItemDto } from 'src/cart_items/dto/update-cart_item.dto';
import { AddressBookService } from 'src/address_book/address_book.service';
import { CreateAddressBookDto } from 'src/address_book/dto/create-address_book.dto';
import { ApiResponse } from 'src/utils/createResponse';
import { Customer } from './entities/customer.entity';

@Controller('customers')
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly cartItemService: CartItemsService,
    private readonly addressBookService: AddressBookService
  ) {}

  @Post()
  create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(createCustomerDto);
  }

  @Get()
  findAll() {
    return this.customersService.findAll();
  }

  @Get('paginated')
  findAllPaginated(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ) {
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    return this.customersService.findAllPaginated(parsedPage, parsedLimit);
  }

  // Ensure this specific route for restaurants comes before the generic :id route
  @Get('/restaurants/:id')
  getAllRestaurants(@Param('id') id: string) {
    return this.customersService.getAllRestaurants(id);
  }

  @Get('/search-restaurants')
  searchRestaurants(
    @Query('keyword') keyword: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10
  ) {
    if (!keyword) {
      return {
        status: 'BadRequest',
        data: null,
        message: 'Keyword is required'
      };
    }
    return this.customersService.searchRestaurantsByKeyword(
      keyword,
      page,
      limit
    );
  }

  // Trong file customers.controller.ts
  @Get('/favorite-restaurants/:customerId')
  getFavoriteRestaurants(@Param('customerId') customerId: string) {
    return this.customersService.getFavoriteRestaurants(customerId);
  }

  @Get('/orders/:id')
  getAllOrders(@Param('id') id: string) {
    return this.customersService.getAllOrders(id);
  }

  @Get('/cart-items/:customerId')
  findAllCartItemByCustomerId(@Param('customerId') customerId: string) {
    return this.cartItemService.findAll({ customer_id: customerId });
  }

  // Trong file customers.controller.ts
  @Get('/notifications/:customerId')
  getNotifications(@Param('customerId') customerId: string) {
    return this.customersService.getNotifications(customerId);
  }

  @Get(':id')
  findCustomerById(@Param('id') id: string) {
    return this.customersService.findCustomerById(id);
  }

  @Get(':field/:value')
  findOne(@Param('field') field: string, @Param('value') value: string) {
    return this.customersService.findOne({ [field]: value });
  }

  @Patch('/favorite-restaurant/:id')
  toggleFavoriteRestaurant(
    @Param('id') id: string,
    @Body() toggleDto: ToggleCustomerFavoriteRestaurantDto
  ): Promise<ApiResponse<Customer>> {
    return this.customersService.toggleFavoriteRestaurant(id, toggleDto);
  }

  @Patch('/preferred-category/:id')
  togglePreferredCategory(
    @Param('id') id: string,
    @Body() preferred_category: UpdateCustomerPreferredCategoryDto
  ) {
    return this.customersService.update(id, preferred_category);
  }

  @Patch('/cart-items/:customerId/:cartItemId')
  updateCartItem(
    @Param('customerId') customer_id: string,
    @Param('cartItemId') cart_item_id: string,
    @Body() cart_item: UpdateCartItemDto
  ) {
    return this.cartItemService.update(cart_item_id, {
      ...cart_item,
      customer_id: customer_id
    });
  }

  @Post('/address/:id/')
  addAddress(
    @Param('id') customerId: string,
    @Body() createAddressBookDto: CreateAddressBookDto
  ) {
    return this.addressBookService.create(createAddressBookDto, customerId);
  }

  @Post('/cart-items/:id')
  createCartItem(
    @Param('id') customerId: string, // Get the customer ID from the route param
    @Body() createCartItemDto: CreateCartItemDto // Get the rest of the data from the body
  ) {
    // Pass the customerId and the rest of the DTO to the service
    return this.cartItemService.create({
      ...createCartItemDto,
      customer_id: customerId // Attach customerId to the DTO
    });
  }
  @Delete('/cart-items/:id')
  deleteCartItem(
    @Param('id') cartItemId: string // Get the customer ID from the route param
  ) {
    // Pass the customerId and the rest of the DTO to the service
    return this.cartItemService.remove(cartItemId);
  }

  @Patch('/address/:id/:addressbookId')
  updateAddress(
    @Param('id') customerId: string,
    @Param('addressbookId') addressbookId: string
  ) {
    return this.addressBookService.toggleCustomerAddress(
      customerId,
      addressbookId
    );
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto
  ) {
    return this.customersService.update(id, updateCustomerDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }
}
