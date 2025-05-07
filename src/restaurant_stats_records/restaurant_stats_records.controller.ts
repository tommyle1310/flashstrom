import { Controller, Get, Post, Query, Param } from '@nestjs/common';
import { RestaurantStatsService } from './restaurant_stats_records.service';
import { createResponse } from 'src/utils/createResponse';

@Controller('restaurant-stats')
export class RestaurantStatsController {
  constructor(
    private readonly restaurantStatsService: RestaurantStatsService
  ) {}

  @Post(':restaurantId/update/:periodType')
  async updateStats(
    @Param('restaurantId') restaurantId: string,
    @Param('periodType') periodType: string
  ) {
    await this.restaurantStatsService.updateStatsForRestaurant(
      restaurantId,
      periodType
    );
    return createResponse('OK', null, 'Stats updated successfully');
  }

  @Post(':restaurantId/update-range')
  async updateStatsForRange(
    @Param('restaurantId') restaurantId: string,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
    @Query('period_type') periodType: string = 'daily'
  ) {
    const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
    const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);

    await this.restaurantStatsService.updateStatsForDateRange(
      restaurantId,
      startTimestamp,
      endTimestamp,
      periodType
    );
    return createResponse(
      'OK',
      null,
      'Stats updated successfully for date range'
    );
  }

  @Get(':restaurantId')
  async getStats(
    @Param('restaurantId') restaurantId: string,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
    @Query('aggregate') aggregate: boolean = false
  ) {
    // Convert date strings to Unix timestamps
    const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
    const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);

    return this.restaurantStatsService.getStatsForRestaurant(
      restaurantId,
      startTimestamp,
      endTimestamp,
      aggregate
    );
  }
}
