import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // Create a new order
  @Post()
  async createOrder(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.createOrder(createOrderDto);
  }

  // Get all orders
  @Get()
  findAll() {
    return this.ordersService.findAll();
  }

  // Get a specific order by ID
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id); // Pass the id as a string
  }

  // Update an order by ID
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.ordersService.update(id, updateOrderDto); // Pass the id as a string
  }

  // Delete an order by ID
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id); // Pass the id as a string
  }
}
