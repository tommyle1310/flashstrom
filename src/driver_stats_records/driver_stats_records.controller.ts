import { Controller, Get, Param, Query } from '@nestjs/common';
import { DriverStatsService } from './driver_stats_records.service';

@Controller('driver-stats')
export class DriverStatsController {
  constructor(private readonly driverStatsService: DriverStatsService) {}

  @Get(':driverId')
  async getStats(
    @Param('driverId') driverId: string,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
    @Query('aggregate') aggregate?: string,
    @Query('force_refresh') forceRefresh?: string
  ) {
    console.log(
      `Getting stats for driver ${driverId} from ${startDate} to ${endDate}`
    );
    console.log(`Force refresh: ${forceRefresh}`);

    const start = Math.floor(new Date(startDate).getTime() / 1000);
    const end = Math.floor(new Date(endDate).getTime() / 1000);
    const isAggregate = aggregate === 'true';
    const isForceRefresh = forceRefresh === 'true';

    console.log(`Start timestamp: ${start}, End timestamp: ${end}`);

    return this.driverStatsService.getStatsForDriver(
      driverId,
      start,
      end,
      isAggregate,
      isForceRefresh
    );
  }
}
