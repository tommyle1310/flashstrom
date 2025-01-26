import {
  Body,
  Controller,
  Param,
  Post,
  Get,
  Patch,
  Delete,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import {
  UpdateCustomerDto,
  UpdateCustomerFavoriteRestaurantDto,
  UpdateCustomerPreferredCategoryDto,
} from './dto/update-customer.dto';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(createCustomerDto);
  }

  @Get()
  findAll() {
    return this.customersService.findAll();
  }

  // Ensure this specific route for restaurants comes before the generic :id route
  @Get('/restaurants/:id')
  getAllRestaurants(@Param('id') id: string) {
    console.log('check', id);
    return this.customersService.getAllRestaurants(id);
  }

  @Get(':id')
  findCustomerById(@Param('id') id: string) {
    return this.customersService.findCustomerById(id);
  }

  @Get(':field/:value')
  findOne(@Param('field') field: string, @Param('value') value: string) {
    console.log('go into this route');
    return this.customersService.findOne({ [field]: value });
  }

  @Patch('/preferred-category/:id')
  togglePreferredCategory(
    @Param('id') id: string,
    @Body() preferred_category: UpdateCustomerPreferredCategoryDto,
  ) {
    return this.customersService.update(id, preferred_category);
  }
  @Patch('/favorite-restaurant/:id')
  toggleFavoriteRestaurant(
    @Param('id') id: string,
    @Body() favorite_restaurant: UpdateCustomerFavoriteRestaurantDto,
  ) {
    return this.customersService.update(id, favorite_restaurant);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, updateCustomerDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }
}
