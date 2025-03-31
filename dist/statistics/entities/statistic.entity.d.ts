import { Driver } from 'src/drivers/entities/driver.entity';
import { CustomerCare } from 'src/customer_cares/entities/customer_care.entity';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { StatisticRecord } from './statistic_record.entity';
export declare class Statistics {
    id: string;
    driver_id: string;
    driver: Driver;
    customer_care_id: string;
    customer_care: CustomerCare;
    restaurant_id: string;
    restaurant: Restaurant;
    period_type: string;
    period_start: number;
    records: StatisticRecord[];
    data: {
        online_hours?: number;
        total_orders?: number;
        tickets_resolved?: number;
        earnings?: number;
        [key: string]: any;
    };
    created_at: number;
    generateId(): void;
}
