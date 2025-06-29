import { Controller, Get, Param, Query } from '@nestjs/common';
import { DriverStatsService } from './driver_stats_records.service';

@Controller('driver-stats')
export class DriverStatsController {
  constructor(private readonly driverStatsService: DriverStatsService) {}

  @Get(':driverId')
  async getStats(
    @Param('driverId') driverId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('aggregate') aggregate?: string,
    @Query('forceRefresh') forceRefresh?: string
  ) {
    console.log('[CONTROLLER DEBUG] Received parameters:', {
      driverId,
      startDate,
      endDate,
      aggregate,
      forceRefresh
    });

    const isAggregate = aggregate === 'true';
    const isForceRefresh = forceRefresh === 'true';

    return this.driverStatsService.getStatsForDriver(
      driverId,
      startDate, // Pass as string - let service handle conversion
      endDate, // Pass as string - let service handle conversion
      isAggregate,
      isForceRefresh
    );
  }
}
