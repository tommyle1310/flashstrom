import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { RestaurantStatsRecord } from './entities/restaurant_stats_record.entity';
import { Order, OrderStatus } from 'src/orders/entities/order.entity';
import { RatingsReview } from 'src/ratings_reviews/entities/ratings_review.entity';
import { createResponse, ApiResponse } from 'src/utils/createResponse';

@Injectable()
export class RestaurantStatsService {
  constructor(
    @InjectRepository(RestaurantStatsRecord)
    private restaurantStatsRepo: Repository<RestaurantStatsRecord>,
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(RatingsReview)
    private ratingsReviewRepo: Repository<RatingsReview>
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
    stats.total_revenue = this.formatNumber(
      orders.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0)
    );
    stats.total_delivery_fee = this.formatNumber(
      orders.reduce((sum, order) => sum + (Number(order.delivery_fee) || 0), 0)
    );
    stats.total_commission = this.formatNumber(
      orders.reduce((sum, order) => sum + (Number(order.service_fee) || 0), 0)
    );
    stats.total_tips = this.formatNumber(
      orders.reduce((sum, order) => sum + (Number(order.driver_tips) || 0), 0)
    );

    // Calculate order status summary
    stats.order_status_summary = {
      completed: orders.filter(o => o.status === OrderStatus.DELIVERED).length,
      cancelled: orders.filter(o => o.status === OrderStatus.CANCELLED).length,
      rejected: orders.filter(o => o.status === OrderStatus.RETURNED).length
    };

    // Get reviews for the period
    const reviews = await this.ratingsReviewRepo.find({
      where: {
        rr_recipient_restaurant_id: restaurantId,
        created_at: Between(periodStart, periodEnd)
      }
    });

    // Calculate rating summary
    stats.rating_summary = {
      average_food_rating: reviews.length
        ? this.formatNumber(
            reviews.reduce((sum, r) => sum + r.food_rating, 0) / reviews.length
          )
        : 0,
      average_service_rating: reviews.length
        ? this.formatNumber(
            reviews.reduce((sum, r) => sum + r.delivery_rating, 0) /
              reviews.length
          )
        : 0,
      review_count: reviews.length
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
        current.revenue = this.formatNumber(
          current.revenue + Number(item.price_at_time_of_order) * item.quantity
        );
      });
    });

    stats.popular_items = Array.from(itemMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    await this.restaurantStatsRepo.save(stats);
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

      // Calculate rating summary
      stats.rating_summary = {
        average_food_rating: reviews.length
          ? reviews.reduce((sum, r) => sum + r.food_rating, 0) / reviews.length
          : 0,
        average_service_rating: reviews.length
          ? reviews.reduce((sum, r) => sum + r.delivery_rating, 0) /
            reviews.length
          : 0,
        review_count: reviews.length
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
    startDate: number,
    endDate: number,
    aggregate: boolean = false
  ): Promise<ApiResponse<any>> {
    try {
      const stats = await this.restaurantStatsRepo.find({
        where: {
          restaurant_id: restaurantId,
          period_start: Between(startDate, endDate)
        },
        order: { period_start: 'ASC' }
      });

      if (aggregate) {
        const aggregated = {
          restaurant_id: restaurantId,
          period_start: startDate,
          period_end: endDate,
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
          rating_summary: {
            average_food_rating: stats.some(
              s => s.rating_summary.review_count > 0
            )
              ? stats.reduce(
                  (sum, s) =>
                    sum +
                    s.rating_summary.average_food_rating *
                      s.rating_summary.review_count,
                  0
                ) /
                stats.reduce((sum, s) => sum + s.rating_summary.review_count, 0)
              : 0,
            average_service_rating: stats.some(
              s => s.rating_summary.review_count > 0
            )
              ? stats.reduce(
                  (sum, s) =>
                    sum +
                    s.rating_summary.average_service_rating *
                      s.rating_summary.review_count,
                  0
                ) /
                stats.reduce((sum, s) => sum + s.rating_summary.review_count, 0)
              : 0,
            review_count: stats.reduce(
              (sum, s) => sum + s.rating_summary.review_count,
              0
            )
          },
          order_status_summary: {
            completed: stats.reduce(
              (sum, s) => sum + s.order_status_summary.completed,
              0
            ),
            cancelled: stats.reduce(
              (sum, s) => sum + s.order_status_summary.cancelled,
              0
            ),
            rejected: stats.reduce(
              (sum, s) => sum + s.order_status_summary.rejected,
              0
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
