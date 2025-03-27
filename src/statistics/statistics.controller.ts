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
import { StatisticsService } from './statistics.service';
import { CreateStatisticsDto } from './dto/create-statistic.dto';
import { UpdateStatisticsDto } from './dto/update-statistic.dto';

@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Post()
  create(@Body() createStatisticsDto: CreateStatisticsDto) {
    return this.statisticsService.create(createStatisticsDto);
  }

  @Get()
  findAll() {
    return this.statisticsService.findAll();
  }

  @Get('/by-driver/:driverId')
  async findByDriverId(
    @Param('driverId') driverId: string,
    @Query('period_type') periodType?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    return this.statisticsService.findByDriverId({
      driverId,
      periodType: periodType || 'daily',
      limit: limitNum,
      offset: offsetNum
    });
  }

  @Get('/by-customer-care/:customerCareId')
  async findByCustomerCareId(
    @Param('customerCareId') customerCareId: string,
    @Query('period_type') periodType?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    return this.statisticsService.findByCustomerCareId({
      customerCareId,
      periodType: periodType || 'daily',
      limit: limitNum,
      offset: offsetNum
    });
  }

  @Get('/by-restaurant/:restaurantId')
  async findByRestaurantId(
    @Param('restaurantId') restaurantId: string,
    @Query('period_type') periodType?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    return this.statisticsService.findByRestaurantId({
      restaurantId,
      periodType: periodType || 'daily',
      limit: limitNum,
      offset: offsetNum
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.statisticsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateStatisticsDto: UpdateStatisticsDto
  ) {
    return this.statisticsService.update(id, updateStatisticsDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.statisticsService.remove(id);
  }
}
