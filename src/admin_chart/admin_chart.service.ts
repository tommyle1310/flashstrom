import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AdminChartRecord } from './entities/admin_chart_record.entity';
import { Order, OrderStatus } from 'src/orders/entities/order.entity';
import { User } from 'src/users/entities/user.entity';
import { Promotion } from 'src/promotions/entities/promotion.entity';
import { Customer } from 'src/customers/entities/customer.entity';
import { Driver } from 'src/drivers/entities/driver.entity';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { RatingsReview } from 'src/ratings_reviews/entities/ratings_review.entity';
import { createResponse, ApiResponse } from 'src/utils/createResponse';
import { PeriodType } from './dto/admin_chart_query.dto';
import * as Redis from 'redis';
import { CustomerCare } from 'src/customer_cares/entities/customer_care.entity';
import { DataSource } from 'typeorm';
// import { FLASHFOOD_FINANCE } from 'src/utils/constants';

@Injectable()
export class AdminChartService {
  private readonly redisClient: Redis.RedisClientType;

  constructor(
    @InjectRepository(AdminChartRecord)
    private adminChartRepo: Repository<AdminChartRecord>,
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Promotion)
    private promotionRepo: Repository<Promotion>,
    @InjectRepository(Customer)
    private customerRepo: Repository<Customer>,
    @InjectRepository(CustomerCare)
    private customerCareRepo: Repository<CustomerCare>,
    @InjectRepository(Driver)
    private driverRepo: Repository<Driver>,
    @InjectRepository(Restaurant)
    private restaurantRepo: Repository<Restaurant>,
    @InjectRepository(RatingsReview)
    private ratingsReviewRepo: Repository<RatingsReview>,
    private dataSource: DataSource
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
  private async getCachedData(key: string): Promise<any | null> {
    try {
      const cached = await this.redisClient.get(key);
      if (cached) {
        console.log(
          `[CACHE HIT] Using cached admin chart data for key: ${key}`
        );
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      console.error(`Error getting cached admin chart data: ${error}`);
      return null;
    }
  }

  // Add a helper method for storing cache
  private async setCachedData(
    key: string,
    data: any,
    ttlSeconds: number = 3600
  ): Promise<void> {
    try {
      await this.redisClient.setEx(key, ttlSeconds, JSON.stringify(data));
      console.log(
        `[CACHE STORE] Stored admin chart data in cache with key: ${key}`
      );
    } catch (error) {
      console.error(`Error storing cached admin chart data: ${error}`);
    }
  }

  async getChartData(
    startDate: number,
    endDate: number,
    periodType: PeriodType = PeriodType.DAILY,
    forceRefresh: boolean = false
  ): Promise<ApiResponse<any>> {
    try {
      // Generate cache key
      const cacheKey = `admin_chart:${startDate}:${endDate}:${periodType}`;

      // Try to get from cache first (unless force refresh is true)
      if (!forceRefresh) {
        const cachedData = await this.getCachedData(cacheKey);
        if (cachedData) {
          return createResponse(
            'OK',
            cachedData,
            'Admin chart data retrieved successfully (cached)'
          );
        }
      }

      // If force refresh or not in cache, generate data
      if (forceRefresh) {
        // Generate new chart data
        await this.generateChartData(startDate, endDate, periodType);
      }

      // Fetch the chart data
      let chartData = await this.adminChartRepo.findOne({
        where: {
          period_start: startDate,
          period_end: endDate,
          period_type: periodType
        }
      });

      // If no data found, generate it
      if (!chartData) {
        await this.generateChartData(startDate, endDate, periodType);

        // Try fetching again
        chartData = await this.adminChartRepo.findOne({
          where: {
            period_start: startDate,
            period_end: endDate,
            period_type: periodType
          }
        });

        // If still no data, return empty response
        if (!chartData) {
          return createResponse(
            'NotFound',
            null,
            'No chart data available for the requested period'
          );
        }
      }

      // Cache the result
      await this.setCachedData(cacheKey, chartData);

      return createResponse(
        'OK',
        chartData,
        'Admin chart data retrieved successfully'
      );
    } catch (error) {
      console.error('Error retrieving admin chart data:', error);
      return createResponse(
        'ServerError',
        null,
        'Error retrieving admin chart data'
      );
    }
  }

  async generateChartData(
    startDate: number,
    endDate: number,
    periodType: PeriodType = PeriodType.DAILY
  ): Promise<void> {
    try {
      console.log(
        `Generating admin chart data for period ${startDate} - ${endDate}`
      );

      const sampleOrders = await this.orderRepo
        .createQueryBuilder('order')
        .select([
          'order.id',
          'order.created_at',
          'order.status',
          'order.total_amount'
        ])
        .orderBy('order.created_at', 'DESC')
        .limit(10)
        .getRawMany();

      console.log(
        `[DEBUG] Sample recent orders:`,
        sampleOrders.map(o => ({
          id: o.order_id,
          created_at: o.order_created_at,
          created_at_date: new Date(o.order_created_at * 1000).toISOString(),
          status: o.order_status,
          total_amount: o.order_total_amount
        }))
      );

      const periodDuration = endDate - startDate;
      const lastMonthStartDate = startDate - 30 * 24 * 60 * 60;
      const lastMonthEndDate = lastMonthStartDate + periodDuration;

      console.log(`[DEBUG] Current period: ${startDate} - ${endDate}`);
      console.log(
        `[DEBUG] Last month period: ${lastMonthStartDate} - ${lastMonthEndDate}`
      );

      await this.adminChartRepo.delete({
        period_start: startDate,
        period_end: endDate,
        period_type: periodType
      });

      const [
        totalUsers,
        soldPromotions,
        netIncome,
        grossIncome,
        orderStats,
        userGrowthRate,
        currentGrossFromPromotion,
        currentAvgCustomerSatisfaction,
        currentAvgDeliveryTime,
        currentOrderCancellationRate,
        currentOrderVolume,
        currentChurnRate
      ] = await Promise.all([
        this.calculateTotalUsers(startDate, endDate),
        this.calculateSoldPromotions(startDate, endDate),
        this.calculateNetIncome(startDate, endDate),
        this.calculateGrossIncome(startDate, endDate),
        this.calculateOrderStats(startDate, endDate),
        this.calculateUserGrowthRate(startDate, endDate),
        this.calculateGrossFromPromotion(startDate, endDate),
        this.calculateAvgCustomerSatisfaction(startDate, endDate),
        this.calculateAvgDeliveryTime(startDate, endDate),
        this.calculateOrderCancellationRate(startDate, endDate),
        this.calculateOrderVolume(startDate, endDate),
        this.calculateChurnRate(startDate, endDate)
      ]);

      const [
        lastMonthGrossFromPromotion,
        lastMonthAvgCustomerSatisfaction,
        lastMonthAvgDeliveryTime,
        lastMonthOrderCancellationRate,
        lastMonthOrderVolume,
        lastMonthChurnRate
      ] = await Promise.all([
        this.calculateGrossFromPromotion(lastMonthStartDate, lastMonthEndDate),
        this.calculateAvgCustomerSatisfaction(
          lastMonthStartDate,
          lastMonthEndDate
        ),
        this.calculateAvgDeliveryTime(lastMonthStartDate, lastMonthEndDate),
        this.calculateOrderCancellationRate(
          lastMonthStartDate,
          lastMonthEndDate
        ),
        this.calculateOrderVolume(lastMonthStartDate, lastMonthEndDate),
        this.calculateChurnRate(lastMonthStartDate, lastMonthEndDate)
      ]);

      const calculatePercentageChange = (
        current: number,
        previous: number
      ): number => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Number((((current - previous) / previous) * 100).toFixed(2));
      };

      const calculateRealChange = (
        current: number,
        previous: number
      ): number => {
        return Number((current - previous).toFixed(2));
      };

      const grossFromPromotion = {
        metric: currentGrossFromPromotion,
        monthlyChanges: calculateRealChange(
          currentGrossFromPromotion,
          lastMonthGrossFromPromotion
        ),
        changeType: 'real' as const
      };

      const averageCustomerSatisfaction = {
        metric: currentAvgCustomerSatisfaction,
        monthlyChanges: calculateRealChange(
          currentAvgCustomerSatisfaction,
          lastMonthAvgCustomerSatisfaction
        ),
        changeType: 'real' as const
      };

      const averageDeliveryTime = {
        metric: currentAvgDeliveryTime,
        monthlyChanges: calculateRealChange(
          currentAvgDeliveryTime,
          lastMonthAvgDeliveryTime
        ),
        changeType: 'real' as const
      };

      const orderCancellationRate = {
        metric: currentOrderCancellationRate,
        monthlyChanges: calculatePercentageChange(
          currentOrderCancellationRate,
          lastMonthOrderCancellationRate
        ),
        changeType: 'percentage' as const
      };

      const orderVolume = {
        metric: currentOrderVolume,
        monthlyChanges: calculateRealChange(
          currentOrderVolume,
          lastMonthOrderVolume
        ),
        changeType: 'real' as const
      };

      const churnRate = {
        metric: currentChurnRate,
        monthlyChanges: calculatePercentageChange(
          currentChurnRate,
          lastMonthChurnRate
        ),
        changeType: 'percentage' as const
      };

      const chartData = this.adminChartRepo.create({
        period_type: periodType,
        period_start: startDate,
        period_end: endDate,
        total_users: totalUsers,
        sold_promotions: soldPromotions,
        net_income: netIncome,
        gross_income: grossIncome,
        order_stats: orderStats,
        user_growth_rate: userGrowthRate,
        gross_from_promotion: grossFromPromotion,
        average_customer_satisfaction: averageCustomerSatisfaction,
        average_delivery_time: averageDeliveryTime,
        order_cancellation_rate: orderCancellationRate,
        order_volume: orderVolume,
        churn_rate: churnRate
      });

      await this.adminChartRepo.save(chartData);
      console.log(
        `Admin chart data generated successfully for period ${startDate} - ${endDate}`
      );
    } catch (error) {
      console.error('Error generating admin chart data:', error);
      throw new Error('Failed to generate admin chart data');
    }
  }

