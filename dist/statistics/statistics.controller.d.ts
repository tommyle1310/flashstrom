import { StatisticsService } from './statistics.service';
import { CreateStatisticsDto } from './dto/create-statistic.dto';
import { UpdateStatisticsDto } from './dto/update-statistic.dto';
export declare class StatisticsController {
    private readonly statisticsService;
    constructor(statisticsService: StatisticsService);
    create(createStatisticsDto: CreateStatisticsDto): Promise<import("../utils/createResponse").ApiResponse<import("./entities/statistic.entity").Statistics>>;
    findAll(): Promise<import("../utils/createResponse").ApiResponse<import("./entities/statistic.entity").Statistics[]>>;
    findByDriverId(driverId: string, periodType?: string, limit?: string, offset?: string): Promise<import("../utils/createResponse").ApiResponse<import("./entities/statistic.entity").Statistics[]>>;
    findByCustomerCareId(customerCareId: string, periodType?: string, limit?: string, offset?: string): Promise<import("../utils/createResponse").ApiResponse<import("./entities/statistic.entity").Statistics[]>>;
    findByRestaurantId(restaurantId: string, periodType?: string, limit?: string, offset?: string): Promise<import("../utils/createResponse").ApiResponse<import("./entities/statistic.entity").Statistics[]>>;
    findOne(id: string): Promise<import("../utils/createResponse").ApiResponse<import("./entities/statistic.entity").Statistics>>;
    update(id: string, updateStatisticsDto: UpdateStatisticsDto): Promise<import("../utils/createResponse").ApiResponse<import("./entities/statistic.entity").Statistics>>;
    remove(id: string): Promise<import("../utils/createResponse").ApiResponse<null>>;
}
