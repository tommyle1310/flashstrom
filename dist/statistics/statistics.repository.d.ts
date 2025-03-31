import { Repository } from 'typeorm';
import { Statistics } from './entities/statistic.entity';
export declare class StatisticsRepository {
    private statisticsEntityRepository;
    constructor(statisticsEntityRepository: Repository<Statistics>);
    findById(id: string): Promise<Statistics>;
    findByDriverId(driverId: string, periodType: string, limit: number, offset: number): Promise<Statistics[]>;
    findByCustomerCareId(customerCareId: string, periodType: string, limit: number, offset: number): Promise<Statistics[]>;
    findByRestaurantId(restaurantId: string, periodType: string, limit: number, offset: number): Promise<Statistics[]>;
    create(createStatisticsDto: any): Promise<any>;
    update(id: string, updateStatisticsDto: any): Promise<Statistics>;
    remove(id: string): Promise<Statistics>;
}
