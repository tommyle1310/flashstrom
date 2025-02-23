import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete
} from '@nestjs/common';
import { CartItemsService } from './cart_items.service';
import { CreateCartItemDto } from './dto/create-cart_item.dto';
import { UpdateCartItemDto } from './dto/update-cart_item.dto';

@Controller('cart-items')
export class CartItemsController {
  constructor(private readonly cartItemsService: CartItemsService) {}

  // Create a new cart item
  @Post()
  create(@Body() createCartItemDto: CreateCartItemDto) {
    return this.cartItemsService.create(createCartItemDto);
  }

  // Get all cart items
  @Get()
  findAll() {
    return this.cartItemsService.findAll();
  }

  // Get a cart item by ID
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cartItemsService.findById(id); // Pass the ID as string directly
  }

  // Update a cart item by ID
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCartItemDto: UpdateCartItemDto
  ) {
    console.log('check contro', updateCartItemDto);

    return this.cartItemsService.update(id, updateCartItemDto); // Pass the ID as string directly
  }

  // Delete a cart item by ID
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.cartItemsService.remove(id); // Pass the ID as string directly
  }
}