  // Helper methods to calculate each metric
  private async calculateTotalUsers(
    startDate: number,
    endDate: number
  ): Promise<{ metric: number; monthlyChanges: number; changeType: 'real' }> {
    try {
      const totalUsers = await this.userRepo.count({
        where: {
          created_at: Between(new Date(0), new Date(endDate * 1000))
        }
      });

      const periodDuration = endDate - startDate;
      const lastMonthStartDate = startDate - 30 * 24 * 60 * 60;
      const lastMonthEndDate = lastMonthStartDate + periodDuration;

      const lastMonthTotalUsers = await this.userRepo.count({
        where: {
          created_at: Between(new Date(0), new Date(lastMonthEndDate * 1000))
        }
      });

      const monthlyChanges = Number(
        (totalUsers - lastMonthTotalUsers).toFixed(2)
      );

      return {
        metric: totalUsers,
        monthlyChanges,
        changeType: 'real'
      };
    } catch (error) {
      console.error('Error calculating total users:', error);
      return { metric: 0, monthlyChanges: 0, changeType: 'real' };
    }
  }

  private async calculateSoldPromotions(
    startDate: number,
    endDate: number
  ): Promise<{ metric: number; monthlyChanges: number; changeType: 'real' }> {
    try {
      // Since restaurant_promotions junction table doesn't have timestamps,
      // we count promotions currently applied by restaurants that were created in this period
      // This gives us an approximation of promotion sales during the period
      const result = await this.dataSource
        .createQueryBuilder()
        .select('COUNT(DISTINCT rp.promotion_id)', 'count')
        .from('restaurant_promotions', 'rp')
        .innerJoin('restaurants', 'r', 'r.id = rp.restaurant_id')
        .where('r.created_at BETWEEN :startDate AND :endDate', {
          startDate,
          endDate
        })
        .getRawOne();

      const currentSoldPromotions = parseInt(result?.count || '0');

      // Calculate the same period last month for comparison
      const periodDuration = endDate - startDate;
      const lastMonthStartDate = startDate - 30 * 24 * 60 * 60;
      const lastMonthEndDate = lastMonthStartDate + periodDuration;

      const lastMonthResult = await this.dataSource
        .createQueryBuilder()
        .select('COUNT(DISTINCT rp.promotion_id)', 'count')
        .from('restaurant_promotions', 'rp')
        .innerJoin('restaurants', 'r', 'r.id = rp.restaurant_id')
        .where('r.created_at BETWEEN :startDate AND :endDate', {
          startDate: lastMonthStartDate,
          endDate: lastMonthEndDate
        })
        .getRawOne();

      const lastMonthSoldPromotions = parseInt(lastMonthResult?.count || '0');

      const monthlyChanges = Number(
        (currentSoldPromotions - lastMonthSoldPromotions).toFixed(2)
      );

      return {
        metric: currentSoldPromotions,
        monthlyChanges,
        changeType: 'real'
      };
    } catch (error) {
      console.error('Error calculating sold promotions:', error);
      return { metric: 0, monthlyChanges: 0, changeType: 'real' };
    }
  }

