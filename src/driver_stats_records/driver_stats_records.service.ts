import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { DriverStatsRecord } from './entities/driver_stats_record.entity';
import { OnlineSession } from 'src/online-sessions/entities/online-session.entity';
import { DriverProgressStage } from 'src/driver_progress_stages/entities/driver_progress_stage.entity';
import { RatingsReview } from 'src/ratings_reviews/entities/ratings_review.entity';
import { createResponse, ApiResponse } from 'src/utils/createResponse';
import { Order, OrderStatus } from 'src/orders/entities/order.entity';

@Injectable()
export class DriverStatsService {
  constructor(
    @InjectRepository(DriverStatsRecord)
    private driverStatsRepo: Repository<DriverStatsRecord>,
    @InjectRepository(OnlineSession)
    private onlineSessionRepo: Repository<OnlineSession>,
    @InjectRepository(DriverProgressStage)
    private dpsRepo: Repository<DriverProgressStage>,
    @InjectRepository(RatingsReview)
    private ratingsReviewRepo: Repository<RatingsReview>,
    @InjectRepository(Order)
    private orderRepo: Repository<Order>
  ) {}

  async updateStatsForDriver(driverId: string, periodType: string) {
    const now = Math.floor(Date.now() / 1000);
    let periodStart: number, periodEnd: number;

    switch (periodType) {
      case 'daily':
        const today = new Date(now * 1000);
        periodStart = Math.floor(today.setHours(0, 0, 0, 0) / 1000);
        periodEnd = Math.floor(today.setHours(23, 59, 59, 999) / 1000);
        break;
      default:
        throw new Error('Invalid period type');
    }

    console.log(
      `[DEBUG] Current time: ${now}, periodStart: ${periodStart}, periodEnd: ${periodEnd}`
    );

    let stats = await this.driverStatsRepo.findOne({
      where: {
        driver_id: driverId,
        period_type: periodType,
        period_start: periodStart
      }
    });
    if (!stats) {
      stats = this.driverStatsRepo.create({
        driver_id: driverId,
        period_type: periodType,
        period_start: periodStart,
        period_end: periodEnd
      });
    }

    // Calculate online hours
    const sessions = await this.onlineSessionRepo.find({
      where: {
        driver_id: driverId,
        start_time: Between(periodStart, periodEnd)
      }
    });
    console.log(
      `[DEBUG] Found ${sessions.length} OnlineSessions for driver ${driverId}:`,
      sessions
    );
    stats.total_online_hours = sessions.reduce((total, session) => {
      const endTime = session.end_time || now;
      const hours = (endTime - session.start_time) / 3600;
      console.log(
        `[DEBUG] Session ${session.id}: start=${session.start_time}, end=${endTime}, hours=${hours}`
      );
      return total + hours;
    }, 0);

    // Get completed orders for the period
    const completedOrders = await this.orderRepo.find({
      where: {
        driver_id: driverId,
        status: OrderStatus.DELIVERED,
        updated_at: Between(periodStart, periodEnd)
      }
    });

    console.log(
      `[DEBUG] Found ${completedOrders.length} completed orders for driver ${driverId} between ${periodStart} and ${periodEnd}:`,
      completedOrders.map(o => ({
        id: o.id,
        status: o.status,
        updated_at: o.updated_at,
        driver_wage: o.driver_wage,
        driver_tips: o.driver_tips
      }))
    );

    // Calculate total orders and earnings from completed orders
    stats.total_orders = completedOrders.length;
    stats.total_earns = completedOrders.reduce((sum, order) => {
      const wage = Number(order.driver_wage || 0);
      console.log(`[DEBUG] Order ${order.id} driver_wage: ${wage}`);
      return sum + wage;
    }, 0);
    stats.total_tips = completedOrders.reduce((sum, order) => {
      const tips = Number(order.driver_tips || 0);
      console.log(`[DEBUG] Order ${order.id} driver_tips: ${tips}`);
      return sum + tips;
    }, 0);

    // Get all reviews for the period
    const reviews = await this.ratingsReviewRepo.find({
      where: {
        rr_recipient_driver_id: driverId,
        created_at: Between(periodStart, periodEnd)
      }
    });

    console.log(
      `[DEBUG] Found ${reviews.length} reviews for driver ${driverId}:`,
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
    let totalDeliveryRating = 0;
    let totalOverallRating = 0;

    reviews.forEach(review => {
      const foodRating = review.food_rating || 0;
      const deliveryRating = review.delivery_rating || 0;

      totalFoodRating += foodRating;
      totalDeliveryRating += deliveryRating;

      // Calculate overall rating for this review
      const overallRating = (foodRating + deliveryRating) / 2;
      totalOverallRating += overallRating;

      // Update rating distribution
      const roundedRating = Math.round(overallRating);
      if (roundedRating >= 1 && roundedRating <= 5) {
        ratingDistribution[roundedRating.toString()]++;
      }

      console.log(
        `[DEBUG] Review ratings - food: ${foodRating}, delivery: ${deliveryRating}, overall: ${overallRating}, rounded: ${roundedRating}`
      );
    });

    stats.rating_summary = {
      average_food_rating: reviews.length
        ? totalFoodRating / reviews.length
        : 0,
      average_delivery_rating: reviews.length
        ? totalDeliveryRating / reviews.length
        : 0,
      average_overall_rating: reviews.length
        ? totalOverallRating / reviews.length
        : 0,
      total_ratings: reviews.length,
      review_count: reviews.length,
      rating_distribution: ratingDistribution
    };

    await this.driverStatsRepo.save(stats);
    console.log(
      '[DEBUG] Final stats:',
      JSON.stringify(
        {
          driver_id: driverId,
          total_online_hours: stats.total_online_hours,
          total_earns: stats.total_earns,
          total_tips: stats.total_tips,
          total_orders: stats.total_orders,
          rating_summary: stats.rating_summary
        },
        null,
        2
      )
    );
  }

  async getStatsForDriver(
    driverId: string,
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
      await this.updateStatsForDriver(driverId, 'daily');

      // Get the updated stats
      let stats = await this.driverStatsRepo.find({
        where: {
          driver_id: driverId,
          period_start: Between(start, end)
        },
        order: { period_start: 'ASC' }
      });

      // Get completed orders directly to ensure we have the latest data
      const completedOrders = await this.orderRepo.find({
        where: {
          driver_id: driverId,
          status: OrderStatus.DELIVERED,
          updated_at: Between(start, end)
        }
      });

      console.log(
        '[DEBUG] Found completed orders:',
        completedOrders.map(o => ({
          id: o.id,
          status: o.status,
          driver_wage: o.driver_wage,
          driver_tips: o.driver_tips,
          updated_at: o.updated_at
        }))
      );

      // If we have completed orders but no stats, something's wrong - force create stats
      if (completedOrders.length > 0 && stats.length === 0) {
        const newStats = this.driverStatsRepo.create({
          driver_id: driverId,
          period_type: 'daily',
          period_start: start,
          period_end: end,
          total_orders: completedOrders.length,
          total_earns: completedOrders.reduce(
            (sum, order) => sum + Number(order.driver_wage || 0),
            0
          ),
          total_tips: completedOrders.reduce(
            (sum, order) => sum + Number(order.driver_tips || 0),
            0
          ),
          rating_summary: {
            average_food_rating: 0,
            average_delivery_rating: 0,
            average_overall_rating: 0,
            total_ratings: 0,
            review_count: 0,
            rating_distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
          }
        });
        await this.driverStatsRepo.save(newStats);
        stats = [newStats]; // Update stats array with the new record
      }

      if (aggregate) {
        const aggregated = {
          driver_id: driverId,
          period_start: start,
          period_end: end,
          total_online_hours: stats.reduce(
            (sum, s) => sum + s.total_online_hours,
            0
          ),
          total_earns: stats.reduce((sum, s) => sum + s.total_earns, 0),
          total_tips: stats.reduce((sum, s) => sum + s.total_tips, 0),
          total_orders: stats.reduce((sum, s) => sum + s.total_orders, 0),
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
            average_delivery_rating: stats.some(
              s => s.rating_summary?.review_count > 0
            )
              ? stats.reduce(
                  (sum, s) =>
                    sum +
                    (s.rating_summary?.average_delivery_rating || 0) *
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
          'Driver stats retrieved successfully'
        );
      }

      return createResponse('OK', stats, 'Driver stats retrieved successfully');
    } catch (error: any) {
      console.error('Error fetching driver stats:', error);
      return createResponse('ServerError', null, 'Error fetching driver stats');
    }
  }
}
