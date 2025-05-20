import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { DriverStatsRecord } from './entities/driver_stats_record.entity';
import { OnlineSession } from 'src/online-sessions/entities/online-session.entity';
import { DriverProgressStage } from 'src/driver_progress_stages/entities/driver_progress_stage.entity';
import { RatingsReview } from 'src/ratings_reviews/entities/ratings_review.entity';
import { createResponse, ApiResponse } from 'src/utils/createResponse';
import { Order, OrderStatus } from 'src/orders/entities/order.entity';
import * as Redis from 'redis';

@Injectable()
export class DriverStatsService {
  private readonly redisClient: Redis.RedisClientType;

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
  ) {
    // Initialize Redis client
    this.redisClient = Redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    this.redisClient.connect().catch(err => {
      console.error('Redis connection error:', err);
    });
  }

  // Add a helper method for caching
  private async getCachedStats(key: string): Promise<any | null> {
    try {
      const cached = await this.redisClient.get(key);
      if (cached) {
        console.log(`[CACHE HIT] Using cached stats for key: ${key}`);
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      console.error(`Error getting cached stats: ${error}`);
      return null;
    }
  }

  // Add a helper method for storing cache
  private async setCachedStats(
    key: string,
    data: any,
    ttlSeconds: number = 3600
  ): Promise<void> {
    try {
      await this.redisClient.setEx(key, ttlSeconds, JSON.stringify(data));
      console.log(`[CACHE STORE] Stored stats in cache with key: ${key}`);
    } catch (error) {
      console.error(`Error storing cached stats: ${error}`);
    }
  }

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
    aggregate: boolean = false,
    forceRefresh: boolean = false
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

      // Generate cache key based on driver, dates, and aggregate flag
      const cacheKey = `driver_stats:${driverId}:${start}:${end}:${aggregate}`;

      // Try to get from cache first (unless force refresh is true)
      if (!forceRefresh) {
        const cachedStats = await this.getCachedStats(cacheKey);
        if (cachedStats) {
          return createResponse(
            'OK',
            cachedStats,
            'Driver stats retrieved successfully (cached)'
          );
        }
      }

      // Set a timeout to prevent hanging requests (10 seconds)
      const timeoutPromise = new Promise<ApiResponse<any>>((_, reject) =>
        setTimeout(
          () => reject(new Error('Query timeout after 10 seconds')),
          10000
        )
      );

      // Create the stats generation promise
      const statsPromise = this.generateDriverStats(
        driverId,
        start,
        end,
        aggregate,
        forceRefresh
      );

      // Race between timeout and actual operation
      const result = await Promise.race([statsPromise, timeoutPromise]);

      // Cache the result if it's valid
      if (result.data) {
        await this.setCachedStats(cacheKey, result.data);
      }

      return result;
    } catch (error: any) {
      if (error.message === 'Query timeout after 10 seconds') {
        console.error('Timeout generating driver stats');
        return createResponse(
          'ServerError',
          null,
          'Request took too long, please try again'
        );
      }
      console.error('Error fetching driver stats:', error);
      return createResponse('ServerError', null, 'Error fetching driver stats');
    }
  }

  // Separate method to generate stats (moved from getStatsForDriver)
  private async generateDriverStats(
    driverId: string,
    start: number,
    end: number,
    aggregate: boolean = false,
    forceRefresh: boolean = false
  ): Promise<ApiResponse<any>> {
    // Get completed orders for the requested period - OPTIMIZATION: use direct DB query
    const completedOrders = await this.orderRepo
      .createQueryBuilder('order')
      .where('order.driver_id = :driverId', { driverId })
      .andWhere('order.status = :status', { status: OrderStatus.DELIVERED })
      .andWhere('order.updated_at >= :start AND order.updated_at <= :end', {
        start,
        end
      })
      .limit(1000) // Limit to 1000 orders max for performance
      .getMany();

    console.log(
      `[DEBUG] Found ${completedOrders.length} completed orders in date range`
    );

    // If force refresh is enabled, delete existing stats
    const stats = forceRefresh
      ? []
      : await this.driverStatsRepo.find({
          where: {
            driver_id: driverId,
            period_start: Between(start, end)
          },
          order: { period_start: 'ASC' }
        });

    if (forceRefresh) {
      console.log('[DEBUG] Force refresh enabled, deleting existing stats');
      await this.driverStatsRepo.delete({
        driver_id: driverId,
        period_start: Between(start, end)
      });
    }

    // If we have orders in range but no stats, create a stats record for the period
    if (completedOrders.length > 0 && (stats.length === 0 || forceRefresh)) {
      console.log('[DEBUG] Creating new stats record for period');

      // Get sessions for the period - OPTIMIZATION: direct DB query
      const sessions = await this.onlineSessionRepo
        .createQueryBuilder('session')
        .where('session.driver_id = :driverId', { driverId })
        .andWhere(
          'session.start_time >= :start AND session.start_time <= :end',
          { start, end }
        )
        .getMany();

      const totalOnlineHours = sessions.reduce((total, session) => {
        const endTime = session.end_time || Math.floor(Date.now() / 1000);
        const hours = (endTime - session.start_time) / 3600;
        return total + hours;
      }, 0);

      // Get all reviews for the period - OPTIMIZATION: direct DB query
      const reviews = await this.ratingsReviewRepo
        .createQueryBuilder('review')
        .where('review.rr_recipient_driver_id = :driverId', { driverId })
        .andWhere('review.created_at >= :start AND review.created_at <= :end', {
          start,
          end
        })
        .limit(1000) // Limit to 1000 reviews max for performance
        .getMany();

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
      });

      const ratingSummary = {
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

      // Calculate actual earnings from orders - OPTIMIZATION: use reduce once
      const totalEarns = completedOrders.reduce(
        (total, order) => total + Number(order.driver_wage || 0),
        0
      );

      const totalTips = completedOrders.reduce(
        (total, order) => total + Number(order.driver_tips || 0),
        0
      );

      // Create a new stats record with these values
      const newStats = this.driverStatsRepo.create({
        driver_id: driverId,
        period_type: 'daily',
        period_start: start,
        period_end: end,
        total_online_hours: totalOnlineHours,
        total_orders: completedOrders.length,
        total_earns: totalEarns,
        total_tips: totalTips,
        rating_summary: ratingSummary
      });

      const savedStats = await this.driverStatsRepo.save(newStats);
      console.log('[DEBUG] Created new stats record with ID:', savedStats.id);

      // Return newly created stats
      return createResponse(
        'OK',
        [savedStats],
        'Driver stats created and retrieved successfully'
      );
    }

    // If we get here, we either have no orders or we already have stats
    // Get the latest stats
    const updatedStats = await this.driverStatsRepo.find({
      where: {
        driver_id: driverId,
        period_start: Between(start, end)
      },
      order: { period_start: 'ASC' }
    });

    if (aggregate && updatedStats.length > 0) {
      const aggregated = {
        driver_id: driverId,
        period_start: start,
        period_end: end,
        total_online_hours: updatedStats.reduce(
          (sum, s) => sum + s.total_online_hours,
          0
        ),
        total_earns: updatedStats.reduce((sum, s) => sum + s.total_earns, 0),
        total_tips: updatedStats.reduce((sum, s) => sum + s.total_tips, 0),
        total_orders: updatedStats.reduce((sum, s) => sum + s.total_orders, 0),
        rating_summary: this.aggregateRatings(updatedStats)
      };
      return createResponse(
        'OK',
        aggregated,
        'Driver stats retrieved successfully'
      );
    }

    return createResponse(
      'OK',
      updatedStats,
      'Driver stats retrieved successfully'
    );
  }

  // Helper to aggregate rating summaries
  private aggregateRatings(stats: DriverStatsRecord[]): any {
    return {
      average_food_rating: stats.some(s => s.rating_summary?.review_count > 0)
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
    };
  }
}
