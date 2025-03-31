import { StatisticRecordsService } from './statistic-records.service';
import { CreateStatisticRecordDto } from './dto/create-statistic-record.dto';
import { UpdateStatisticRecordDto } from './dto/update-statistic-record.dto';
export declare class StatisticRecordsController {
    private readonly statisticRecordsService;
    constructor(statisticRecordsService: StatisticRecordsService);
    create(createStatisticRecordDto: CreateStatisticRecordDto): Promise<import("../utils/createResponse").ApiResponse<import("./entities/statistic-record.entity").StatisticRecord>>;
    findAll(): Promise<import("../utils/createResponse").ApiResponse<import("./entities/statistic-record.entity").StatisticRecord[]>>;
    findOne(id: string): Promise<import("../utils/createResponse").ApiResponse<import("./entities/statistic-record.entity").StatisticRecord>>;
    findByDriverId(driverId: string, limit?: string, offset?: string): Promise<import("../utils/createResponse").ApiResponse<import("./entities/statistic-record.entity").StatisticRecord[]>>;
    update(id: string, updateStatisticRecordDto: UpdateStatisticRecordDto): Promise<import("../utils/createResponse").ApiResponse<import("./entities/statistic-record.entity").StatisticRecord>>;
    remove(id: string): Promise<import("../utils/createResponse").ApiResponse<null>>;
}
