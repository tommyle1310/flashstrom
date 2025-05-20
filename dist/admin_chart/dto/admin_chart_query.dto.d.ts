export declare enum PeriodType {
    DAILY = "daily",
    WEEKLY = "weekly",
    MONTHLY = "monthly",
    YEARLY = "yearly"
}
export declare class AdminChartQueryDto {
    start_date: string;
    end_date: string;
    period_type?: PeriodType;
    force_refresh?: string;
}
