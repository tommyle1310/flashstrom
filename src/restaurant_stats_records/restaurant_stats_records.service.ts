import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { RestaurantStatsRecord } from './entities/restaurant_stats_record.entity';
import { Order, OrderStatus } from 'src/orders/entities/order.entity';
import { RatingsReview } from 'src/ratings_reviews/entities/ratings_review.entity';
import { createResponse, ApiResponse } from 'src/utils/createResponse';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';

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
    private restaurantRepo: Repository<Restaurant>
  ) {}

  private formatNumber(value: number): number {
    return Number(value.toFixed(2));
  }

  async updateStatsForRestaurant(restaurantId: string, periodType: string) {
    const now = Math.floor(Date.now() / 1000);
    let periodStart: number, periodEnd: number;

    switch (periodType) {
      case 'daily':
        const today = new Date(now * 1000);
        periodStart = Math.floor(today.setHours(0, 0, 0, 0) / 1000);
        periodEnd = Math.floor(today.setHours(23, 59, 59, 999) / 1000);
        break;
      case 'weekly':
        const weekStart = new Date(now * 1000);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        periodStart = Math.floor(weekStart.setHours(0, 0, 0, 0) / 1000);
        periodEnd = periodStart + 7 * 24 * 3600 - 1;
        break;
      case 'monthly':
        const monthStart = new Date(now * 1000);
        monthStart.setDate(1);
        periodStart = Math.floor(monthStart.setHours(0, 0, 0, 0) / 1000);
        const nextMonth = new Date(periodStart * 1000);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        periodEnd = Math.floor(nextMonth.getTime() / 1000) - 1;
        break;
      default:
        throw new Error('Invalid period type');
    }

    console.log(
      `[DEBUG] Current time: ${now}, periodStart: ${periodStart}, periodEnd: ${periodEnd}`
    );

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

    // Get restaurant operating hours
    const restaurant = await this.restaurantRepo.findOne({
      where: { id: restaurantId }
    });

    if (restaurant) {
      // Calculate online hours based on restaurant operating hours
      const operatingHours = restaurant.opening_hours || {};
      const dayOfWeek = new Date(periodStart * 1000).getDay().toString();
      const todayHours = operatingHours[dayOfWeek] || {
        open: null,
        close: null
      };

      if (todayHours.open && todayHours.close) {
        stats.total_online_hours =
          (new Date(todayHours.close).getTime() -
            new Date(todayHours.open).getTime()) /
          3600000;
      }
    }

    // Get completed orders for the period
    const completedOrders = await this.orderRepo.find({
      where: {
        restaurant_id: restaurantId,
        status: OrderStatus.DELIVERED,
        updated_at: Between(periodStart, periodEnd)
      }
    });

    console.log(
      `[DEBUG] Found ${completedOrders.length} completed orders for restaurant ${restaurantId}:`,
      completedOrders.map(o => ({
        id: o.id,
        status: o.status,
        total_amount: o.total_amount,
        delivery_fee: o.delivery_fee,
        service_fee: o.service_fee,
        driver_tips: o.driver_tips
      }))
    );

    // Calculate order statistics
    stats.total_orders = completedOrders.length;
    stats.total_revenue = completedOrders.reduce(
      (sum, order) => sum + Number(order.total_amount || 0),
      0
    );
    stats.total_delivery_fee = completedOrders.reduce(
      (sum, order) => sum + Number(order.delivery_fee || 0),
      0
    );
    stats.total_commission = completedOrders.reduce(
      (sum, order) => sum + Number(order.service_fee || 0),
      0
    );
    stats.total_tips = completedOrders.reduce(
      (sum, order) => sum + Number(order.driver_tips || 0),
      0
    );

    // Get all reviews for the period
    const reviews = await this.ratingsReviewRepo.find({
      where: {
        rr_recipient_restaurant_id: restaurantId,
        created_at: Between(periodStart, periodEnd)
      }
    });

    console.log(
      `[DEBUG] Found ${reviews.length} reviews for restaurant ${restaurantId}:`,
      reviews.map(r => ({
        id: r.id,
        food_rating: r.food_rating,
        delivery_rating: r.delivery_rating,
        created_at: r.created_at
      }))
    );

    // Initialize rating distribution
    const ratingDistribution = {
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0
    };

    // Calculate rating metrics
    let totalFoodRating = 0;
    let totalServiceRating = 0;
    let totalOverallRating = 0;

    reviews.forEach(review => {
      const foodRating = review.food_rating || 0;
      const serviceRating = review.delivery_rating || 0;

      totalFoodRating += foodRating;
      totalServiceRating += serviceRating;

      // Calculate overall rating for this review
      const overallRating = (foodRating + serviceRating) / 2;
      totalOverallRating += overallRating;

      // Update rating distribution
      const roundedRating = Math.round(overallRating);
      if (roundedRating >= 1 && roundedRating <= 5) {
        ratingDistribution[roundedRating.toString()]++;
      }
    });

    // Calculate rating summary
    stats.rating_summary = {
      average_food_rating: reviews.length
        ? totalFoodRating / reviews.length
        : 0,
      average_service_rating: reviews.length
        ? totalServiceRating / reviews.length
        : 0,
      average_overall_rating: reviews.length
        ? totalOverallRating / reviews.length
        : 0,
      total_ratings: reviews.length,
      review_count: reviews.length,
      rating_distribution: ratingDistribution
    };

    // Update order status summary
    const allOrders = await this.orderRepo.find({
      where: {
        restaurant_id: restaurantId,
        updated_at: Between(periodStart, periodEnd)
      }
    });

    stats.order_status_summary = {
      completed: allOrders.filter(o => o.status === OrderStatus.DELIVERED)
        .length,
      cancelled: allOrders.filter(o => o.status === OrderStatus.CANCELLED)
        .length,
      rejected: allOrders.filter(o => o.status === OrderStatus.CANCELLED).length // Changed from REJECTED to CANCELLED
    };

    await this.restaurantStatsRepo.save(stats);
    console.log('[DEBUG] Final stats:', JSON.stringify(stats, null, 2));
  }

  async updateStatsForDateRange(
    restaurantId: string,
    startDate: number,
    endDate: number,
    periodType: string = 'daily'
  ) {
    const start = new Date(startDate * 1000);
    const end = new Date(endDate * 1000);
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const periodStart = Math.floor(currentDate.setHours(0, 0, 0, 0) / 1000);
      const periodEnd = Math.floor(
        currentDate.setHours(23, 59, 59, 999) / 1000
      );

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

      // Get orders for the period
      const orders = await this.orderRepo.find({
        where: {
          restaurant_id: restaurantId,
          created_at: Between(periodStart, periodEnd)
        }
      });

      // Calculate order statistics
      stats.total_orders = orders.length;
      stats.total_revenue = orders.reduce(
        (sum, order) => sum + (order.total_amount || 0),
        0
      );
      stats.total_delivery_fee = orders.reduce(
        (sum, order) => sum + (order.delivery_fee || 0),
        0
      );
      stats.total_commission = orders.reduce(
        (sum, order) => sum + (order.service_fee || 0),
        0
      );
      stats.total_tips = orders.reduce(
        (sum, order) => sum + (order.driver_tips || 0),
        0
      );

      // Calculate order status summary
      stats.order_status_summary = {
        completed: orders.filter(o => o.status === OrderStatus.DELIVERED)
          .length,
        cancelled: orders.filter(o => o.status === OrderStatus.CANCELLED)
          .length,
        rejected: orders.filter(o => o.status === OrderStatus.RETURNED).length
      };

      // Get reviews for the period
      const reviews = await this.ratingsReviewRepo.find({
        where: {
          rr_recipient_restaurant_id: restaurantId,
          created_at: Between(periodStart, periodEnd)
        }
      });

      // Initialize rating distribution
      const ratingDistribution = {
        '1': 0,
        '2': 0,
        '3': 0,
        '4': 0,
        '5': 0
      };

      // Calculate rating metrics
      let totalFoodRating = 0;
      let totalServiceRating = 0;
      let totalOverallRating = 0;

      reviews.forEach(review => {
        const foodRating = review.food_rating || 0;
        const serviceRating = review.delivery_rating || 0;

        totalFoodRating += foodRating;
        totalServiceRating += serviceRating;

        // Calculate overall rating for this review
        const overallRating = (foodRating + serviceRating) / 2;
        totalOverallRating += overallRating;

        // Update rating distribution
        const roundedRating = Math.round(overallRating);
        if (roundedRating >= 1 && roundedRating <= 5) {
          ratingDistribution[roundedRating.toString()]++;
        }
      });

      // Calculate rating summary
      stats.rating_summary = {
        average_food_rating: reviews.length
          ? totalFoodRating / reviews.length
          : 0,
        average_service_rating: reviews.length
          ? totalServiceRating / reviews.length
          : 0,
        average_overall_rating: reviews.length
          ? totalOverallRating / reviews.length
          : 0,
        total_ratings: reviews.length,
        review_count: reviews.length,
        rating_distribution: ratingDistribution
      };

      // Calculate popular items
      const itemMap = new Map();
      orders.forEach(order => {
        order.order_items.forEach(item => {
          const key = item.item_id;
          if (!itemMap.has(key)) {
            itemMap.set(key, {
              item_id: item.item_id,
              name: item.name,
              quantity: 0,
              revenue: 0
            });
          }
          const current = itemMap.get(key);
          current.quantity += item.quantity;
          current.revenue += item.price_at_time_of_order * item.quantity;
        });
      });

      stats.popular_items = Array.from(itemMap.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);

      await this.restaurantStatsRepo.save(stats);

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  async getStatsForRestaurant(
    restaurantId: string,
    startDate: number | string,
    endDate: number | string,
    aggregate: boolean = false
  ): Promise<ApiResponse<any>> {
    try {
      // Convert dates to timestamps if they're date strings
      const start =
        typeof startDate === 'string'
          ? Math.floor(new Date(startDate).getTime() / 1000)
          : startDate;
      const end =
        typeof endDate === 'string'
          ? Math.floor(new Date(endDate).getTime() / 1000)
          : endDate;

      console.log('[DEBUG] Date conversion:', {
        originalStart: startDate,
        originalEnd: endDate,
        convertedStart: start,
        convertedEnd: end
      });

      // Force update stats for the period first
      await this.updateStatsForRestaurant(restaurantId, 'daily');

      // Get the updated stats
      let stats = await this.restaurantStatsRepo.find({
        where: {
          restaurant_id: restaurantId,
          period_start: Between(start, end)
        },
        order: { period_start: 'ASC' }
      });

      // Get completed orders directly to ensure we have the latest data
      const completedOrders = await this.orderRepo.find({
        where: {
          restaurant_id: restaurantId,
          status: OrderStatus.DELIVERED,
          updated_at: Between(start, end)
        }
      });

      // If we have completed orders but no stats, create new stats
      if (completedOrders.length > 0 && stats.length === 0) {
        const newStats = this.restaurantStatsRepo.create({
          restaurant_id: restaurantId,
          period_type: 'daily',
          period_start: start,
          period_end: end,
          total_orders: completedOrders.length,
          total_revenue: completedOrders.reduce(
            (sum, order) => sum + Number(order.total_amount || 0),
            0
          ),
          total_delivery_fee: completedOrders.reduce(
            (sum, order) => sum + Number(order.delivery_fee || 0),
            0
          ),
          total_commission: completedOrders.reduce(
            (sum, order) => sum + Number(order.service_fee || 0),
            0
          ),
          total_tips: completedOrders.reduce(
            (sum, order) => sum + Number(order.driver_tips || 0),
            0
          ),
          rating_summary: {
            average_food_rating: 0,
            average_service_rating: 0,
            average_overall_rating: 0,
            total_ratings: 0,
            review_count: 0,
            rating_distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
          }
        });
        await this.restaurantStatsRepo.save(newStats);
        stats = [newStats];
      }

      if (aggregate) {
        const aggregated = {
          restaurant_id: restaurantId,
          period_start: start,
          period_end: end,
          total_orders: stats.reduce((sum, s) => sum + s.total_orders, 0),
          total_revenue: stats.reduce((sum, s) => sum + s.total_revenue, 0),
          total_delivery_fee: stats.reduce(
            (sum, s) => sum + s.total_delivery_fee,
            0
          ),
          total_commission: stats.reduce(
            (sum, s) => sum + s.total_commission,
            0
          ),
          total_tips: stats.reduce((sum, s) => sum + s.total_tips, 0),
          total_online_hours: stats.reduce(
            (sum, s) => sum + s.total_online_hours,
            0
          ),
          rating_summary: {
            average_food_rating: stats.some(
              s => s.rating_summary?.review_count > 0
            )
              ? stats.reduce(
                  (sum, s) =>
                    sum +
                    (s.rating_summary?.average_food_rating || 0) *
                      (s.rating_summary?.review_count || 0),
                  0
                ) /
                stats.reduce(
                  (sum, s) => sum + (s.rating_summary?.review_count || 0),
                  0
                )
              : 0,
            average_service_rating: stats.some(
              s => s.rating_summary?.review_count > 0
            )
              ? stats.reduce(
                  (sum, s) =>
                    sum +
                    (s.rating_summary?.average_service_rating || 0) *
                      (s.rating_summary?.review_count || 0),
                  0
                ) /
                stats.reduce(
                  (sum, s) => sum + (s.rating_summary?.review_count || 0),
                  0
                )
              : 0,
            average_overall_rating: stats.some(
              s => s.rating_summary?.review_count > 0
            )
              ? stats.reduce(
                  (sum, s) =>
                    sum +
                    (s.rating_summary?.average_overall_rating || 0) *
                      (s.rating_summary?.review_count || 0),
                  0
                ) /
                stats.reduce(
                  (sum, s) => sum + (s.rating_summary?.review_count || 0),
                  0
                )
              : 0,
            total_ratings: stats.reduce(
              (sum, s) => sum + (s.rating_summary?.total_ratings || 0),
              0
            ),
            review_count: stats.reduce(
              (sum, s) => sum + (s.rating_summary?.review_count || 0),
              0
            ),
            rating_distribution: stats.reduce(
              (dist, s) => {
                if (s.rating_summary?.rating_distribution) {
                  Object.entries(s.rating_summary.rating_distribution).forEach(
                    ([rating, count]) => {
                      dist[rating] = (dist[rating] || 0) + (count || 0);
                    }
                  );
                }
                return dist;
              },
              { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
            )
          }
        };
        return createResponse(
          'OK',
          aggregated,
          'Restaurant stats retrieved successfully'
        );
      }

      return createResponse(
        'OK',
        stats,
        'Restaurant stats retrieved successfully'
      );
    } catch (error: any) {
      console.error('Error fetching restaurant stats:', error);
      return createResponse(
        'ServerError',
        null,
        'Error fetching restaurant stats'
      );
    }
  }
}