  private async calculateNetIncome(
    startDate: number,
    endDate: number
  ): Promise<any[]> {
    try {
      console.log(
        `[DEBUG] calculateNetIncome - startDate: ${startDate}, endDate: ${endDate}`
      );
      console.log(
        `[DEBUG] Date range: ${new Date(startDate * 1000).toISOString()} to ${new Date(endDate * 1000).toISOString()}`
      );

      // First, let's check how many orders exist in this date range
      const totalOrdersInRange = await this.orderRepo
        .createQueryBuilder('order')
        .where('order.created_at BETWEEN :startDate AND :endDate', {
          startDate,
          endDate
        })
        .getCount();

      console.log(`[DEBUG] Total orders in date range: ${totalOrdersInRange}`);

      // Group orders by date and calculate daily net income (revenue - costs)
      // Include ALL orders, not just DELIVERED ones, to show daily fluctuations
      const result = await this.orderRepo
        .createQueryBuilder('order')
        .select([
          "TO_CHAR(TO_TIMESTAMP(order.created_at), 'YYYY-MM-DD') as date",
          'SUM(order.total_amount - order.delivery_fee - order.service_fee) as total_amount',
          'COUNT(*) as order_count'
        ])
        .where('order.created_at BETWEEN :startDate AND :endDate', {
          startDate,
          endDate
        })
        .groupBy("TO_CHAR(TO_TIMESTAMP(order.created_at), 'YYYY-MM-DD')")
        .orderBy("TO_CHAR(TO_TIMESTAMP(order.created_at), 'YYYY-MM-DD')")
        .limit(90) // Limit to 90 days for performance
        .getRawMany();

      console.log(`[DEBUG] Net income result:`, result);

      return result.map(item => ({
        date: item.date,
        total_amount: parseFloat(item.total_amount) || 0,
        order_count: parseInt(item.order_count) || 0
      }));
    } catch (error) {
      console.error('Error calculating net income:', error);
      return [];
    }
  }

