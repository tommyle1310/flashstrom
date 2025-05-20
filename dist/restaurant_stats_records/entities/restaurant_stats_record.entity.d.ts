export declare class RestaurantStatsRecord {
    id: string;
    restaurant_id: string;
    period_type: string;
    period_start: number;
    period_end: number;
    total_orders: number;
    total_revenue: number;
    total_delivery_fee: number;
    total_commission: number;
    total_tips: number;
    total_online_hours: number;
    rating_summary: {
        average_food_rating: number;
        average_service_rating: number;
        average_overall_rating: number;
        total_ratings: number;
        review_count: number;
        rating_distribution: {
            '1': number;
            '2': number;
            '3': number;
            '4': number;
            '5': number;
        };
    };
    order_status_summary: {
        completed: number;
        cancelled: number;
        rejected: number;
    };
    popular_items: {
        item_id: string;
        name: string;
        quantity: number;
        revenue: number;
    }[];
    created_at: Date;
    updated_at: Date;
}
