import {
  Body,
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Query
} from '@nestjs/common';
import { PenaltiesService } from './penalties.service';
import { CreatePenaltyDto } from './dto/create-penalty.dto'; // DTO cập nhật
import { UpdatePenaltyDto } from './dto/update-penalty.dto';

@Controller('penalties')
export class PenaltiesController {
  constructor(private readonly penaltiesService: PenaltiesService) {}

  @Post()
  create(@Body() createPenaltyDto: CreatePenaltyDto) {
    return this.penaltiesService.create(createPenaltyDto);
  }

  @Get()
  findAll() {
    return this.penaltiesService.findAll();
  }

  @Get('paginated')
  findAllPaginated(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ) {
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    return this.penaltiesService.findAllPaginated(parsedPage, parsedLimit);
  }

  @Get('/by-driver/:driverId')
  async findByDriverId(
    @Param('driverId') driverId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    return this.penaltiesService.findByDriverId({
      driverId,
      limit: limitNum,
      offset: offsetNum
    });
  }

  @Get('/by-customer-care/:customerCareId')
  async findByCustomerCareId(
    @Param('customerCareId') customerCareId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    return this.penaltiesService.findByCustomerCareId({
      customerCareId,
      limit: limitNum,
      offset: offsetNum
    });
  }

  @Get('/by-restaurant/:restaurantId')
  async findByRestaurantId(
    @Param('restaurantId') restaurantId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    return this.penaltiesService.findByRestaurantId({
      restaurantId,
      limit: limitNum,
      offset: offsetNum
    });
  }

  @Get('/by-admin/:adminId')
  async findByAdminId(
    @Param('adminId') adminId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    return this.penaltiesService.findByAdminId({
      adminId,
      limit: limitNum,
      offset: offsetNum
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.penaltiesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePenaltyDto: UpdatePenaltyDto) {
    return this.penaltiesService.update(id, updatePenaltyDto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.penaltiesService.updateStatus(id, status);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.penaltiesService.remove(id);
  }
}
