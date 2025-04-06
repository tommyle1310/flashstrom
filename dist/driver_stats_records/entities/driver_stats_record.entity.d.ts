import { Driver } from 'src/drivers/entities/driver.entity';
export declare class DriverStatsRecord {
    id: string;
    driver_id: string;
    driver: Driver;
    period_type: string;
    period_start: number;
    period_end: number;
    total_online_hours: number;
    total_earns: number;
    total_tips: number;
    rating_summary: {
        average_food_rating: number;
        average_delivery_rating: number;
        review_count: number;
    };
    created_at: number;
    updated_at: number;
    generateId(): void;
}
