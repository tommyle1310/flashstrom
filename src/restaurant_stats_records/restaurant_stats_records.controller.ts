import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  ParseBoolPipe
} from '@nestjs/common';
import { RestaurantStatsService } from './restaurant_stats_records.service';
import { createResponse } from 'src/utils/createResponse';
import { Between } from 'typeorm';

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
    // Validate period type
    const validPeriodTypes = ['hourly', 'daily', 'weekly', 'monthly'];
    if (!validPeriodTypes.includes(periodType)) {
      return createResponse(
        'InvalidFormatInput',
        null,
        'Period type must be one of: hourly, daily, weekly, monthly'
      );
    }

    await this.restaurantStatsService.updateStatsForRestaurant(
      restaurantId,
      periodType
    );
    return createResponse(
      'OK',
      null,
      `${periodType} stats updated successfully`
    );
  }

  @Post(':restaurantId/update-range')
  async updateStatsForRange(
    @Param('restaurantId') restaurantId: string,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
    @Query('period_type') periodType: string = 'daily'
  ) {
    // Validate inputs
    if (!startDate || !endDate) {
      return createResponse(
        'MissingInput',
        null,
        'start_date and end_date are required'
      );
    }

    const validPeriodTypes = ['hourly', 'daily', 'weekly', 'monthly'];
    if (!validPeriodTypes.includes(periodType)) {
      return createResponse(
        'InvalidFormatInput',
        null,
        'Period type must be one of: hourly, daily, weekly, monthly'
      );
    }

    try {
      const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);

      if (startTimestamp >= endTimestamp) {
        return createResponse(
          'InvalidFormatInput',
          null,
          'start_date must be before end_date'
        );
      }

      await this.restaurantStatsService.updateStatsForDateRange(
        restaurantId,
        startTimestamp,
        endTimestamp,
        periodType
      );

      return createResponse(
        'OK',
        null,
        `${periodType} stats updated successfully for date range ${startDate} to ${endDate}`
      );
    } catch (error) {
      console.error('Error updating stats for range:', error);
      return createResponse(
        'InvalidFormatInput',
        null,
        'Invalid date format. Use YYYY-MM-DD format'
      );
    }
  }

  @Get(':restaurantId')
  async getStats(
    @Param('restaurantId') restaurantId: string,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
    @Query('period_type') periodType: string = 'daily',
    @Query('aggregate', new ParseBoolPipe({ optional: true }))
    aggregate: boolean = false,
    @Query('force_refresh', new ParseBoolPipe({ optional: true }))
    forceRefresh: boolean = false
  ) {
    // Validate inputs
    if (!startDate || !endDate) {
      return createResponse(
        'MissingInput',
        null,
        'start_date and end_date are required'
      );
    }

    const validPeriodTypes = ['hourly', 'daily', 'weekly', 'monthly'];
    if (!validPeriodTypes.includes(periodType)) {
      return createResponse(
        'InvalidFormatInput',
        null,
        'Period type must be one of: hourly, daily, weekly, monthly'
      );
    }

    try {
      // Convert date strings to Unix timestamps
      const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);

      if (startTimestamp >= endTimestamp) {
        return createResponse(
          'InvalidFormatInput',
          null,
          'start_date must be before end_date'
        );
      }

      return this.restaurantStatsService.getStatsForRestaurant(
        restaurantId,
        startTimestamp,
        endTimestamp,
        periodType,
        aggregate,
        forceRefresh
      );
    } catch (error) {
      console.error('Error getting stats:', error);
      return createResponse(
        'InvalidFormatInput',
        null,
        'Invalid date format. Use YYYY-MM-DD format'
      );
    }
  }

  @Get(':restaurantId/insights')
  async getInsights(
    @Param('restaurantId') restaurantId: string,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
    @Query('period_type') periodType: string = 'daily'
  ) {
    // This endpoint specifically returns aggregated insights with trends
    if (!startDate || !endDate) {
      return createResponse(
        'MissingInput',
        null,
        'start_date and end_date are required'
      );
    }

    const validPeriodTypes = ['hourly', 'daily', 'weekly', 'monthly'];
    if (!validPeriodTypes.includes(periodType)) {
      return createResponse(
        'InvalidFormatInput',
        null,
        'Period type must be one of: hourly, daily, weekly, monthly'
      );
    }

    try {
      const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);

      if (startTimestamp >= endTimestamp) {
        return createResponse(
          'InvalidFormatInput',
          null,
          'start_date must be before end_date'
        );
      }

      // Always aggregate insights and force refresh for accurate data
      const result = await this.restaurantStatsService.getStatsForRestaurant(
        restaurantId,
        startTimestamp,
        endTimestamp,
        periodType,
        true, // always aggregate insights
        false // use cache for performance
      );

      if (result.EC === 0 && result.data) {
        // Extract key insights for easier frontend consumption
        const insights = {
          summary: {
            total_revenue: result.data.total_revenue,
            total_orders: result.data.total_orders,
            average_order_value: result.data.average_order_value,
            order_completion_rate: result.data.order_completion_rate
          },
          revenue_insights: result.data.revenue_insights,
          peak_hours: result.data.peak_hours_analysis,
          performance: result.data.performance_metrics,
          top_items: result.data.popular_items?.slice(0, 5) || [],
          ratings: result.data.rating_summary,
          financial: result.data.financial_breakdown
        };

        return createResponse(
          'OK',
          insights,
          'Restaurant insights retrieved successfully'
        );
      }

      return result;
    } catch (error) {
      return createResponse(
        'InvalidFormatInput',
        null,
        'Invalid date format. Use YYYY-MM-DD format'
      );
    }
  }

  @Get(':restaurantId/peak-hours')
  async getPeakHours(
    @Param('restaurantId') restaurantId: string,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
    @Query('period_type') periodType: string = 'daily'
  ) {
    // Specialized endpoint for peak hours analysis
    if (!startDate || !endDate) {
      return createResponse(
        'MissingInput',
        null,
        'start_date and end_date are required'
      );
    }

    try {
      const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);

      const result = await this.restaurantStatsService.getStatsForRestaurant(
        restaurantId,
        startTimestamp,
        endTimestamp,
        periodType,
        true,
        false
      );

      if (result.EC === 0 && result.data) {
        return createResponse(
          'OK',
          result.data.peak_hours_analysis,
          'Peak hours analysis retrieved successfully'
        );
      }

      return result;
    } catch (error) {
      return createResponse(
        'InvalidFormatInput',
        null,
        'Invalid date format. Use YYYY-MM-DD format'
      );
    }
  }

  @Get(':restaurantId/revenue-chart')
  async getRevenueChart(
    @Param('restaurantId') restaurantId: string,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
    @Query('period_type') periodType: string = 'daily'
  ) {
    // Specialized endpoint for revenue chart data with insights
    if (!startDate || !endDate) {
      return createResponse(
        'MissingInput',
        null,
        'start_date and end_date are required'
      );
    }

    try {
      const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);

      const result = await this.restaurantStatsService.getStatsForRestaurant(
        restaurantId,
        startTimestamp,
        endTimestamp,
        periodType,
        false, // don't aggregate, get individual periods for chart
        false
      );

      if (result.EC === 0 && Array.isArray(result.data)) {
        const chartData = result.data.map(stat => ({
          period: stat.period_start,
          period_label: new Date(stat.period_start * 1000)
            .toISOString()
            .split('T')[0],
          revenue: stat.total_revenue,
          orders: stat.total_orders,
          average_order_value: stat.average_order_value,
          completion_rate: stat.order_completion_rate
        }));

        // Calculate overall insights for the chart
        const totalRevenue = result.data.reduce(
          (sum, stat) => sum + stat.total_revenue,
          0
        );
        const totalOrders = result.data.reduce(
          (sum, stat) => sum + stat.total_orders,
          0
        );
        const avgRevenue =
          result.data.length > 0 ? totalRevenue / result.data.length : 0;

        // Get growth rate from the latest period
        const latestStat = result.data[result.data.length - 1];
        const insights = latestStat?.revenue_insights || {};

        return createResponse(
          'OK',
          {
            chart_data: chartData,
            insights: {
              total_revenue: totalRevenue,
              total_orders: totalOrders,
              average_daily_revenue: Math.round(avgRevenue * 100) / 100,
              growth_percentage: insights.growth_percentage || 0,
              trend: insights.trend || 'stable',
              comparison_period: insights.comparison_period || 'previous period'
            }
          },
          'Revenue chart data retrieved successfully'
        );
      }

      return result;
    } catch (error) {
      console.error('Error parsing date format:', error);
      return createResponse(
        'InvalidFormatInput',
        null,
        'Invalid date format. Use YYYY-MM-DD format'
      );
    }
  }

  @Post(':restaurantId/force-refresh')
  async forceRefreshStats(
    @Param('restaurantId') restaurantId: string,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
    @Query('period_type') periodType: string = 'daily'
  ) {
    // Validate inputs
    if (!startDate || !endDate) {
      return createResponse(
        'MissingInput',
        null,
        'start_date and end_date are required'
      );
    }

    const validPeriodTypes = ['hourly', 'daily', 'weekly', 'monthly'];
    if (!validPeriodTypes.includes(periodType)) {
      return createResponse(
        'InvalidFormatInput',
        null,
        'Period type must be one of: hourly, daily, weekly, monthly'
      );
    }

    try {
      const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);

      if (startTimestamp >= endTimestamp) {
        return createResponse(
          'InvalidFormatInput',
          null,
          'start_date must be before end_date'
        );
      }

      await this.restaurantStatsService.forceRefreshAllStats(
        restaurantId,
        startTimestamp,
        endTimestamp,
        periodType
      );

      return createResponse(
        'OK',
        null,
        `All ${periodType} stats force refreshed successfully for date range ${startDate} to ${endDate}`
      );
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'Error force refreshing stats'
      );
    }
  }

  @Post('debug-orders/:restaurantId')
  async debugOrders(
    @Param('restaurantId') restaurantId: string,
    @Query('period_start') periodStart: string,
    @Query('period_end') periodEnd: string
  ) {
    try {
      const startTime = parseInt(periodStart);
      const endTime = parseInt(periodEnd);

      console.log(
        `[DEBUG] Debug orders for restaurant ${restaurantId} from ${startTime} to ${endTime}`
      );

      // Get orders directly from the repository
      const orders = await this.restaurantStatsService['orderRepository'].find({
        where: {
          restaurant_id: restaurantId,
          created_at: Between(startTime, endTime)
        },
        select: [
          'id',
          'created_at',
          'updated_at',
          'total_amount',
          'status',
          'order_time'
        ]
      });

      console.log(`[DEBUG] Found ${orders.length} orders`);

      // Log first 5 orders with their timestamps
      const sampleOrders = orders.slice(0, 5).map(order => ({
        id: order.id,
        created_at: order.created_at,
        updated_at: order.updated_at,
        order_time: order.order_time,
        total_amount: order.total_amount,
        status: order.status,
        created_at_date: order.created_at
          ? new Date(order.created_at * 1000).toISOString()
          : null,
        updated_at_date: order.updated_at
          ? new Date(order.updated_at * 1000).toISOString()
          : null,
        order_time_date: order.order_time
          ? new Date(order.order_time * 1000).toISOString()
          : null
      }));

      return {
        EC: 0,
        EM: 'Debug data retrieved successfully',
        data: {
          total_orders: orders.length,
          sample_orders: sampleOrders,
          period_start: startTime,
          period_end: endTime,
          period_start_date: new Date(startTime * 1000).toISOString(),
          period_end_date: new Date(endTime * 1000).toISOString()
        }
      };
    } catch (error) {
      console.error('Error in debug orders:', error);
      return {
        EC: 1,
        EM: 'Error retrieving debug data',
        data: null
      };
    }
  }
}
