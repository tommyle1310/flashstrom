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
import { VouchersService } from './vouchers.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';

@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  // Create a new voucher
  @Post()
  create(@Body() createVoucherDto: CreateVoucherDto) {
    return this.vouchersService.create(createVoucherDto);
  }

  // Get all vouchers
  @Get()
  findAll() {
    return this.vouchersService.findAll();
  }

  // Get paginated vouchers
  @Get('paginated')
  findAllPaginated(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ) {
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    return this.vouchersService.findAllPaginated(parsedPage, parsedLimit);
  }

  // Get valid vouchers only
  @Get('valid')
  findValidVouchers() {
    return this.vouchersService.findValidVouchers();
  }

  // Get vouchers valid at a specific time (based on start_date and end_date only)
  @Get('valid-at-time')
  findVouchersValidAtTime(@Query('timestamp') timestamp?: string) {
    const parsedTimestamp = timestamp ? parseInt(timestamp, 10) : undefined;
    return this.vouchersService.findVouchersValidAtTime(parsedTimestamp);
  }

  // Get available vouchers for a specific customer and order context
  @Get('available/:customerId')
  getAvailableVouchersForCustomer(
    @Param('customerId') customerId: string,
    @Query('orderTotal') orderTotal: string,
    @Query('restaurantId') restaurantId: string,
    @Query('foodCategoryIds') foodCategoryIds: string
  ) {
    const parsedOrderTotal = parseFloat(orderTotal);
    const parsedFoodCategoryIds = foodCategoryIds
      ? foodCategoryIds.split(',')
      : [];

    return this.vouchersService.getAvailableVouchersForCustomer(
      customerId,
      parsedOrderTotal,
      restaurantId,
      parsedFoodCategoryIds
    );
  }

  // Get voucher by code
  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.vouchersService.findByCode(code);
  }

  // Get a voucher by ID
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vouchersService.findOne(id);
  }

  // Update a voucher by ID
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateVoucherDto: UpdateVoucherDto) {
    return this.vouchersService.update(id, updateVoucherDto);
  }

  // Delete a voucher by ID
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.vouchersService.remove(id);
  }
}
