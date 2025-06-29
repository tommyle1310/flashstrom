import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { RestaurantStatsRecord } from './entities/restaurant_stats_record.entity';
import { Order, OrderStatus } from 'src/orders/entities/order.entity';
import { RatingsReview } from 'src/ratings_reviews/entities/ratings_review.entity';
import { createResponse, ApiResponse } from 'src/utils/createResponse';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { OnlineSession } from 'src/online-sessions/entities/online-session.entity';
import { Transaction } from 'src/transactions/entities/transaction.entity';
import { createClient } from 'redis';
import * as dotenv from 'dotenv';

dotenv.config();

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redis.on('error', err => console.error('Redis error:', err));
redis.on('connect', () =>
  console.log('Redis connected for RestaurantStatsService')
);
redis.connect().catch(err => console.error('Redis connection error:', err));

@Injectable()
export class RestaurantStatsService {
  constructor(
    @InjectRepository(RestaurantStatsRecord)
    private restaurantStatsRepo: Repository<RestaurantStatsRecord>,
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(RatingsReview)
    private ratingsReviewRepo: Repository<RatingsReview>,
    @InjectRepository(Restaurant)
    private restaurantRepo: Repository<Restaurant>,
    @InjectRepository(OnlineSession)
    private onlineSessionRepo: Repository<OnlineSession>,
    @InjectRepository(Transaction)
    private transactionRepo: Repository<Transaction>
  ) {}

  private formatNumber(value: number): number {
    return Number(value.toFixed(2));
  }

  private getTimeZoneOffset(): number {
    return 7 * 3600; // +07:00 timezone offset in seconds
  }

  private calculatePeriodBounds(
    periodType: string,
    referenceTime?: number
  ): { periodStart: number; periodEnd: number } {
    const now = referenceTime || Math.floor(Date.now() / 1000);
    const tzOffset = this.getTimeZoneOffset();
    let periodStart: number, periodEnd: number;

    switch (periodType) {
      case 'hourly':
        const hourlyDate = new Date((now + tzOffset) * 1000);
        hourlyDate.setMinutes(0, 0, 0);
        periodStart = Math.floor(hourlyDate.getTime() / 1000) - tzOffset;
        periodEnd = periodStart + 3600 - 1;
        break;
      case 'daily':
        const dailyDate = new Date((now + tzOffset) * 1000);
        dailyDate.setHours(0, 0, 0, 0);
        periodStart = Math.floor(dailyDate.getTime() / 1000) - tzOffset;
        periodEnd = periodStart + 24 * 3600 - 1;
        break;
      case 'weekly':
        const weekStart = new Date((now + tzOffset) * 1000);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);
        periodStart = Math.floor(weekStart.getTime() / 1000) - tzOffset;
        periodEnd = periodStart + 7 * 24 * 3600 - 1;
        break;
      case 'monthly':
        const monthStart = new Date((now + tzOffset) * 1000);
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        periodStart = Math.floor(monthStart.getTime() / 1000) - tzOffset;
        const nextMonth = new Date(monthStart);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        periodEnd = Math.floor(nextMonth.getTime() / 1000) - tzOffset - 1;
        break;
      default:
        throw new Error('Invalid period type');
    }

