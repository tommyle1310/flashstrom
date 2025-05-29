import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { AdminChartService } from './admin_chart.service';
import { AdminChartQueryDto, PeriodType } from './dto/admin_chart_query.dto';
import { createResponse } from 'src/utils/createResponse';

@Controller('admin-chart')
export class AdminChartController {
  constructor(private readonly adminChartService: AdminChartService) {}

  @Get()
  async getChartData(@Query() query: AdminChartQueryDto) {
    console.log(
      `Getting admin chart data from ${query.start_date} to ${query.end_date}`
    );
    console.log(
      `Period type: ${query.period_type}, Force refresh: ${query.force_refresh}`
    );

    const startTimestamp = Math.floor(
      new Date(query.start_date).getTime() / 1000
    );
    const endTimestamp = Math.floor(new Date(query.end_date).getTime() / 1000);
    const forceRefresh = query.force_refresh === 'true';

    console.log(
      `Start timestamp: ${startTimestamp}, End timestamp: ${endTimestamp}`
    );

    return this.adminChartService.getChartData(
      startTimestamp,
      endTimestamp,
      query.period_type || PeriodType.DAILY,
      forceRefresh
    );
  }

  @Post('update')
  async updateChartData(@Query() query: AdminChartQueryDto) {
    const startTimestamp = Math.floor(
      new Date(query.start_date).getTime() / 1000
    );
    const endTimestamp = Math.floor(new Date(query.end_date).getTime() / 1000);

    await this.adminChartService.generateChartData(
      startTimestamp,
      endTimestamp,
      query.period_type || PeriodType.DAILY
    );

    return createResponse('OK', null, 'Admin chart data updated successfully');
  }
}
