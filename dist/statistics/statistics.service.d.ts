import { Repository } from 'typeorm';
import { Statistics } from './entities/statistic.entity';
import { StatisticsRepository } from './statistics.repository';
import { CreateStatisticsDto } from './dto/create-statistic.dto';
import { UpdateStatisticsDto } from './dto/update-statistic.dto';
import { ApiResponse } from 'src/utils/createResponse';
export declare class StatisticsService {
    private readonly statisticsRepository;
    private statisticsEntityRepository;
    constructor(statisticsRepository: StatisticsRepository, statisticsEntityRepository: Repository<Statistics>);
    create(createStatisticsDto: CreateStatisticsDto): Promise<ApiResponse<Statistics>>;
    findAll(): Promise<ApiResponse<Statistics[]>>;
    findOne(id: string): Promise<ApiResponse<Statistics>>;
    findByDriverId({ driverId, periodType, limit, offset }: {
        driverId: string;
        periodType: string;
        limit: number;
        offset: number;
    }): Promise<ApiResponse<Statistics[]>>;
    findByCustomerCareId({ customerCareId, periodType, limit, offset }: {
        customerCareId: string;
        periodType: string;
        limit: number;
        offset: number;
    }): Promise<ApiResponse<Statistics[]>>;
    findByRestaurantId({ restaurantId, periodType, limit, offset }: {
        restaurantId: string;
        periodType: string;
        limit: number;
        offset: number;
    }): Promise<ApiResponse<Statistics[]>>;
    update(id: string, updateStatisticsDto: UpdateStatisticsDto): Promise<ApiResponse<Statistics>>;
    remove(id: string): Promise<ApiResponse<null>>;
    private handleStatsResponse;
    private handleError;
}