  private async calculateGrossIncome(
    startDate: number,
    endDate: number
  ): Promise<any[]> {
    try {
      console.log(
        `[DEBUG] calculateGrossIncome - startDate: ${startDate}, endDate: ${endDate}`
      );

      // Group orders by date and calculate daily gross income (total revenue)
      // Include ALL orders, not just DELIVERED ones, to show daily fluctuations
      const result = await this.orderRepo
        .createQueryBuilder('order')
        .select([
          "TO_CHAR(TO_TIMESTAMP(order.created_at), 'YYYY-MM-DD') as date",
          'SUM(order.total_amount) as total_amount',
          'COUNT(*) as order_count'
        ])
        .where('order.created_at BETWEEN :startDate AND :endDate', {
          startDate,
          endDate
        })
        .groupBy("TO_CHAR(TO_TIMESTAMP(order.created_at), 'YYYY-MM-DD')")
        .orderBy("TO_CHAR(TO_TIMESTAMP(order.created_at), 'YYYY-MM-DD')")
        .limit(90) // Limit to 90 days for performance
        .getRawMany();

      console.log(`[DEBUG] Gross income result:`, result);

      return result.map(item => ({
        date: item.date,
        total_amount: parseFloat(item.total_amount) || 0,
        order_count: parseInt(item.order_count) || 0
      }));
    } catch (error) {
      console.error('Error calculating gross income:', error);
      return [];
    }
  }