    return { periodStart, periodEnd };
  }

  private async getCachedData<T>(key: string): Promise<T | null> {
    try {
      const cached = await redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.warn(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  private async setCachedData<T>(
    key: string,
    data: T,
    ttl: number = 300
  ): Promise<void> {
    try {
      await redis.setEx(key, ttl, JSON.stringify(data));
    } catch (error) {
      console.warn(`Cache set error for key ${key}:`, error);
    }
  }

  private async invalidateCache(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(keys);
      }
    } catch (error) {
      console.warn(`Cache invalidation error for pattern ${pattern}:`, error);
    }
  }

  async updateStatsForRestaurant(
    restaurantId: string,
    periodType: string = 'daily'
  ): Promise<void> {
    const cacheKey = `restaurant_stats_lock:${restaurantId}:${periodType}`;
    const lockAcquired = await redis.set(cacheKey, '1', { NX: true, EX: 60 });

    if (!lockAcquired) {
      console.log(
        `Stats update already in progress for ${restaurantId}:${periodType}`
      );
      return;
    }

    try {
      const { periodStart, periodEnd } = this.calculatePeriodBounds(periodType);

      console.log(
        `[DEBUG] Updating stats for ${restaurantId} (${periodType}):`,
        {
          periodStart,
          periodEnd,
          startISO: new Date(periodStart * 1000).toISOString(),
          endISO: new Date(periodEnd * 1000).toISOString()
        }
      );

      await this.calculateAndSaveStats(
        restaurantId,
        periodType,
        periodStart,
        periodEnd
      );
    } finally {
      await redis.del(cacheKey);
    }
  }

  private async calculateAndSaveStats(
    restaurantId: string,
    periodType: string,
    periodStart: number,
    periodEnd: number
  ): Promise<void> {
    // Get or create stats record
    let stats = await this.restaurantStatsRepo.findOne({
      where: {
        restaurant_id: restaurantId,
        period_type: periodType,
        period_start: periodStart
      }
    });

    if (!stats) {
      stats = this.restaurantStatsRepo.create({
        restaurant_id: restaurantId,
        period_type: periodType,
        period_start: periodStart,
        period_end: periodEnd
      });
    }

    // Fetch restaurant data first
    let restaurant: Restaurant | null = await this.getCachedData<Restaurant>(
      `restaurant:${restaurantId}`
    );
    if (!restaurant) {
      restaurant = await this.restaurantRepo.findOne({
        where: { id: restaurantId }
      });
    }

    // Parallel data fetching for performance
    const [
      allOrders,
      completedOrders,
      reviews,
      transactions,
      previousPeriodStats
    ] = await Promise.all([
      this.orderRepo.find({
        where: {
          restaurant_id: restaurantId,
          created_at: Between(periodStart, periodEnd)
        }
      }),

      this.orderRepo.find({
        where: {
          restaurant_id: restaurantId,
          status: OrderStatus.DELIVERED,
          created_at: Between(periodStart, periodEnd)
        }
      }),

      this.ratingsReviewRepo.find({
        where: {
          rr_recipient_restaurant_id: restaurantId,
          created_at: Between(periodStart, periodEnd)
        }
      }),

      this.transactionRepo.find({
        where: {
          created_at: Between(periodStart, periodEnd)
        }
      }),

      this.getPreviousPeriodStats(restaurantId, periodType, periodStart)
    ]);

    // Cache restaurant data
    if (restaurant) {
      await this.setCachedData(`restaurant:${restaurantId}`, restaurant, 3600);
    }

    // Calculate basic metrics
    const totalOrders = allOrders.length;
    const completedOrdersCount = completedOrders.length;
    const totalRevenue = completedOrders.reduce(
      (sum, order) => sum + Number(order.total_amount || 0),
      0
    );
    const totalDeliveryFee = completedOrders.reduce(
      (sum, order) => sum + Number(order.delivery_fee || 0),
      0
    );
    const totalCommission = completedOrders.reduce(
      (sum, order) => sum + Number(order.service_fee || 0),
      0
    );
    const totalTips = completedOrders.reduce(
      (sum, order) => sum + Number(order.driver_tips || 0),
      0
    );

    // Enhanced Analytics
    const averageOrderValue =
      completedOrdersCount > 0
        ? this.formatNumber(totalRevenue / completedOrdersCount)
        : 0;
    const orderCompletionRate =
      totalOrders > 0
        ? this.formatNumber((completedOrdersCount / totalOrders) * 100)
        : 0;

    // Peak Hours Analysis
    const peakHoursAnalysis = this.calculatePeakHoursAnalysis(allOrders);

    // Rating Analysis
    const ratingAnalysis = this.calculateRatingAnalysis(
      reviews,
      previousPeriodStats?.rating_summary
    );

    // Order Status Summary
    const orderStatusSummary = this.calculateOrderStatusSummary(allOrders);

    // Popular Items Analysis
    const popularItems = this.calculatePopularItems(
      completedOrders,
      previousPeriodStats?.popular_items
    );

    // Revenue Insights
    const revenueInsights = this.calculateRevenueInsights(
      totalRevenue,
      previousPeriodStats?.total_revenue || 0,
      periodType,
      completedOrders
    );

    // Performance Metrics
    const performanceMetrics = this.calculatePerformanceMetrics(
      completedOrders,
      reviews
    );

    // Financial Breakdown
    const financialBreakdown = this.calculateFinancialBreakdown(
      totalRevenue,
      totalDeliveryFee,
      totalCommission,
      totalTips,
      transactions
    );

    // Calculate online hours
    let totalOnlineHours = 0;

    // Try to get actual online session data first
    if (periodType === 'daily') {
      const onlineSessions = await this.onlineSessionRepo.find({
        where: {
          start_time: Between(periodStart, periodEnd),
          is_active: true
        }
      });

      if (onlineSessions.length > 0) {
        totalOnlineHours = onlineSessions.reduce((total, session) => {
          const endTime = session.end_time || periodEnd;
          const duration = (endTime - session.start_time) / 3600; // Convert to hours
          return total + Math.max(0, duration);
        }, 0);
      }
    }

    // Fallback to restaurant opening hours if no online sessions
    if (
      totalOnlineHours === 0 &&
      restaurant?.opening_hours &&
      periodType === 'daily'
    ) {
      const dayOfWeek = new Date(periodStart * 1000).getDay().toString();
      const todayHours = restaurant.opening_hours[dayOfWeek] || {
        open: null,
        close: null
      };
      if (todayHours.open && todayHours.close) {
        totalOnlineHours =
          (new Date(todayHours.close).getTime() -
            new Date(todayHours.open).getTime()) /
          3600000;
      }
    }

    // Update stats object
    Object.assign(stats, {
      total_orders: totalOrders,
      total_revenue: this.formatNumber(totalRevenue),
      total_delivery_fee: this.formatNumber(totalDeliveryFee),
      total_commission: this.formatNumber(totalCommission),
      total_tips: this.formatNumber(totalTips),
      total_online_hours: this.formatNumber(totalOnlineHours),
      average_order_value: averageOrderValue,
      order_completion_rate: orderCompletionRate,
      revenue_growth_rate: revenueInsights.growth_percentage,
      peak_hours_analysis: peakHoursAnalysis,
      rating_summary: ratingAnalysis,
      order_status_summary: orderStatusSummary,
      popular_items: popularItems,
      revenue_insights: revenueInsights,
      performance_metrics: performanceMetrics,
      financial_breakdown: financialBreakdown
    });

    // Save to database
    await this.restaurantStatsRepo.save(stats);

    // Invalidate related caches
    await this.invalidateCache(`restaurant_stats:${restaurantId}:*`);

    console.log(`[DEBUG] Stats updated for ${restaurantId} (${periodType})`);
  }

  private calculatePeakHoursAnalysis(orders: Order[]): any {
    console.log(
      `[DEBUG] calculatePeakHoursAnalysis called with ${orders.length} orders`
    );

    const hourlyData: {
      [hour: string]: {
        orders: number;
        revenue: number;
        avg_order_value: number;
      };
    } = {};

    // Initialize hourly data
    for (let i = 0; i < 24; i++) {
      hourlyData[i.toString()] = { orders: 0, revenue: 0, avg_order_value: 0 };
    }

    // If no orders, return empty analysis
    if (orders.length === 0) {
      return {
        busiest_hour: 12,
        peak_hours: [],
        hourly_distribution: hourlyData,
        peak_revenue_hour: 12,
        slowest_hour: 3
      };
    }

    // Log first few orders to see the data structure
    console.log(
      `[DEBUG] Sample order data:`,
      orders.slice(0, 3).map(order => ({
        id: order.id,
        order_time: order.order_time,
        created_at: order.created_at,
        updated_at: order.updated_at,
        total_amount: order.total_amount,
        status: order.status
      }))
    );

    // Process orders
    let processedOrders = 0;
    let skippedOrders = 0;

    orders.forEach((order, index) => {
      try {
        // Use order_time if available, otherwise use created_at
        let timestamp =
          order.order_time || order.created_at || order.updated_at;

        // Convert to number to handle string timestamps
        timestamp = Number(timestamp);

        if (!timestamp || isNaN(timestamp)) {
          console.warn(`Invalid timestamp for order ${order.id}:`, timestamp);
          // Use a fallback timestamp based on order index to distribute orders across hours
          const fallbackHour = index % 24; // Distribute orders across 24 hours
          const fallbackTimestamp =
            Math.floor(Date.now() / 1000) - (24 - fallbackHour) * 3600;
          timestamp = fallbackTimestamp;
          console.log(
            `[DEBUG] Using fallback timestamp for order ${order.id}: hour ${fallbackHour}, timestamp ${fallbackTimestamp}`
          );
        }

        console.log(`[DEBUG] Processing order ${order.id}:`, {
          order_time: order.order_time,
          created_at: order.created_at,
          updated_at: order.updated_at,
          used_timestamp: timestamp,
          total_amount: order.total_amount,
          timezone_offset: this.getTimeZoneOffset(),
          adjusted_timestamp: timestamp + this.getTimeZoneOffset(),
          date_string: new Date(
            (timestamp + this.getTimeZoneOffset()) * 1000
          ).toISOString()
        });

        const hour = new Date(
          (timestamp + this.getTimeZoneOffset()) * 1000
        ).getHours();

        const hourWithoutOffset = new Date(timestamp * 1000).getHours();

        console.log(`[DEBUG] Calculated hour for order ${order.id}:`, {
          with_offset: hour,
          without_offset: hourWithoutOffset,
          original_timestamp: timestamp,
          adjusted_timestamp: timestamp + this.getTimeZoneOffset()
        });

        if (isNaN(hour) || hour < 0 || hour > 23) {
          console.warn(`Invalid hour ${hour} for order ${order.id}`);
          skippedOrders++;
          return; // Skip this order
        }

        const hourKey = hour.toString();
        if (hourlyData[hourKey]) {
          hourlyData[hourKey].orders += 1;
          hourlyData[hourKey].revenue += Number(order.total_amount || 0);
          processedOrders++;
          console.log(`[DEBUG] Updated hour ${hourKey}:`, hourlyData[hourKey]);
        }
      } catch (error) {
        console.warn(
          `Error processing order ${order.id} for peak hours:`,
          error
        );
        skippedOrders++;
      }
    });

    console.log(`[DEBUG] Order processing summary:`, {
      total_orders: orders.length,
      processed_orders: processedOrders,
      skipped_orders: skippedOrders
    });

    // Calculate averages
    Object.keys(hourlyData).forEach(hour => {
      const data = hourlyData[hour];
      if (data) {
        data.avg_order_value =
          data.orders > 0 ? this.formatNumber(data.revenue / data.orders) : 0;
        data.revenue = this.formatNumber(data.revenue);
      }
    });

    // Find peaks
    const hourlyOrders = Object.entries(hourlyData)
      .map(([hour, data]) => ({
        hour: parseInt(hour),
        orders: data?.orders || 0,
        revenue: data?.revenue || 0
      }))
      .filter(item => !isNaN(item.hour)); // Filter out invalid hours

    // Default values if no orders
    let busiestHour = 12; // Default to noon
    let peakRevenueHour = 12;
    let slowestHour = 3; // Default to 3 AM

    if (hourlyOrders.length > 0) {
      busiestHour = hourlyOrders.reduce((max, current) =>
        current.orders > max.orders ? current : max
      ).hour;

      peakRevenueHour = hourlyOrders.reduce((max, current) =>
        current.revenue > max.revenue ? current : max
      ).hour;

      slowestHour = hourlyOrders.reduce((min, current) =>
        current.orders < min.orders ? current : min
      ).hour;
    }

    // Define peak hours (above average + 50%)
    const avgOrdersPerHour = orders.length / 24;
    const peakThreshold = avgOrdersPerHour * 1.5;
    const peakHours = hourlyOrders
      .filter(h => h.orders >= peakThreshold)
      .map(h => h.hour);

    // If no peak hours found, find hours with any orders
    const hoursWithOrders = hourlyOrders.filter(h => h.orders > 0);
    const actualPeakHours =
      peakHours.length > 0 ? peakHours : hoursWithOrders.map(h => h.hour);

    console.log(`[DEBUG] Peak hours analysis result:`, {
      total_orders_processed: orders.length,
      hours_with_orders: hoursWithOrders.length,
      peak_hours: actualPeakHours,
      busiest_hour: busiestHour,
      hourly_distribution_summary: Object.fromEntries(
        Object.entries(hourlyData).filter(([, data]) => data.orders > 0)
      )
    });

    return {
      busiest_hour: busiestHour,
      peak_hours: actualPeakHours,
      hourly_distribution: hourlyData,
      peak_revenue_hour: peakRevenueHour,
      slowest_hour: slowestHour
    };
  }

  private calculateRatingAnalysis(
    reviews: RatingsReview[],
    previousRatings?: any
  ): any {
    const ratingDistribution = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    let totalFoodRating = 0;
    let totalServiceRating = 0;
    let totalOverallRating = 0;

    reviews.forEach(review => {
      const foodRating = review.food_rating || 0;
      const serviceRating = review.delivery_rating || 0;

      totalFoodRating += foodRating;
      totalServiceRating += serviceRating;

      const overallRating = (foodRating + serviceRating) / 2;
      totalOverallRating += overallRating;

      const roundedRating = Math.round(overallRating);
      if (roundedRating >= 1 && roundedRating <= 5) {
        ratingDistribution[roundedRating.toString()]++;
      }
    });

    const currentAvgRating = reviews.length
      ? this.formatNumber(totalOverallRating / reviews.length)
      : 0;
    const previousAvgRating = previousRatings?.average_overall_rating || 0;
    const ratingTrend =
      previousAvgRating > 0
        ? this.formatNumber(
            ((currentAvgRating - previousAvgRating) / previousAvgRating) * 100
          )
        : 0;

    return {
      average_food_rating: reviews.length
        ? this.formatNumber(totalFoodRating / reviews.length)
        : 0,
      average_service_rating: reviews.length
        ? this.formatNumber(totalServiceRating / reviews.length)
        : 0,
      average_overall_rating: currentAvgRating,
      total_ratings: reviews.length,
      review_count: reviews.length,
      rating_distribution: ratingDistribution,
      rating_trend: ratingTrend
    };
  }

  private calculateOrderStatusSummary(orders: Order[]): any {
    const statusCount = {
      completed: 0,
      cancelled: 0,
      rejected: 0,
      pending: 0,
      preparing: 0,
      in_progress: 0,
      ready_for_pickup: 0,
      dispatched: 0,
      delivered: 0
    };

    orders.forEach(order => {
      const status = order.status.toLowerCase().replace('_', '_');
      if (statusCount.hasOwnProperty(status)) {
        statusCount[status]++;
      } else if (order.status === OrderStatus.DELIVERED) {
        statusCount.completed++;
        statusCount.delivered++;
      } else if (order.status === OrderStatus.CANCELLED) {
        statusCount.cancelled++;
      } else if (order.status === OrderStatus.RETURNED) {
        statusCount.rejected++;
      }
    });

    return statusCount;
  }

  private calculatePopularItems(orders: Order[], previousItems?: any[]): any[] {
    const itemMap = new Map();

    orders.forEach(order => {
      // Access order_items directly as it's a JSON column
      if (order.order_items && Array.isArray(order.order_items)) {
        order.order_items.forEach(item => {
          const key = item.item_id;
          if (!itemMap.has(key)) {
            itemMap.set(key, {
              item_id: item.item_id,
              name: item.name,
              quantity: 0,
              revenue: 0,
              avg_rating: 0,
              growth_rate: 0
            });
          }
          const current = itemMap.get(key);
          current.quantity += Number(item.quantity) || 0;
          current.revenue +=
            (Number(item.price_at_time_of_order) || 0) *
            (Number(item.quantity) || 0);
        });
      }
    });

    const currentItems = Array.from(itemMap.values());

    // Calculate growth rates
    if (previousItems && Array.isArray(previousItems)) {
      const previousMap = new Map(
        previousItems.map(item => [item.item_id, item])
      );
      currentItems.forEach(item => {
        const previousItem = previousMap.get(item.item_id);
        if (previousItem && previousItem.quantity > 0) {
          item.growth_rate = this.formatNumber(
            ((item.quantity - previousItem.quantity) / previousItem.quantity) *
              100
          );
        }
      });
    }

    return currentItems
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)
      .map(item => ({
        ...item,
        revenue: this.formatNumber(item.revenue)
      }));
  }

  private calculateRevenueInsights(
    currentRevenue: number,
    previousRevenue: number,
    periodType: string,
    orders: Order[]
  ): any {
    const growthAmount = currentRevenue - previousRevenue;
    const growthPercentage =
      previousRevenue > 0
        ? this.formatNumber((growthAmount / previousRevenue) * 100)
        : 0;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (growthPercentage > 5) trend = 'up';
    else if (growthPercentage < -5) trend = 'down';

    // Daily breakdown for weekly/monthly periods
    let bestDay: string | undefined;
    let worstDay: string | undefined;
    let dailyAverage: number | undefined;

    if (periodType === 'weekly' || periodType === 'monthly') {
      const dailyRevenue = new Map<string, number>();
      orders.forEach(order => {
        // Use order_time if available, otherwise use created_at
        const timestamp =
          order.order_time || order.created_at || order.updated_at;
        const date = new Date((timestamp + this.getTimeZoneOffset()) * 1000)
          .toISOString()
          .split('T')[0];
        dailyRevenue.set(
          date,
          (dailyRevenue.get(date) || 0) + Number(order.total_amount || 0)
        );
      });

      if (dailyRevenue.size > 0) {
        const revenues = Array.from(dailyRevenue.entries());
        bestDay = revenues.reduce((max, current) =>
          current[1] > max[1] ? current : max
        )[0];
        worstDay = revenues.reduce((min, current) =>
          current[1] < min[1] ? current : min
        )[0];
        dailyAverage = this.formatNumber(
          Array.from(dailyRevenue.values()).reduce((sum, rev) => sum + rev, 0) /
            dailyRevenue.size
        );
      }
    }

    return {
      total_revenue: this.formatNumber(currentRevenue),
      previous_period_revenue: this.formatNumber(previousRevenue),
      growth_amount: this.formatNumber(growthAmount),
      growth_percentage: growthPercentage,
      trend,
      comparison_period: this.getPreviousPeriodLabel(periodType),
      best_day: bestDay,
      worst_day: worstDay,
      daily_average: dailyAverage
    };
  }

  private calculatePerformanceMetrics(
    orders: Order[],
    reviews: RatingsReview[]
  ): any {
    // Calculate average preparation and delivery times
    let totalPrepTime = 0;
    let totalDeliveryTime = 0;
    let validPrepOrders = 0;
    let validDeliveryOrders = 0;

    orders.forEach(order => {
      if (order.order_time && order.updated_at) {
        const prepTime = (order.updated_at - order.order_time) / 60; // minutes
        if (prepTime > 0 && prepTime < 300) {
          // Reasonable prep time
          totalPrepTime += prepTime;
          validPrepOrders++;
        }
      }

      if (order.delivery_time && order.updated_at) {
        const deliveryTime = (order.delivery_time - order.updated_at) / 60; // minutes
        if (deliveryTime > 0 && deliveryTime < 120) {
          // Reasonable delivery time
          totalDeliveryTime += deliveryTime;
          validDeliveryOrders++;
        }
      }
    });

    const avgPrepTime =
      validPrepOrders > 0
        ? this.formatNumber(totalPrepTime / validPrepOrders)
        : 0;
    const avgDeliveryTime =
      validDeliveryOrders > 0
        ? this.formatNumber(totalDeliveryTime / validDeliveryOrders)
        : 0;

    // Customer satisfaction score (based on ratings)
    const avgRating =
      reviews.length > 0
        ? reviews.reduce(
            (sum, r) => sum + (r.food_rating + r.delivery_rating) / 2,
            0
          ) / reviews.length
        : 0;
    const customerSatisfactionScore = this.formatNumber((avgRating / 5) * 100);

    // Peak efficiency (orders per hour during busiest period)
    const peakEfficiencyScore =
      orders.length > 0 ? this.formatNumber(orders.length / 24) : 0;

    // Calculate repeat customer rate (customers with multiple orders)
    const customerOrderCount = new Map<string, number>();
    orders.forEach(order => {
      const customerId = order.customer_id;
      customerOrderCount.set(
        customerId,
        (customerOrderCount.get(customerId) || 0) + 1
      );
    });

    const repeatCustomers = Array.from(customerOrderCount.values()).filter(
      count => count > 1
    ).length;
    const uniqueCustomers = customerOrderCount.size;
    const repeatCustomerRate =
      uniqueCustomers > 0
        ? this.formatNumber((repeatCustomers / uniqueCustomers) * 100)
        : 0;

    return {
      avg_preparation_time: avgPrepTime,
      avg_delivery_time: avgDeliveryTime,
      customer_satisfaction_score: customerSatisfactionScore,
      repeat_customer_rate: repeatCustomerRate,
      peak_efficiency_score: peakEfficiencyScore
    };
  }

  private calculateFinancialBreakdown(
    totalRevenue: number,
    totalDeliveryFee: number,
    totalCommission: number,
    totalTips: number,
    transactions: Transaction[]
  ): any {
    const netRevenue = totalRevenue - totalCommission;

    // Calculate refunds from transactions
    const refundsIssued = transactions
      .filter(t => t.transaction_type === 'REFUND')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Calculate average transaction value
    const avgTransactionValue =
      transactions.length > 0
        ? this.formatNumber(totalRevenue / transactions.length)
        : this.formatNumber(
            totalRevenue / Math.max(1, totalRevenue > 0 ? 1 : 0)
          );

    // Calculate payment method distribution
    const paymentMethods = transactions.reduce(
      (acc, t) => {
        const method = t.source || 'unknown';
        acc[method] = (acc[method] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      gross_revenue: this.formatNumber(totalRevenue),
      net_revenue: this.formatNumber(netRevenue),
      delivery_fees_earned: this.formatNumber(totalDeliveryFee),
      tips_received: this.formatNumber(totalTips),
      commission_paid: this.formatNumber(totalCommission),
      refunds_issued: this.formatNumber(refundsIssued),
      avg_transaction_value: avgTransactionValue,
      payment_methods: paymentMethods
    };
  }

  private async getPreviousPeriodStats(
    restaurantId: string,
    periodType: string,
    currentPeriodStart: number
  ): Promise<RestaurantStatsRecord | null> {
    let previousPeriodStart: number;

    switch (periodType) {
      case 'hourly':
        previousPeriodStart = currentPeriodStart - 3600;
        break;
      case 'daily':
        previousPeriodStart = currentPeriodStart - 24 * 3600;
        break;
      case 'weekly':
        previousPeriodStart = currentPeriodStart - 7 * 24 * 3600;
        break;
      case 'monthly':
        previousPeriodStart = currentPeriodStart - 30 * 24 * 3600; // Approximate
        break;
      default:
        return null;
    }

    return this.restaurantStatsRepo.findOne({
      where: {
        restaurant_id: restaurantId,
        period_type: periodType,
        period_start: previousPeriodStart
      }
    });
  }

  private getPreviousPeriodLabel(periodType: string): string {
    switch (periodType) {
      case 'hourly':
        return 'previous hour';
      case 'daily':
        return 'previous day';
      case 'weekly':
        return 'previous week';
      case 'monthly':
        return 'previous month';
      default:
        return 'previous period';
    }
  }

  async getStatsForRestaurant(
    restaurantId: string,
    startDate: number | string,
    endDate: number | string,
    periodType: string = 'daily',
    aggregate: boolean = false,
    forceRefresh: boolean = false
  ): Promise<ApiResponse<any>> {
    try {
      const cacheKey = `restaurant_stats:${restaurantId}:${startDate}:${endDate}:${periodType}:${aggregate}`;

      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cachedResult = await this.getCachedData<any>(cacheKey);
        if (cachedResult) {
          console.log(`[CACHE HIT] Stats for ${restaurantId}`);
          return createResponse(
            'OK',
            cachedResult,
            'Restaurant stats retrieved from cache'
          );
        }
      }

      // Convert dates
      const start =
        typeof startDate === 'string'
          ? Math.floor(new Date(startDate + 'T00:00:00+07:00').getTime() / 1000)
          : startDate;
      const end =
        typeof endDate === 'string'
          ? Math.floor(
              new Date(endDate + 'T23:59:59.999+07:00').getTime() / 1000
            )
          : endDate;

      console.log(`[DEBUG] Fetching stats for ${restaurantId}:`, {
        start,
        end,
        periodType,
        aggregate
      });

      // Fetch existing stats first
      let stats = await this.restaurantStatsRepo.find({
        where: {
          restaurant_id: restaurantId,
          period_type: periodType,
          period_start: LessThanOrEqual(end),
          period_end: MoreThanOrEqual(start)
        },
        order: { period_start: 'ASC' }
      });

      // If no stats exist or forceRefresh is true, calculate them
      if (stats.length === 0 || forceRefresh) {
        console.log(
          `[DEBUG] No stats found or force refresh requested, calculating stats for ${restaurantId}`
        );
        await this.updateStatsForDateRange(
          restaurantId,
          start,
          end,
          periodType
        );

        // Fetch stats again after calculation
        stats = await this.restaurantStatsRepo.find({
          where: {
            restaurant_id: restaurantId,
            period_type: periodType,
            period_start: LessThanOrEqual(end),
            period_end: MoreThanOrEqual(start)
          },
          order: { period_start: 'ASC' }
        });
      }

      let result: any;

      if (aggregate && stats.length > 0) {
        result = this.aggregateStats(stats, restaurantId, start, end);
      } else {
        result = stats.map(stat => ({
          ...stat,
          popular_items: Array.isArray(stat.popular_items)
            ? stat.popular_items
            : []
        }));
      }

      // Cache the result
      await this.setCachedData(cacheKey, result, 300); // 5 minutes cache

      return createResponse(
        'OK',
        result,
        'Restaurant stats retrieved successfully'
      );
    } catch (error: any) {
      console.error('[ERROR] Error fetching restaurant stats:', error);
      return createResponse(
        'ServerError',
        null,
        'Error fetching restaurant stats'
      );
    }
  }

  private aggregateStats(
    stats: RestaurantStatsRecord[],
    restaurantId: string,
    start: number,
    end: number
  ): any {
    const totalOrders = stats.reduce((sum, s) => sum + s.total_orders, 0);
    const totalRevenue = stats.reduce((sum, s) => sum + s.total_revenue, 0);

    // Aggregate other metrics
    const aggregated = {
      restaurant_id: restaurantId,
      period_start: start,
      period_end: end,
      total_orders: totalOrders,
      total_revenue: this.formatNumber(totalRevenue),
      total_delivery_fee: this.formatNumber(
        stats.reduce((sum, s) => sum + s.total_delivery_fee, 0)
      ),
      total_commission: this.formatNumber(
        stats.reduce((sum, s) => sum + s.total_commission, 0)
      ),
      total_tips: this.formatNumber(
        stats.reduce((sum, s) => sum + s.total_tips, 0)
      ),
      average_order_value:
        totalOrders > 0 ? this.formatNumber(totalRevenue / totalOrders) : 0,
      order_completion_rate: this.formatNumber(
        stats.reduce((sum, s) => sum + s.order_completion_rate, 0) /
          stats.length
      ),

      // Aggregate rating summary
      rating_summary: this.aggregateRatings(stats),

      // Aggregate popular items
      popular_items: this.aggregatePopularItems(stats),

      // Revenue insights for the entire period
      revenue_insights:
        stats.length > 0 ? stats[stats.length - 1].revenue_insights : {},

      // Peak hours analysis (merge all hourly data)
      peak_hours_analysis: this.aggregatePeakHours(stats),

      // Performance metrics
      performance_metrics: this.aggregatePerformanceMetrics(stats),

      // Financial breakdown
      financial_breakdown: this.aggregateFinancialBreakdown(stats)
    };

    return aggregated;
  }

  private aggregateRatings(stats: RestaurantStatsRecord[]): any {
    const validStats = stats.filter(s => s.rating_summary?.review_count > 0);
    if (validStats.length === 0) return {};

    const totalReviews = validStats.reduce(
      (sum, s) => sum + (s.rating_summary?.review_count || 0),
      0
    );
    const weightedFoodRating = validStats.reduce(
      (sum, s) =>
        sum +
        (s.rating_summary?.average_food_rating || 0) *
          (s.rating_summary?.review_count || 0),
      0
    );
    const weightedServiceRating = validStats.reduce(
      (sum, s) =>
        sum +
        (s.rating_summary?.average_service_rating || 0) *
          (s.rating_summary?.review_count || 0),
      0
    );

    return {
      average_food_rating:
        totalReviews > 0
          ? this.formatNumber(weightedFoodRating / totalReviews)
          : 0,
      average_service_rating:
        totalReviews > 0
          ? this.formatNumber(weightedServiceRating / totalReviews)
          : 0,
      average_overall_rating:
        totalReviews > 0
          ? this.formatNumber(
              (weightedFoodRating + weightedServiceRating) / (2 * totalReviews)
            )
          : 0,
      total_ratings: totalReviews,
      review_count: totalReviews
    };
  }

  private aggregatePopularItems(stats: RestaurantStatsRecord[]): any[] {
    const itemMap = new Map();

    stats.forEach(stat => {
      if (Array.isArray(stat.popular_items)) {
        stat.popular_items.forEach(item => {
          if (!itemMap.has(item.item_id)) {
            itemMap.set(item.item_id, {
              item_id: item.item_id,
              name: item.name,
              quantity: 0,
              revenue: 0
            });
          }
          const current = itemMap.get(item.item_id);
          current.quantity += item.quantity;
          current.revenue += item.revenue;
        });
      }
    });

    return Array.from(itemMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)
      .map(item => ({
        ...item,
        revenue: this.formatNumber(item.revenue)
      }));
  }

  private aggregatePeakHours(stats: RestaurantStatsRecord[]): any {
    const hourlyData: { [hour: string]: { orders: number; revenue: number } } =
      {};

    // Initialize
    for (let i = 0; i < 24; i++) {
      hourlyData[i.toString()] = { orders: 0, revenue: 0 };
    }

    // Aggregate hourly data
    stats.forEach(stat => {
      if (stat.peak_hours_analysis?.hourly_distribution) {
        Object.entries(stat.peak_hours_analysis.hourly_distribution).forEach(
          ([hour, data]) => {
            hourlyData[hour].orders += data.orders;
            hourlyData[hour].revenue += data.revenue;
          }
        );
      }
    });

    // Calculate averages and find peaks
    const hourlyEntries = Object.entries(hourlyData).map(([hour, data]) => ({
      hour: parseInt(hour),
      orders: data.orders,
      revenue: data.revenue,
      avg_order_value:
        data.orders > 0 ? this.formatNumber(data.revenue / data.orders) : 0
    }));

    const busiestHour = hourlyEntries.reduce((max, current) =>
      current.orders > max.orders ? current : max
    ).hour;

    return {
      busiest_hour: busiestHour,
      hourly_distribution: Object.fromEntries(
        Object.entries(hourlyData).map(([hour, data]) => [
          hour,
          {
            orders: data.orders,
            revenue: this.formatNumber(data.revenue),
            avg_order_value:
              data.orders > 0
                ? this.formatNumber(data.revenue / data.orders)
                : 0
          }
        ])
      )
    };
  }

  private aggregatePerformanceMetrics(stats: RestaurantStatsRecord[]): any {
    const validStats = stats.filter(s => s.performance_metrics);
    if (validStats.length === 0) return {};

    return {
      avg_preparation_time: this.formatNumber(
        validStats.reduce(
          (sum, s) => sum + (s.performance_metrics?.avg_preparation_time || 0),
          0
        ) / validStats.length
      ),
      avg_delivery_time: this.formatNumber(
        validStats.reduce(
          (sum, s) => sum + (s.performance_metrics?.avg_delivery_time || 0),
          0
        ) / validStats.length
      ),
      customer_satisfaction_score: this.formatNumber(
        validStats.reduce(
          (sum, s) =>
            sum + (s.performance_metrics?.customer_satisfaction_score || 0),
          0
        ) / validStats.length
      )
    };
  }

  private aggregateFinancialBreakdown(stats: RestaurantStatsRecord[]): any {
    return {
      gross_revenue: this.formatNumber(
        stats.reduce(
          (sum, s) => sum + (s.financial_breakdown?.gross_revenue || 0),
          0
        )
      ),
      net_revenue: this.formatNumber(
        stats.reduce(
          (sum, s) => sum + (s.financial_breakdown?.net_revenue || 0),
          0
        )
      ),
      delivery_fees_earned: this.formatNumber(
        stats.reduce(
          (sum, s) => sum + (s.financial_breakdown?.delivery_fees_earned || 0),
          0
        )
      ),
      tips_received: this.formatNumber(
        stats.reduce(
          (sum, s) => sum + (s.financial_breakdown?.tips_received || 0),
          0
        )
      ),
      commission_paid: this.formatNumber(
        stats.reduce(
          (sum, s) => sum + (s.financial_breakdown?.commission_paid || 0),
          0
        )
      )
    };
  }

  async updateStatsForDateRange(
    restaurantId: string,
    startDate: number,
    endDate: number,
    periodType: string = 'daily'
  ): Promise<void> {
    console.log(
      `[DEBUG] Updating stats for date range: ${restaurantId} from ${startDate} to ${endDate}`
    );

    // Generate all periods in the range
    const periods = this.generatePeriodsInRange(startDate, endDate, periodType);

    // Process periods in parallel (but with concurrency limit)
    const concurrency = 5;
    for (let i = 0; i < periods.length; i += concurrency) {
      const batch = periods.slice(i, i + concurrency);
      await Promise.all(
        batch.map(({ periodStart, periodEnd }) =>
          this.calculateAndSaveStats(
            restaurantId,
            periodType,
            periodStart,
            periodEnd
          )
        )
      );
    }

    console.log(
      `[DEBUG] Completed updating ${periods.length} periods for ${restaurantId}`
    );
  }

  private generatePeriodsInRange(
    startDate: number,
    endDate: number,
    periodType: string
  ): Array<{ periodStart: number; periodEnd: number }> {
    const periods = [];
    let current = startDate;

    while (current <= endDate) {
      const { periodStart, periodEnd } = this.calculatePeriodBounds(
        periodType,
        current
      );

      if (periodStart <= endDate) {
        periods.push({ periodStart, periodEnd: Math.min(periodEnd, endDate) });
      }

      // Move to next period
      switch (periodType) {
        case 'hourly':
          current += 3600;
          break;
        case 'daily':
          current += 24 * 3600;
          break;
        case 'weekly':
          current += 7 * 24 * 3600;
          break;
        case 'monthly':
          current += 30 * 24 * 3600; // Approximate
          break;
      }
    }

    return periods;
  }

  async forceRefreshAllStats(
    restaurantId: string,
    startDate: number,
    endDate: number,
    periodType: string = 'daily'
  ): Promise<void> {
    console.log(`[DEBUG] Force refreshing all stats for ${restaurantId}`);

    // Delete existing stats in the range
    await this.restaurantStatsRepo.delete({
      restaurant_id: restaurantId,
      period_type: periodType,
      period_start: Between(startDate, endDate)
    });

    // Recalculate all stats
    await this.updateStatsForDateRange(
      restaurantId,
      startDate,
      endDate,
      periodType
    );

    console.log(`[DEBUG] Force refresh completed for ${restaurantId}`);
  }
}
