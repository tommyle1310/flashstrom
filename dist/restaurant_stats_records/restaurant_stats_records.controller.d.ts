import { RestaurantStatsService } from './restaurant_stats_records.service';
export declare class RestaurantStatsController {
    private readonly restaurantStatsService;
    constructor(restaurantStatsService: RestaurantStatsService);
    updateStats(restaurantId: string, periodType: string): Promise<import("src/utils/createResponse").ApiResponse<any>>;
    updateStatsForRange(restaurantId: string, startDate: string, endDate: string, periodType?: string): Promise<import("src/utils/createResponse").ApiResponse<any>>;
    getStats(restaurantId: string, startDate: string, endDate: string, aggregate?: boolean, forceRefresh?: boolean): Promise<import("src/utils/createResponse").ApiResponse<any>>;
}
