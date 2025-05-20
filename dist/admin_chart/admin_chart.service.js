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
exports.AdminChartService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const admin_chart_record_entity_1 = require("./entities/admin_chart_record.entity");
const order_entity_1 = require("../orders/entities/order.entity");
const user_entity_1 = require("../users/entities/user.entity");
const promotion_entity_1 = require("../promotions/entities/promotion.entity");
const customer_entity_1 = require("../customers/entities/customer.entity");
const driver_entity_1 = require("../drivers/entities/driver.entity");
const restaurant_entity_1 = require("../restaurants/entities/restaurant.entity");
const ratings_review_entity_1 = require("../ratings_reviews/entities/ratings_review.entity");
const createResponse_1 = require("../utils/createResponse");
const admin_chart_query_dto_1 = require("./dto/admin_chart_query.dto");
const Redis = __importStar(require("redis"));
let AdminChartService = class AdminChartService {
    constructor(adminChartRepo, orderRepo, userRepo, promotionRepo, customerRepo, driverRepo, restaurantRepo, ratingsReviewRepo) {
        this.adminChartRepo = adminChartRepo;
        this.orderRepo = orderRepo;
        this.userRepo = userRepo;
        this.promotionRepo = promotionRepo;
        this.customerRepo = customerRepo;
        this.driverRepo = driverRepo;
        this.restaurantRepo = restaurantRepo;
        this.ratingsReviewRepo = ratingsReviewRepo;
        this.redisClient = Redis.createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379'
        });
        this.redisClient.connect().catch(err => {
            console.error('Redis connection error:', err);
        });
    }
    async getCachedData(key) {
        try {
            const cached = await this.redisClient.get(key);
            if (cached) {
                console.log(`[CACHE HIT] Using cached admin chart data for key: ${key}`);
                return JSON.parse(cached);
            }
            return null;
        }
        catch (error) {
            console.error(`Error getting cached admin chart data: ${error}`);
            return null;
        }
    }
    async setCachedData(key, data, ttlSeconds = 3600) {
        try {
            await this.redisClient.setEx(key, ttlSeconds, JSON.stringify(data));
            console.log(`[CACHE STORE] Stored admin chart data in cache with key: ${key}`);
        }
        catch (error) {
            console.error(`Error storing cached admin chart data: ${error}`);
        }
    }
    async getChartData(startDate, endDate, periodType = admin_chart_query_dto_1.PeriodType.DAILY, forceRefresh = false) {
        try {
            const cacheKey = `admin_chart:${startDate}:${endDate}:${periodType}`;
            if (!forceRefresh) {
                const cachedData = await this.getCachedData(cacheKey);
                if (cachedData) {
                    return (0, createResponse_1.createResponse)('OK', cachedData, 'Admin chart data retrieved successfully (cached)');
                }
            }
            if (forceRefresh) {
                await this.generateChartData(startDate, endDate, periodType);
            }
            let chartData = await this.adminChartRepo.findOne({
                where: {
                    period_start: startDate,
                    period_end: endDate,
                    period_type: periodType
                }
            });
            if (!chartData) {
                await this.generateChartData(startDate, endDate, periodType);
                chartData = await this.adminChartRepo.findOne({
                    where: {
                        period_start: startDate,
                        period_end: endDate,
                        period_type: periodType
                    }
                });
                if (!chartData) {
                    return (0, createResponse_1.createResponse)('NotFound', null, 'No chart data available for the requested period');
                }
            }
            await this.setCachedData(cacheKey, chartData);
            return (0, createResponse_1.createResponse)('OK', chartData, 'Admin chart data retrieved successfully');
        }
        catch (error) {
            console.error('Error retrieving admin chart data:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error retrieving admin chart data');
        }
    }
    async generateChartData(startDate, endDate, periodType = admin_chart_query_dto_1.PeriodType.DAILY) {
        try {
            console.log(`Generating admin chart data for period ${startDate} - ${endDate}`);
            await this.adminChartRepo.delete({
                period_start: startDate,
                period_end: endDate,
                period_type: periodType
            });
            const [totalUsers, soldPromotions, netIncome, grossIncome, orderStats, userGrowthRate, grossFromPromotion, avgCustomerSatisfaction, avgDeliveryTime, orderCancellationRate, orderVolume, churnRate] = await Promise.all([
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
                average_customer_satisfaction: avgCustomerSatisfaction,
                average_delivery_time: avgDeliveryTime,
                order_cancellation_rate: orderCancellationRate,
                order_volume: orderVolume,
                churn_rate: churnRate
            });
            await this.adminChartRepo.save(chartData);
            console.log(`Admin chart data generated successfully for period ${startDate} - ${endDate}`);
        }
        catch (error) {
            console.error('Error generating admin chart data:', error);
            throw new Error('Failed to generate admin chart data');
        }
    }
    async calculateTotalUsers(startDate, endDate) {
        try {
            const totalUsers = await this.userRepo.count({
                where: {
                    created_at: (0, typeorm_2.Between)(new Date(0), new Date(endDate * 1000))
                }
            });
            return totalUsers;
        }
        catch (error) {
            console.error('Error calculating total users:', error);
            return 0;
        }
    }
    async calculateSoldPromotions(startDate, endDate) {
        try {
            const soldPromotions = await this.promotionRepo.count({
                where: {
                    created_at: (0, typeorm_2.Between)(new Date(startDate * 1000), new Date(endDate * 1000))
                }
            });
            return soldPromotions;
        }
        catch (error) {
            console.error('Error calculating sold promotions:', error);
            return 0;
        }
    }
    async calculateNetIncome(startDate, endDate) {
        try {
            const result = await this.orderRepo
                .createQueryBuilder('order')
                .select([
                "TO_CHAR(TO_TIMESTAMP(order.created_at), 'YYYY-MM-DD') as date",
                'SUM(order.total_amount - order.delivery_fee - order.service_fee) as total_amount'
            ])
                .where('order.status = :status', { status: order_entity_1.OrderStatus.DELIVERED })
                .andWhere('order.created_at BETWEEN :startDate AND :endDate', {
                startDate,
                endDate
            })
                .groupBy("TO_CHAR(TO_TIMESTAMP(order.created_at), 'YYYY-MM-DD')")
                .orderBy("TO_CHAR(TO_TIMESTAMP(order.created_at), 'YYYY-MM-DD')")
                .limit(90)
                .getRawMany();
            return result.map(item => ({
                date: item.date,
                total_amount: parseFloat(item.total_amount) || 0
            }));
        }
        catch (error) {
            console.error('Error calculating net income:', error);
            return [];
        }
    }
    async calculateGrossIncome(startDate, endDate) {
        try {
            const result = await this.orderRepo
                .createQueryBuilder('order')
                .select([
                "TO_CHAR(TO_TIMESTAMP(order.created_at), 'YYYY-MM-DD') as date",
                'SUM(order.total_amount) as total_amount'
            ])
                .where('order.status = :status', { status: order_entity_1.OrderStatus.DELIVERED })
                .andWhere('order.created_at BETWEEN :startDate AND :endDate', {
                startDate,
                endDate
            })
                .groupBy("TO_CHAR(TO_TIMESTAMP(order.created_at), 'YYYY-MM-DD')")
                .orderBy("TO_CHAR(TO_TIMESTAMP(order.created_at), 'YYYY-MM-DD')")
                .limit(90)
                .getRawMany();
            return result.map(item => ({
                date: item.date,
                total_amount: parseFloat(item.total_amount) || 0
            }));
        }
        catch (error) {
            console.error('Error calculating gross income:', error);
            return [];
        }
    }
    async calculateOrderStats(startDate, endDate) {
        try {
            const completedOrders = await this.orderRepo
                .createQueryBuilder('order')
                .select([
                "TO_CHAR(TO_TIMESTAMP(order.created_at), 'YYYY-MM-DD') as date",
                'COUNT(*) as count'
            ])
                .where('order.status = :status', { status: order_entity_1.OrderStatus.DELIVERED })
                .andWhere('order.created_at BETWEEN :startDate AND :endDate', {
                startDate,
                endDate
            })
                .groupBy("TO_CHAR(TO_TIMESTAMP(order.created_at), 'YYYY-MM-DD')")
                .orderBy("TO_CHAR(TO_TIMESTAMP(order.created_at), 'YYYY-MM-DD')")
                .limit(90)
                .getRawMany();
            const cancelledOrders = await this.orderRepo
                .createQueryBuilder('order')
                .select([
                "TO_CHAR(TO_TIMESTAMP(order.created_at), 'YYYY-MM-DD') as date",
                'COUNT(*) as count'
            ])
                .where('order.status = :status', { status: order_entity_1.OrderStatus.CANCELLED })
                .andWhere('order.created_at BETWEEN :startDate AND :endDate', {
                startDate,
                endDate
            })
                .groupBy("TO_CHAR(TO_TIMESTAMP(order.created_at), 'YYYY-MM-DD')")
                .orderBy("TO_CHAR(TO_TIMESTAMP(order.created_at), 'YYYY-MM-DD')")
                .limit(90)
                .getRawMany();
            const dateSet = new Set([
                ...completedOrders.map(o => o.date),
                ...cancelledOrders.map(o => o.date)
            ]);
            return Array.from(dateSet)
                .map(date => {
                const completed = completedOrders.find(o => o.date === date)?.count || 0;
                const cancelled = cancelledOrders.find(o => o.date === date)?.count || 0;
                return {
                    date,
                    completed: parseInt(completed),
                    cancelled: parseInt(cancelled)
                };
            })
                .sort((a, b) => a.date.localeCompare(b.date));
        }
        catch (error) {
            console.error('Error calculating order stats:', error);
            return [];
        }
    }
    async calculateUserGrowthRate(startDate, endDate) {
        try {
            const driverGrowth = await this.driverRepo
                .createQueryBuilder('driver')
                .select([
                "TO_CHAR(TO_TIMESTAMP(driver.created_at), 'YYYY-MM-DD') as date",
                'COUNT(*) as count'
            ])
                .where('driver.created_at BETWEEN :startDate AND :endDate', {
                startDate,
                endDate
            })
                .groupBy("TO_CHAR(TO_TIMESTAMP(driver.created_at), 'YYYY-MM-DD')")
                .orderBy("TO_CHAR(TO_TIMESTAMP(driver.created_at), 'YYYY-MM-DD')")
                .getRawMany();
            const restaurantGrowth = await this.restaurantRepo
                .createQueryBuilder('restaurant')
                .select([
                "TO_CHAR(TO_TIMESTAMP(restaurant.created_at), 'YYYY-MM-DD') as date",
                'COUNT(*) as count'
            ])
                .where('restaurant.created_at BETWEEN :startDate AND :endDate', {
                startDate,
                endDate
            })
                .groupBy("TO_CHAR(TO_TIMESTAMP(restaurant.created_at), 'YYYY-MM-DD')")
                .orderBy("TO_CHAR(TO_TIMESTAMP(restaurant.created_at), 'YYYY-MM-DD')")
                .getRawMany();
            const customerGrowth = await this.customerRepo
                .createQueryBuilder('customer')
                .select([
                "TO_CHAR(TO_TIMESTAMP(customer.created_at), 'YYYY-MM-DD') as date",
                'COUNT(*) as count'
            ])
                .where('customer.created_at BETWEEN :startDate AND :endDate', {
                startDate,
                endDate
            })
                .groupBy("TO_CHAR(TO_TIMESTAMP(customer.created_at), 'YYYY-MM-DD')")
                .orderBy("TO_CHAR(TO_TIMESTAMP(customer.created_at), 'YYYY-MM-DD')")
                .getRawMany();
            const dateSet = new Set([
                ...driverGrowth.map(d => d.date),
                ...restaurantGrowth.map(r => r.date),
                ...customerGrowth.map(c => c.date)
            ]);
            return Array.from(dateSet)
                .map(date => {
                return {
                    date,
                    driver: parseInt(driverGrowth.find(d => d.date === date)?.count || 0),
                    restaurant: parseInt(restaurantGrowth.find(r => r.date === date)?.count || 0),
                    customer: parseInt(customerGrowth.find(c => c.date === date)?.count || 0),
                    customer_care: 0
                };
            })
                .sort((a, b) => a.date.localeCompare(b.date));
        }
        catch (error) {
            console.error('Error calculating user growth rate:', error);
            return [];
        }
    }
    async calculateGrossFromPromotion(startDate, endDate) {
        try {
            const result = await this.promotionRepo
                .createQueryBuilder('promotion')
                .select('SUM(promotion.value)', 'total')
                .where('promotion.created_at BETWEEN :startDate AND :endDate', {
                startDate,
                endDate
            })
                .getRawOne();
            return parseFloat(result?.total || '0');
        }
        catch (error) {
            console.error('Error calculating gross from promotions:', error);
            return 0;
        }
    }
    async calculateAvgCustomerSatisfaction(startDate, endDate) {
        try {
            const result = await this.ratingsReviewRepo
                .createQueryBuilder('review')
                .select('AVG(review.overall_rating)', 'average')
                .where('review.created_at BETWEEN :startDate AND :endDate', {
                startDate,
                endDate
            })
                .getRawOne();
            return parseFloat(result?.average || '0');
        }
        catch (error) {
            console.error('Error calculating average customer satisfaction:', error);
            return 0;
        }
    }
    async calculateAvgDeliveryTime(startDate, endDate) {
        try {
            const result = await this.orderRepo
                .createQueryBuilder('order')
                .select('AVG(order.delivery_time - order.order_time)', 'average')
                .where('order.status = :status', { status: order_entity_1.OrderStatus.DELIVERED })
                .andWhere('order.created_at BETWEEN :startDate AND :endDate', {
                startDate,
                endDate
            })
                .getRawOne();
            return Math.round(parseFloat(result?.average || '0'));
        }
        catch (error) {
            console.error('Error calculating average delivery time:', error);
            return 0;
        }
    }
    async calculateOrderCancellationRate(startDate, endDate) {
        try {
            const [totalOrders, cancelledOrders] = await Promise.all([
                this.orderRepo.count({
                    where: {
                        created_at: (0, typeorm_2.Between)(startDate, endDate)
                    }
                }),
                this.orderRepo.count({
                    where: {
                        created_at: (0, typeorm_2.Between)(startDate, endDate),
                        status: order_entity_1.OrderStatus.CANCELLED
                    }
                })
            ]);
            return totalOrders > 0
                ? parseFloat((cancelledOrders / totalOrders).toFixed(2))
                : 0;
        }
        catch (error) {
            console.error('Error calculating order cancellation rate:', error);
            return 0;
        }
    }
    async calculateOrderVolume(startDate, endDate) {
        try {
            return await this.orderRepo.count({
                where: {
                    created_at: (0, typeorm_2.Between)(startDate, endDate)
                }
            });
        }
        catch (error) {
            console.error('Error calculating order volume:', error);
            return 0;
        }
    }
    async calculateChurnRate(startDate, endDate) {
        try {
            return 0.1;
        }
        catch (error) {
            console.error('Error calculating churn rate:', error);
            return 0;
        }
    }
};
exports.AdminChartService = AdminChartService;
exports.AdminChartService = AdminChartService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(admin_chart_record_entity_1.AdminChartRecord)),
    __param(1, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(3, (0, typeorm_1.InjectRepository)(promotion_entity_1.Promotion)),
    __param(4, (0, typeorm_1.InjectRepository)(customer_entity_1.Customer)),
    __param(5, (0, typeorm_1.InjectRepository)(driver_entity_1.Driver)),
    __param(6, (0, typeorm_1.InjectRepository)(restaurant_entity_1.Restaurant)),
    __param(7, (0, typeorm_1.InjectRepository)(ratings_review_entity_1.RatingsReview)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], AdminChartService);
//# sourceMappingURL=admin_chart.service.js.map