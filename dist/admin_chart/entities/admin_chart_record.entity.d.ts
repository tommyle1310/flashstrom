export declare class AdminChartRecord {
    id: string;
    period_type: string;
    period_start: number;
    period_end: number;
    total_users: number;
    sold_promotions: number;
    net_income: {
        date: string;
        total_amount: number;
    }[];
    gross_income: {
        date: string;
        total_amount: number;
    }[];
    order_stats: {
        date: string;
        completed: number;
        cancelled: number;
    }[];
    user_growth_rate: {
        date: string;
        driver: number;
        restaurant: number;
        customer: number;
        customer_care: number;
    }[];
    gross_from_promotion: number;
    average_customer_satisfaction: number;
    average_delivery_time: number;
    order_cancellation_rate: number;
    order_volume: number;
    churn_rate: number;
    created_at: Date;
    updated_at: Date;
    generateId(): void;
}
