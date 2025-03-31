export declare class CreateStatisticRecordDto {
    driver_id?: string;
    customer_care_id?: string;
    restaurant_id?: string;
    period_type: string;
    period_start: number;
    period_end: number;
    data: {
        online_hours?: number;
        total_orders?: number;
        tickets_resolved?: number;
        earnings?: number;
        [key: string]: any;
    };
}
