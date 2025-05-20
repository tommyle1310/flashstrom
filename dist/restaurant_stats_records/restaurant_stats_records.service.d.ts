import { Repository } from 'typeorm';
import { RestaurantStatsRecord } from './entities/restaurant_stats_record.entity';
import { Order } from 'src/orders/entities/order.entity';
import { RatingsReview } from 'src/ratings_reviews/entities/ratings_review.entity';
import { ApiResponse } from 'src/utils/createResponse';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
export declare class RestaurantStatsService {
    private restaurantStatsRepo;
    private orderRepo;
    private ratingsReviewRepo;
    private restaurantRepo;
    private readonly redisClient;
    constructor(restaurantStatsRepo: Repository<RestaurantStatsRecord>, orderRepo: Repository<Order>, ratingsReviewRepo: Repository<RatingsReview>, restaurantRepo: Repository<Restaurant>);
    private formatNumber;
    private getCachedStats;
    private setCachedStats;
    updateStatsForRestaurant(restaurantId: string, periodType: string): Promise<void>;
    updateStatsForDateRange(restaurantId: string, startDate: number, endDate: number, periodType?: string): Promise<void>;
    getStatsForRestaurant(restaurantId: string, startDate: number | string, endDate: number | string, aggregate?: boolean, forceRefresh?: boolean): Promise<ApiResponse<any>>;
    private generateRestaurantStats;
    private aggregateRatings;
}