  private async calculateOrderStats(
    startDate: number,
    endDate: number
  ): Promise<any[]> {
    try {
      // Calculate the date range duration in days
      const rangeDurationDays = Math.ceil(
        (endDate - startDate) / (24 * 60 * 60)
      );
      const isLongRange = rangeDurationDays > 1;

      console.log(
        `[DEBUG] Date range duration: ${rangeDurationDays} days, isLongRange: ${isLongRange}`
      );

      let queryBuilder = this.orderRepo
        .createQueryBuilder('order')
        .select([
          "TO_CHAR(TO_TIMESTAMP(order.created_at), 'YYYY-MM-DD') as date",
          'order.status as status',
          'COUNT(*) as count'
        ])
        .where('order.created_at BETWEEN :startDate AND :endDate', {
          startDate,
          endDate
        });

      // Apply status filtering based on date range
      if (isLongRange) {
        // For long ranges (> 1 day): only show CANCELLED and DELIVERED
        queryBuilder = queryBuilder.andWhere('order.status IN (:...statuses)', {
          statuses: ['CANCELLED', 'DELIVERED']
        });
        console.log(
          `[DEBUG] Long range detected: filtering for CANCELLED and DELIVERED only`
        );
      } else {
        // For short ranges (≤ 1 day): show all statuses
        console.log(`[DEBUG] Short range detected: showing all order statuses`);
      }

      const allOrdersByDate = await queryBuilder
        .groupBy(
          "TO_CHAR(TO_TIMESTAMP(order.created_at), 'YYYY-MM-DD'), order.status"
        )
        .orderBy("TO_CHAR(TO_TIMESTAMP(order.created_at), 'YYYY-MM-DD')")
        .getRawMany();

      console.log(`[DEBUG] All orders by date and status:`, allOrdersByDate);

      // Group by date and aggregate statuses
      const dateMap = new Map();

      allOrdersByDate.forEach(item => {
        const date = item.date;
        if (!dateMap.has(date)) {
          const dayStats = {
            date,
            delivered: 0,
            cancelled: 0,
            total: 0
          };

          // Add detailed status counters only for short ranges
          if (!isLongRange) {
            Object.assign(dayStats, {
              pending: 0,
              preparing: 0,
              en_route: 0,
              dispatched: 0,
              ready_for_pickup: 0,
              restaurant_pickup: 0
            });
          }

          dateMap.set(date, dayStats);
        }

        const dayStats = dateMap.get(date);
        const count = parseInt(item.count);
        dayStats.total += count;

        // Map status to appropriate counter
        switch (item.status) {
          case 'DELIVERED':
            dayStats.delivered += count;
            break;
          case 'CANCELLED':
            dayStats.cancelled += count;
            break;
          // Only include detailed statuses for short ranges
          case 'PENDING':
            if (!isLongRange) dayStats.pending += count;
            break;
          case 'PREPARING':
          case 'RESTAURANT_ACCEPTED':
          case 'IN_PROGRESS':
            if (!isLongRange) dayStats.preparing += count;
            break;
          case 'EN_ROUTE':
          case 'OUT_FOR_DELIVERY':
            if (!isLongRange) dayStats.en_route += count;
            break;
          case 'DISPATCHED':
            if (!isLongRange) dayStats.dispatched += count;
            break;
          case 'READY_FOR_PICKUP':
            if (!isLongRange) dayStats.ready_for_pickup += count;
            break;
          case 'RESTAURANT_PICKUP':
            if (!isLongRange) dayStats.restaurant_pickup += count;
            break;
        }
      });

      const result = Array.from(dateMap.values()).sort((a, b) =>
        a.date.localeCompare(b.date)
      );
      console.log(`[DEBUG] Final order stats result:`, result);

      return result;
    } catch (error) {
      console.error('Error calculating order stats:', error);
      return [];
    }
  }

