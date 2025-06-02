import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
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
        today.setHours(today.getHours() + 7); // Múi giờ +07
        periodStart = Math.floor(today.setHours(0, 0, 0, 0) / 1000);
        periodEnd = Math.floor(today.setHours(23, 59, 59, 999) / 1000);
        break;
      case 'weekly':
        const weekStart = new Date(now * 1000);
        weekStart.setHours(weekStart.getHours() + 7);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        periodStart = Math.floor(weekStart.setHours(0, 0, 0, 0) / 1000);
        periodEnd = periodStart + 7 * 24 * 3600 - 1;
        break;
      case 'monthly':
        const monthStart = new Date(now * 1000);
        monthStart.setHours(monthStart.getHours() + 7);
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

    const restaurant = await this.restaurantRepo.findOne({
      where: { id: restaurantId }
    });

    if (restaurant) {
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

    const completedOrders = await this.orderRepo.find({
      where: {
        restaurant_id: restaurantId,
        status: OrderStatus.DELIVERED,
        updated_at: Between(periodStart - 7 * 3600, periodEnd - 7 * 3600)
      }
    });

    console.log(
      `[DEBUG] Found ${completedOrders.length} completed orders for restaurant ${restaurantId}:`,
      completedOrders.map(o => ({
        id: o.id,
        status: o.status,
        updated_at: o.updated_at,
        total_amount: o.total_amount
      }))
    );

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

    const ratingDistribution = {
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0
    };

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

    stats.rating_summary = {
      average_food_rating: reviews.length
        ? this.formatNumber(totalFoodRating / reviews.length)
        : 0,
      average_service_rating: reviews.length
        ? this.formatNumber(totalServiceRating / reviews.length)
        : 0,
      average_overall_rating: reviews.length
        ? this.formatNumber(totalOverallRating / reviews.length)
        : 0,
      total_ratings: reviews.length,
      review_count: reviews.length,
      rating_distribution: ratingDistribution
    };

    const allOrders = await this.orderRepo.find({
      where: {
        restaurant_id: restaurantId,
        updated_at: Between(periodStart - 7 * 3600, periodEnd - 7 * 3600)
      }
    });

    stats.order_status_summary = {
      completed: allOrders.filter(o => o.status === OrderStatus.DELIVERED)
        .length,
      cancelled: allOrders.filter(o => o.status === OrderStatus.CANCELLED)
        .length,
      rejected: allOrders.filter(o => o.status === OrderStatus.RETURNED).length
    };

    const itemMap = new Map();
    completedOrders.forEach(order => {
      order.order_items?.forEach(item => {
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
    console.log('[DEBUG] Final stats:', JSON.stringify(stats, null, 2));
  }

  async updateStatsForDateRange(
    restaurantId: string,
    startDate: number,
    endDate: number,
    periodType: string = 'daily'
  ) {
    // Xóa tất cả bản ghi thống kê cũ
    const deleteResult = await this.restaurantStatsRepo.delete({
      restaurant_id: restaurantId,
      period_type: periodType,
      period_start: Between(startDate - 7 * 3600, endDate) // Mở rộng để đảm bảo xóa hết
    });
    console.log(`[DEBUG] Deleted ${deleteResult.affected} stats records`);

    // Lấy tất cả orders trong khoảng thời gian
    const orders = await this.orderRepo.find({
      where: {
        restaurant_id: restaurantId,
        status: OrderStatus.DELIVERED,
        updated_at: Between(startDate - 7 * 3600, endDate - 7 * 3600)
      }
    });

    console.log(
      `[DEBUG] Found ${orders.length} orders in range:`,
      orders.map(o => ({
        id: o.id,
        updated_at: o.updated_at,
        total_amount: o.total_amount,
        date_plus07: new Date((o.updated_at + 7 * 3600) * 1000).toISOString()
      }))
    );

    // Nhóm orders theo ngày (+07)
    const statsByDate = new Map<number, RestaurantStatsRecord>();

    orders.forEach(order => {
      const date = new Date((order.updated_at + 7 * 3600) * 1000);
      const periodStart = Math.floor(date.setHours(0, 0, 0, 0) / 1000);
      const periodEnd = Math.floor(date.setHours(23, 59, 59, 999) / 1000);

      if (!statsByDate.has(periodStart)) {
        statsByDate.set(
          periodStart,
          this.restaurantStatsRepo.create({
            restaurant_id: restaurantId,
            period_type: periodType,
            period_start: periodStart,
            period_end: periodEnd,
            total_orders: 0,
            total_revenue: 0,
            total_delivery_fee: 0,
            total_commission: 0,
            total_tips: 0,
            rating_summary: {
              average_food_rating: 0,
              average_service_rating: 0,
              average_overall_rating: 0,
              total_ratings: 0,
              review_count: 0,
              rating_distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
            },
            order_status_summary: { completed: 0, cancelled: 0, rejected: 0 },
            popular_items: []
          })
        );
      }

      const stats = statsByDate.get(periodStart)!;
      stats.total_orders += 1;
      stats.total_revenue += Number(order.total_amount || 0);
      stats.total_delivery_fee += Number(order.delivery_fee || 0);
      stats.total_commission += Number(order.service_fee || 0);
      stats.total_tips += Number(order.driver_tips || 0);
      stats.order_status_summary.completed += 1;

      const itemMap = new Map();
      order.order_items?.forEach(item => {
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

      stats.popular_items = [
        ...stats.popular_items,
        ...Array.from(itemMap.values())
      ]
        .reduce((acc, item) => {
          const existing = acc.find(i => i.item_id === item.item_id);
          if (existing) {
            existing.quantity += item.quantity;
            existing.revenue += item.revenue;
          } else {
            acc.push(item);
          }
          return acc;
        }, [])
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);
    });

    // Lấy reviews và tính toán rating_summary
    for (const [periodStart, stats] of statsByDate) {
      const periodEnd = stats.period_end;
      const reviews = await this.ratingsReviewRepo.find({
        where: {
          rr_recipient_restaurant_id: restaurantId,
          created_at: Between(periodStart - 7 * 3600, periodEnd - 7 * 3600)
        }
      });

      console.log(
        `[DEBUG] Found ${reviews.length} reviews for period ${periodStart} - ${periodEnd}`
      );

      const ratingDistribution = {
        '1': 0,
        '2': 0,
        '3': 0,
        '4': 0,
        '5': 0
      };

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

      stats.rating_summary = {
        average_food_rating: reviews.length
          ? this.formatNumber(totalFoodRating / reviews.length)
          : 0,
        average_service_rating: reviews.length
          ? this.formatNumber(totalServiceRating / reviews.length)
          : 0,
        average_overall_rating: reviews.length
          ? this.formatNumber(totalOverallRating / reviews.length)
          : 0,
        total_ratings: reviews.length,
        review_count: reviews.length,
        rating_distribution: ratingDistribution
      };

      await this.restaurantStatsRepo.save(stats);
      console.log(
        `[DEBUG] Saved stats for period ${periodStart}:`,
        JSON.stringify(stats, null, 2)
      );
    }
  }

  async getStatsForRestaurant(
    restaurantId: string,
    startDate: number | string,
    endDate: number | string,
    aggregate: boolean = false,
    forceRefresh: boolean = false
  ): Promise<ApiResponse<any>> {
    try {
      // Convert dates to epoch seconds, assuming input is in +07:00
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

      console.log('[DEBUG] Date conversion:', {
        originalStart: startDate,
        originalEnd: endDate,
        convertedStart: start,
        convertedEnd: end,
        startISO: new Date(start * 1000).toISOString(),
        endISO: new Date(end * 1000).toISOString()
      });

      // Update stats if forceRefresh or regular update
      if (forceRefresh) {
        console.log('[DEBUG] Forcing stats refresh for range:', { start, end });
        await this.updateStatsForDateRange(restaurantId, start, end, 'daily');
      } else {
        console.log('[DEBUG] Updating stats for restaurant:', { restaurantId });
        await this.updateStatsForRestaurant(restaurantId, 'daily');
      }

      // Fetch stats
      const stats = await this.restaurantStatsRepo.find({
        where: {
          restaurant_id: restaurantId,
          period_start: LessThanOrEqual(end),
          period_end: MoreThanOrEqual(start)
        },
        order: { period_start: 'ASC' }
      });

      console.log('[DEBUG] Found stats:', {
        count: stats.length,
        periods: stats.map(s => ({
          period_start: s.period_start,
          period_end: s.period_end,
          startISO: new Date(s.period_start * 1000).toISOString(),
          endISO: new Date(s.period_end * 1000).toISOString()
        }))
      });

      // Fetch completed orders without timezone offset
      const completedOrders = await this.orderRepo.find({
        where: {
          restaurant_id: restaurantId,
          status: OrderStatus.DELIVERED,
          updated_at: Between(start, end)
        }
      });

      console.log(
        `[DEBUG] Found ${completedOrders.length} completed orders in range`,
        completedOrders.map(o => ({
          id: o.id,
          status: o.status,
          updated_at: o.updated_at,
          total_amount: o.total_amount,
          updated_at_iso: new Date(o.updated_at * 1000).toISOString()
        }))
      );

      // Build valid period starts from orders (for validation)
      const validPeriodStarts = new Set<number>();
      completedOrders.forEach(order => {
        const date = new Date(order.updated_at * 1000);
        const periodStart = Math.floor(date.setHours(0, 0, 0, 0) / 1000);
        validPeriodStarts.add(periodStart);
      });

      console.log(
        '[DEBUG] Valid period starts from orders:',
        Array.from(validPeriodStarts)
      );

      // Only filter stats if orders exist; otherwise, keep all stats
      let filteredStats = stats;
      if (completedOrders.length > 0) {
        filteredStats = stats.filter(stat =>
          validPeriodStarts.has(stat.period_start)
        );
      }

      console.log('[DEBUG] Filtered stats:', {
        count: filteredStats.length,
        periods: filteredStats.map(s => ({
          period_start: s.period_start,
          startISO: new Date(s.period_start * 1000).toISOString()
        }))
      });

      // Create new stats for periods with orders but no stats
      if (completedOrders.length > 0) {
        const ordersByDate = new Map<number, Order[]>();
        completedOrders.forEach(order => {
          const date = new Date(order.updated_at * 1000);
          const periodStart = Math.floor(date.setHours(0, 0, 0, 0) / 1000);
          if (!ordersByDate.has(periodStart)) {
            ordersByDate.set(periodStart, []);
          }
          ordersByDate.get(periodStart)!.push(order);
        });

        for (const [periodStart, orders] of ordersByDate) {
          if (!filteredStats.some(s => s.period_start === periodStart)) {
            console.log('[DEBUG] Creating new stats for period:', {
              periodStart
            });
            const periodEnd = Math.floor(
              new Date(periodStart * 1000).setHours(23, 59, 59, 999) / 1000
            );
            const newStats = this.restaurantStatsRepo.create({
              restaurant_id: restaurantId,
              period_type: 'daily',
              period_start: periodStart,
              period_end: periodEnd,
              total_orders: orders.length,
              total_revenue: orders.reduce(
                (sum, order) => sum + Number(order.total_amount || 0),
                0
              ),
              total_delivery_fee: orders.reduce(
                (sum, order) => sum + Number(order.delivery_fee || 0),
                0
              ),
              total_commission: orders.reduce(
                (sum, order) => sum + Number(order.service_fee || 0),
                0
              ),
              total_tips: orders.reduce(
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
              },
              order_status_summary: {
                completed: orders.length,
                cancelled: 0,
                rejected: 0
              },
              popular_items: []
            });

            const itemMap = new Map();
            orders.forEach(order => {
              order.order_items?.forEach(item => {
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
            newStats.popular_items = Array.from(itemMap.values())
              .sort((a, b) => b.quantity - a.quantity)
              .slice(0, 10);

            await this.restaurantStatsRepo.save(newStats);
            filteredStats.push(newStats);
          }
        }
      }

      // Ensure popular_items is always an array
      filteredStats = filteredStats.map(stat => ({
        ...stat,
        popular_items: Array.isArray(stat.popular_items)
          ? stat.popular_items
          : []
      }));

      // Aggregate stats if requested
      if (aggregate) {
        const aggregated = {
          restaurant_id: restaurantId,
          period_start: start,
          period_end: end,
          total_orders: filteredStats.reduce(
            (sum, s) => sum + s.total_orders,
            0
          ),
          total_revenue: filteredStats.reduce(
            (sum, s) => sum + s.total_revenue,
            0
          ),
          total_delivery_fee: filteredStats.reduce(
            (sum, s) => sum + s.total_delivery_fee,
            0
          ),
          total_commission: filteredStats.reduce(
            (sum, s) => sum + s.total_commission,
            0
          ),
          total_tips: filteredStats.reduce((sum, s) => sum + s.total_tips, 0),
          total_online_hours: filteredStats.reduce(
            (sum, s) => sum + s.total_online_hours,
            0
          ),
          rating_summary: {
            average_food_rating: filteredStats.some(
              s => s.rating_summary?.review_count > 0
            )
              ? filteredStats.reduce(
                  (sum, s) =>
                    sum +
                    (s.rating_summary?.average_food_rating || 0) *
                      (s.rating_summary?.review_count || 0),
                  0
                ) /
                filteredStats.reduce(
                  (sum, s) => sum + (s.rating_summary?.review_count || 0),
                  0
                )
              : 0,
            average_service_rating: filteredStats.some(
              s => s.rating_summary?.review_count > 0
            )
              ? filteredStats.reduce(
                  (sum, s) =>
                    sum +
                    (s.rating_summary?.average_service_rating || 0) *
                      (s.rating_summary?.review_count || 0),
                  0
                ) /
                filteredStats.reduce(
                  (sum, s) => sum + (s.rating_summary?.review_count || 0),
                  0
                )
              : 0,
            average_overall_rating: filteredStats.some(
              s => s.rating_summary?.review_count > 0
            )
              ? filteredStats.reduce(
                  (sum, s) =>
                    sum +
                    (s.rating_summary?.average_overall_rating || 0) *
                      (s.rating_summary?.review_count || 0),
                  0
                ) /
                filteredStats.reduce(
                  (sum, s) => sum + (s.rating_summary?.review_count || 0),
                  0
                )
              : 0,
            total_ratings: filteredStats.reduce(
              (sum, s) => sum + (s.rating_summary?.total_ratings || 0),
              0
            ),
            review_count: filteredStats.reduce(
              (sum, s) => sum + (s.rating_summary?.review_count || 0),
              0
            ),
            rating_distribution: filteredStats.reduce(
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
          },
          popular_items: filteredStats
            .reduce((acc, s) => {
              if (Array.isArray(s.popular_items)) {
                s.popular_items.forEach(item => {
                  const existing = acc.find(i => i.item_id === item.item_id);
                  if (existing) {
                    existing.quantity += item.quantity;
                    existing.revenue += item.revenue;
                  } else {
                    acc.push({ ...item });
                  }
                });
              }
              return acc;
            }, [])
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10)
        };
        console.log('[DEBUG] Aggregated stats:', aggregated);
        return createResponse(
          'OK',
          aggregated,
          'Restaurant stats retrieved successfully'
        );
      }

      console.log('[DEBUG] Returning non-aggregated stats:', {
        count: filteredStats.length,
        periods: filteredStats.map(s => s.period_start)
      });
      return createResponse(
        'OK',
        filteredStats,
        'Restaurant stats retrieved successfully'
      );
    } catch (error: any) {
      console.error(
        '[ERROR] Error fetching restaurant stats:',
        error.message,
        error.stack
      );
      return createResponse(
        'ServerError',
        null,
        'Error fetching restaurant stats'
      );
    }
  }
}
