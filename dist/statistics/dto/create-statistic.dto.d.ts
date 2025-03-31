export declare class CreateStatisticsDto {
    driver_id?: string;
    customer_care_id?: string;
    restaurant_id?: string;
    period_type: string;
    period_start: number;
    records: string[];
    data: {
        online_hours?: number;
        total_orders?: number;
        tickets_resolved?: number;
        earnings?: number;
        [key: string]: any;
    };
}