  private async calculateUserGrowthRate(
    startDate: number,
    endDate: number
  ): Promise<any[]> {
    try {
      // Calculate cumulative user growth for each day (total users up to that date)
      // First get daily counts, then calculate cumulative totals
      const driverDaily = await this.driverRepo
        .createQueryBuilder('driver')
        .select([
          "TO_CHAR(TO_TIMESTAMP(driver.created_at), 'YYYY-MM-DD') as date",
          'COUNT(*) as daily_count'
        ])
        .where('driver.created_at BETWEEN :startDate AND :endDate', {
          startDate,
          endDate
        })
        .groupBy("TO_CHAR(TO_TIMESTAMP(driver.created_at), 'YYYY-MM-DD')")
        .orderBy("TO_CHAR(TO_TIMESTAMP(driver.created_at), 'YYYY-MM-DD')")
        .getRawMany();

      const restaurantDaily = await this.restaurantRepo
        .createQueryBuilder('restaurant')
        .select([
          "TO_CHAR(TO_TIMESTAMP(restaurant.created_at), 'YYYY-MM-DD') as date",
          'COUNT(*) as daily_count'
        ])
        .where('restaurant.created_at BETWEEN :startDate AND :endDate', {
          startDate,
          endDate
        })
        .groupBy("TO_CHAR(TO_TIMESTAMP(restaurant.created_at), 'YYYY-MM-DD')")
        .orderBy("TO_CHAR(TO_TIMESTAMP(restaurant.created_at), 'YYYY-MM-DD')")
        .getRawMany();

      const customerDaily = await this.customerRepo
        .createQueryBuilder('customer')
        .select([
          "TO_CHAR(TO_TIMESTAMP(customer.created_at), 'YYYY-MM-DD') as date",
          'COUNT(*) as daily_count'
        ])
        .where('customer.created_at BETWEEN :startDate AND :endDate', {
          startDate,
          endDate
        })
        .groupBy("TO_CHAR(TO_TIMESTAMP(customer.created_at), 'YYYY-MM-DD')")
        .orderBy("TO_CHAR(TO_TIMESTAMP(customer.created_at), 'YYYY-MM-DD')")
        .getRawMany();

      const customerCareDaily = await this.customerCareRepo
        .createQueryBuilder('customer_care')
        .select([
          "TO_CHAR(TO_TIMESTAMP(customer_care.created_at), 'YYYY-MM-DD') as date",
          'COUNT(*) as daily_count'
        ])
        .where('customer_care.created_at BETWEEN :startDate AND :endDate', {
          startDate,
          endDate
        })
        .groupBy(
          "TO_CHAR(TO_TIMESTAMP(customer_care.created_at), 'YYYY-MM-DD')"
        )
        .orderBy(
          "TO_CHAR(TO_TIMESTAMP(customer_care.created_at), 'YYYY-MM-DD')"
        )
        .getRawMany();

      // Get all unique dates and sort them
      const dateSet = new Set([
        ...driverDaily.map(d => d.date),
        ...restaurantDaily.map(r => r.date),
        ...customerDaily.map(c => c.date),
        ...customerCareDaily.map(c => c.date)
      ]);

      const sortedDates = Array.from(dateSet).sort();

      // Calculate cumulative totals
      let cumulativeDrivers = 0;
      let cumulativeRestaurants = 0;
      let cumulativeCustomers = 0;
      let cumulativeCustomerCare = 0;

      return sortedDates.map(date => {
        // Add daily counts to cumulative totals
        const driverCount = parseInt(
          driverDaily.find(d => d.date === date)?.daily_count || 0
        );
        const restaurantCount = parseInt(
          restaurantDaily.find(r => r.date === date)?.daily_count || 0
        );
        const customerCount = parseInt(
          customerDaily.find(c => c.date === date)?.daily_count || 0
        );
        const customerCareCount = parseInt(
          customerCareDaily.find(c => c.date === date)?.daily_count || 0
        );

        cumulativeDrivers += driverCount;
        cumulativeRestaurants += restaurantCount;
        cumulativeCustomers += customerCount;
        cumulativeCustomerCare += customerCareCount;

        return {
          date,
          driver: cumulativeDrivers,
          restaurant: cumulativeRestaurants,
          customer: cumulativeCustomers,
          customer_care: cumulativeCustomerCare
        };
      });
    } catch (error) {
      console.error('Error calculating user growth rate:', error);
      return [];
    }
  }

  private async calculateGrossFromPromotion(
    startDate: number,
    endDate: number
  ): Promise<number> {
    try {
      // Calculate gross revenue from promotions applied by restaurants created in this period
      // Sum the promotion_cost_price for each promotion-restaurant relationship
      const result = await this.dataSource
        .createQueryBuilder()
        .select('SUM(p.promotion_cost_price)', 'total')
        .from('restaurant_promotions', 'rp')
        .innerJoin('restaurants', 'r', 'r.id = rp.restaurant_id')
        .innerJoin('promotions', 'p', 'p.id = rp.promotion_id')
        .where('r.created_at BETWEEN :startDate AND :endDate', {
          startDate,
          endDate
        })
        .getRawOne();

      return parseFloat(result?.total || '0');
    } catch (error) {
      console.error('Error calculating gross from promotions:', error);
      return 0;
    }
  }

