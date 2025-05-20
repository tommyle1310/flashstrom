"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestaurantStatsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const restaurant_stats_record_entity_1 = require("./entities/restaurant_stats_record.entity");
const order_entity_1 = require("../orders/entities/order.entity");
const ratings_review_entity_1 = require("../ratings_reviews/entities/ratings_review.entity");
const createResponse_1 = require("../utils/createResponse");
const restaurant_entity_1 = require("../restaurants/entities/restaurant.entity");
const Redis = __importStar(require("redis"));
let RestaurantStatsService = class RestaurantStatsService {
    constructor(restaurantStatsRepo, orderRepo, ratingsReviewRepo, restaurantRepo) {
        this.restaurantStatsRepo = restaurantStatsRepo;
        this.orderRepo = orderRepo;
        this.ratingsReviewRepo = ratingsReviewRepo;
        this.restaurantRepo = restaurantRepo;
        this.redisClient = Redis.createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379'
        });
        this.redisClient.connect().catch(err => {
            console.error('Redis connection error:', err);
        });
    }
    formatNumber(value) {
        return Number(value.toFixed(2));
    }
    async getCachedStats(key) {
        try {
            const cached = await this.redisClient.get(key);
            if (cached) {
                console.log(`[CACHE HIT] Using cached stats for key: ${key}`);
                return JSON.parse(cached);
            }
            return null;
        }
        catch (error) {
            console.error(`Error getting cached stats: ${error}`);
            return null;
        }
    }
    async setCachedStats(key, data, ttlSeconds = 3600) {
        try {
            await this.redisClient.setEx(key, ttlSeconds, JSON.stringify(data));
            console.log(`[CACHE STORE] Stored stats in cache with key: ${key}`);
        }
        catch (error) {
            console.error(`Error storing cached stats: ${error}`);
        }
    }
    async updateStatsForRestaurant(restaurantId, periodType) {
        const now = Math.floor(Date.now() / 1000);
        let periodStart, periodEnd;
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
        console.log(`[DEBUG] Current time: ${now}, periodStart: ${periodStart}, periodEnd: ${periodEnd}`);
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
                status: order_entity_1.OrderStatus.DELIVERED,
                updated_at: (0, typeorm_2.Between)(periodStart, periodEnd)
            }
        });
        console.log(`[DEBUG] Found ${completedOrders.length} completed orders for restaurant ${restaurantId}:`, completedOrders.map(o => ({
            id: o.id,
            status: o.status,
            total_amount: o.total_amount,
            delivery_fee: o.delivery_fee,
            service_fee: o.service_fee,
            driver_tips: o.driver_tips
        })));
        stats.total_orders = completedOrders.length;
        stats.total_revenue = completedOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
        stats.total_delivery_fee = completedOrders.reduce((sum, order) => sum + Number(order.delivery_fee || 0), 0);
        stats.total_commission = completedOrders.reduce((sum, order) => sum + Number(order.service_fee || 0), 0);
        stats.total_tips = completedOrders.reduce((sum, order) => sum + Number(order.driver_tips || 0), 0);
        const reviews = await this.ratingsReviewRepo.find({
            where: {
                rr_recipient_restaurant_id: restaurantId,
                created_at: (0, typeorm_2.Between)(periodStart, periodEnd)
            }
        });
        console.log(`[DEBUG] Found ${reviews.length} reviews for restaurant ${restaurantId}:`, reviews.map(r => ({
            id: r.id,
            food_rating: r.food_rating,
            delivery_rating: r.delivery_rating,
            created_at: r.created_at
        })));
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
        const allOrders = await this.orderRepo.find({
            where: {
                restaurant_id: restaurantId,
                updated_at: (0, typeorm_2.Between)(periodStart, periodEnd)
            }
        });
        stats.order_status_summary = {
            completed: allOrders.filter(o => o.status === order_entity_1.OrderStatus.DELIVERED)
                .length,
            cancelled: allOrders.filter(o => o.status === order_entity_1.OrderStatus.CANCELLED)
                .length,
            rejected: allOrders.filter(o => o.status === order_entity_1.OrderStatus.CANCELLED).length
        };
        await this.restaurantStatsRepo.save(stats);
        console.log('[DEBUG] Final stats:', JSON.stringify(stats, null, 2));
    }
    async updateStatsForDateRange(restaurantId, startDate, endDate, periodType = 'daily') {
        const start = new Date(startDate * 1000);
        const end = new Date(endDate * 1000);
        const currentDate = new Date(start);
        while (currentDate <= end) {
            const periodStart = Math.floor(currentDate.setHours(0, 0, 0, 0) / 1000);
            const periodEnd = Math.floor(currentDate.setHours(23, 59, 59, 999) / 1000);
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
            const orders = await this.orderRepo.find({
                where: {
                    restaurant_id: restaurantId,
                    created_at: (0, typeorm_2.Between)(periodStart, periodEnd)
                }
            });
            stats.total_orders = orders.length;
            stats.total_revenue = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
            stats.total_delivery_fee = orders.reduce((sum, order) => sum + (order.delivery_fee || 0), 0);
            stats.total_commission = orders.reduce((sum, order) => sum + (order.service_fee || 0), 0);
            stats.total_tips = orders.reduce((sum, order) => sum + (order.driver_tips || 0), 0);
            stats.order_status_summary = {
                completed: orders.filter(o => o.status === order_entity_1.OrderStatus.DELIVERED)
                    .length,
                cancelled: orders.filter(o => o.status === order_entity_1.OrderStatus.CANCELLED)
                    .length,
                rejected: orders.filter(o => o.status === order_entity_1.OrderStatus.RETURNED).length
            };
            const reviews = await this.ratingsReviewRepo.find({
                where: {
                    rr_recipient_restaurant_id: restaurantId,
                    created_at: (0, typeorm_2.Between)(periodStart, periodEnd)
                }
            });
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
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }
    async getStatsForRestaurant(restaurantId, startDate, endDate, aggregate = false, forceRefresh = false) {
        try {
            const start = typeof startDate === 'string'
                ? Math.floor(new Date(startDate).getTime() / 1000)
                : startDate;
            const end = typeof endDate === 'string'
                ? Math.floor(new Date(endDate).getTime() / 1000)
                : endDate;
            console.log('[DEBUG] Date conversion:', {
                originalStart: startDate,
                originalEnd: endDate,
                convertedStart: start,
                convertedEnd: end
            });
            const cacheKey = `restaurant_stats:${restaurantId}:${start}:${end}:${aggregate}`;
            if (!forceRefresh) {
                const cachedStats = await this.getCachedStats(cacheKey);
                if (cachedStats) {
                    return (0, createResponse_1.createResponse)('OK', cachedStats, 'Restaurant stats retrieved successfully (cached)');
                }
            }
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout after 10 seconds')), 10000));
            const statsPromise = this.generateRestaurantStats(restaurantId, start, end, aggregate, forceRefresh);
            const result = await Promise.race([statsPromise, timeoutPromise]);
            if (result.data) {
                await this.setCachedStats(cacheKey, result.data);
            }
            return result;
        }
        catch (error) {
            if (error.message === 'Query timeout after 10 seconds') {
                console.error('Timeout generating restaurant stats');
                return (0, createResponse_1.createResponse)('ServerError', null, 'Request took too long, please try again');
            }
            console.error('Error fetching restaurant stats:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error fetching restaurant stats');
        }
    }
    async generateRestaurantStats(restaurantId, start, end, aggregate = false, forceRefresh = false) {
        const completedOrders = await this.orderRepo
            .createQueryBuilder('order')
            .where('order.restaurant_id = :restaurantId', { restaurantId })
            .andWhere('order.status = :status', { status: order_entity_1.OrderStatus.DELIVERED })
            .andWhere('order.updated_at >= :start AND order.updated_at <= :end', {
            start,
            end
        })
            .limit(1000)
            .getMany();
        console.log(`[DEBUG] Found ${completedOrders.length} completed orders in date range`);
        const stats = forceRefresh
            ? []
            : await this.restaurantStatsRepo.find({
                where: {
                    restaurant_id: restaurantId,
                    period_start: (0, typeorm_2.Between)(start, end)
                },
                order: { period_start: 'ASC' }
            });
        if (forceRefresh) {
            console.log('[DEBUG] Force refresh enabled, deleting existing stats');
            await this.restaurantStatsRepo.delete({
                restaurant_id: restaurantId,
                period_start: (0, typeorm_2.Between)(start, end)
            });
        }
        if (completedOrders.length > 0 && (stats.length === 0 || forceRefresh)) {
            console.log('[DEBUG] Creating new stats record for period');
            const restaurant = await this.restaurantRepo.findOne({
                where: { id: restaurantId }
            });
            let totalOnlineHours = 0;
            if (restaurant) {
                const operatingHours = restaurant.opening_hours || {};
                const dayOfWeek = new Date(start * 1000).getDay().toString();
                const todayHours = operatingHours[dayOfWeek] || {
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
            const reviews = await this.ratingsReviewRepo
                .createQueryBuilder('review')
                .where('review.rr_recipient_restaurant_id = :restaurantId', {
                restaurantId
            })
                .andWhere('review.created_at >= :start AND review.created_at <= :end', {
                start,
                end
            })
                .limit(1000)
                .getMany();
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
            const ratingSummary = {
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
            const [completed, cancelled] = await Promise.all([
                this.orderRepo.count({
                    where: {
                        restaurant_id: restaurantId,
                        status: order_entity_1.OrderStatus.DELIVERED,
                        updated_at: (0, typeorm_2.Between)(start, end)
                    }
                }),
                this.orderRepo.count({
                    where: {
                        restaurant_id: restaurantId,
                        status: order_entity_1.OrderStatus.CANCELLED,
                        updated_at: (0, typeorm_2.Between)(start, end)
                    }
                })
            ]);
            const orderStatusSummary = {
                completed,
                cancelled,
                rejected: cancelled
            };
            const itemMap = new Map();
            completedOrders.forEach(order => {
                if (order.order_items) {
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
                }
            });
            const popularItems = Array.from(itemMap.values())
                .sort((a, b) => b.quantity - a.quantity)
                .slice(0, 10);
            const newStats = this.restaurantStatsRepo.create({
                restaurant_id: restaurantId,
                period_type: 'daily',
                period_start: start,
                period_end: end,
                total_orders: completedOrders.length,
                total_online_hours: totalOnlineHours,
                total_revenue: completedOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
                total_delivery_fee: completedOrders.reduce((sum, order) => sum + Number(order.delivery_fee || 0), 0),
                total_commission: completedOrders.reduce((sum, order) => sum + Number(order.service_fee || 0), 0),
                total_tips: completedOrders.reduce((sum, order) => sum + Number(order.driver_tips || 0), 0),
                rating_summary: ratingSummary,
                order_status_summary: orderStatusSummary,
                popular_items: popularItems
            });
            const savedStats = await this.restaurantStatsRepo.save(newStats);
            console.log('[DEBUG] Created new stats record with ID:', savedStats.id);
            return (0, createResponse_1.createResponse)('OK', [savedStats], 'Restaurant stats created and retrieved successfully');
        }
        const updatedStats = await this.restaurantStatsRepo.find({
            where: {
                restaurant_id: restaurantId,
                period_start: (0, typeorm_2.Between)(start, end)
            },
            order: { period_start: 'ASC' }
        });
        if (aggregate) {
            const aggregated = {
                restaurant_id: restaurantId,
                period_start: start,
                period_end: end,
                total_orders: updatedStats.reduce((sum, s) => sum + s.total_orders, 0),
                total_revenue: updatedStats.reduce((sum, s) => sum + s.total_revenue, 0),
                total_delivery_fee: updatedStats.reduce((sum, s) => sum + s.total_delivery_fee, 0),
                total_commission: updatedStats.reduce((sum, s) => sum + s.total_commission, 0),
                total_tips: updatedStats.reduce((sum, s) => sum + s.total_tips, 0),
                total_online_hours: updatedStats.reduce((sum, s) => sum + s.total_online_hours, 0),
                rating_summary: this.aggregateRatings(updatedStats)
            };
            return (0, createResponse_1.createResponse)('OK', aggregated, 'Restaurant stats retrieved successfully');
        }
        return (0, createResponse_1.createResponse)('OK', updatedStats, 'Restaurant stats retrieved successfully');
    }
    aggregateRatings(stats) {
        return {
            average_food_rating: stats.some(s => s.rating_summary?.review_count > 0)
                ? stats.reduce((sum, s) => sum +
                    (s.rating_summary?.average_food_rating || 0) *
                        (s.rating_summary?.review_count || 0), 0) /
                    stats.reduce((sum, s) => sum + (s.rating_summary?.review_count || 0), 0)
                : 0,
            average_service_rating: stats.some(s => s.rating_summary?.review_count > 0)
                ? stats.reduce((sum, s) => sum +
                    (s.rating_summary?.average_service_rating || 0) *
                        (s.rating_summary?.review_count || 0), 0) /
                    stats.reduce((sum, s) => sum + (s.rating_summary?.review_count || 0), 0)
                : 0,
            average_overall_rating: stats.some(s => s.rating_summary?.review_count > 0)
                ? stats.reduce((sum, s) => sum +
                    (s.rating_summary?.average_overall_rating || 0) *
                        (s.rating_summary?.review_count || 0), 0) /
                    stats.reduce((sum, s) => sum + (s.rating_summary?.review_count || 0), 0)
                : 0,
            total_ratings: stats.reduce((sum, s) => sum + (s.rating_summary?.total_ratings || 0), 0),
            review_count: stats.reduce((sum, s) => sum + (s.rating_summary?.review_count || 0), 0),
            rating_distribution: stats.reduce((dist, s) => {
                if (s.rating_summary?.rating_distribution) {
                    Object.entries(s.rating_summary.rating_distribution).forEach(([rating, count]) => {
                        dist[rating] = (dist[rating] || 0) + (count || 0);
                    });
                }
                return dist;
            }, { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 })
        };
    }
};
exports.RestaurantStatsService = RestaurantStatsService;
exports.RestaurantStatsService = RestaurantStatsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(restaurant_stats_record_entity_1.RestaurantStatsRecord)),
    __param(1, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __param(2, (0, typeorm_1.InjectRepository)(ratings_review_entity_1.RatingsReview)),
    __param(3, (0, typeorm_1.InjectRepository)(restaurant_entity_1.Restaurant)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], RestaurantStatsService);
//# sourceMappingURL=restaurant_stats_records.service.js.map