  private async calculateAvgCustomerSatisfaction(
    startDate: number,
    endDate: number
  ): Promise<number> {
    try {
      const result = await this.ratingsReviewRepo
        .createQueryBuilder('review')
        .select(
          'AVG((review.food_rating + review.delivery_rating) / 2)',
          'average'
        )
        .where('review.created_at BETWEEN :startDate AND :endDate', {
          startDate,
          endDate
        })
        .getRawOne();

      return parseFloat(result?.average || '0');
    } catch (error) {
      console.error('Error calculating average customer satisfaction:', error);
      return 0;
    }
  }

  private async calculateAvgDeliveryTime(
    startDate: number,
    endDate: number
  ): Promise<number> {
    try {
      const result = await this.orderRepo
        .createQueryBuilder('order')
        .select('AVG(order.delivery_time)', 'average')
        .where('order.status = :status', { status: OrderStatus.DELIVERED })
        .andWhere('order.created_at BETWEEN :startDate AND :endDate', {
          startDate,
          endDate
        })
        .andWhere('order.delivery_time IS NOT NULL')
        .getRawOne();

      const avgTime = parseFloat(result?.average || '0');
      // Ensure the result fits in PostgreSQL integer range
      return Math.min(Math.max(Math.round(avgTime), 0), 2147483647);
    } catch (error) {
      console.error('Error calculating average delivery time:', error);
      return 0;
    }
  }

  private async calculateOrderCancellationRate(
    startDate: number,
    endDate: number
  ): Promise<number> {
    try {
      const [totalOrders, cancelledOrders] = await Promise.all([
        this.orderRepo.count({
          where: {
            created_at: Between(startDate, endDate)
          }
        }),
        this.orderRepo.count({
          where: {
            created_at: Between(startDate, endDate),
            status: OrderStatus.CANCELLED
          }
        })
      ]);

      return totalOrders > 0
        ? parseFloat((cancelledOrders / totalOrders).toFixed(2))
        : 0;
    } catch (error) {
      console.error('Error calculating order cancellation rate:', error);
      return 0;
    }
  }

  private async calculateOrderVolume(
    startDate: number,
    endDate: number
  ): Promise<number> {
    try {
      return await this.orderRepo.count({
        where: {
          created_at: Between(startDate, endDate)
        }
      });
    } catch (error) {
      console.error('Error calculating order volume:', error);
      return 0;
    }
  }

  private async calculateChurnRate(
    startDate: number,
    endDate: number
  ): Promise<number> {
    try {
      console.log(
        `Calculating churn rate for period ${startDate} - ${endDate}`
      );

      // Count total users across all types
      const [
        totalCustomers,
        totalDrivers,
        totalRestaurants,
        totalCustomerCare
      ] = await Promise.all([
        this.customerRepo.count(),
        this.driverRepo.count(),
        this.restaurantRepo.count(),
        this.customerCareRepo.count()
      ]);

      const totalUsers =
        totalCustomers + totalDrivers + totalRestaurants + totalCustomerCare;

      if (totalUsers === 0) {
        return 0;
      }

      // Count users who logged in during the period (active users)
      const [
        activeCustomers,
        activeDrivers,
        activeRestaurants,
        activeCustomerCare
      ] = await Promise.all([
        this.customerRepo
          .createQueryBuilder('customer')
          .where('customer.last_login BETWEEN :startDate AND :endDate', {
            startDate,
            endDate
          })
          .getCount(),
        this.driverRepo
          .createQueryBuilder('driver')
          .where('driver.last_login BETWEEN :startDate AND :endDate', {
            startDate,
            endDate
          })
          .getCount(),
        this.restaurantRepo
          .createQueryBuilder('restaurant')
          .where('restaurant.last_login BETWEEN :startDate AND :endDate', {
            startDate,
            endDate
          })
          .getCount(),
        this.customerCareRepo
          .createQueryBuilder('customer_care')
          .where('customer_care.last_login BETWEEN :startDate AND :endDate', {
            startDate,
            endDate
          })
          .getCount()
      ]);

      const activeUsers =
        activeCustomers +
        activeDrivers +
        activeRestaurants +
        activeCustomerCare;

      // Churn rate = (total users - active users) / total users
      const churnedUsers = totalUsers - activeUsers;
      const churnRate = churnedUsers / totalUsers;

      console.log(`Churn rate calculation:`, {
        totalUsers,
        activeUsers,
        churnedUsers,
        churnRate: churnRate.toFixed(4)
      });

      return Number(churnRate.toFixed(4));
    } catch (error) {
      console.error('Error calculating churn rate:', error);
      return 0;
    }
  }
}
