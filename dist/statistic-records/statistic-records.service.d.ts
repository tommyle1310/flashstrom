import { Repository } from 'typeorm';
import { StatisticRecord } from './entities/statistic-record.entity';
import { StatisticRecordsRepository } from './statistic-records.repository';
import { CreateStatisticRecordDto } from './dto/create-statistic-record.dto';
import { UpdateStatisticRecordDto } from './dto/update-statistic-record.dto';
import { ApiResponse } from 'src/utils/createResponse';
export declare class StatisticRecordsService {
    private readonly statisticRecordsRepository;
    private statisticRecordEntityRepository;
    constructor(statisticRecordsRepository: StatisticRecordsRepository, statisticRecordEntityRepository: Repository<StatisticRecord>);
    create(createStatisticRecordDto: CreateStatisticRecordDto): Promise<ApiResponse<StatisticRecord>>;
    findAll(): Promise<ApiResponse<StatisticRecord[]>>;
    findOne(id: string): Promise<ApiResponse<StatisticRecord>>;
    findByDriverId({ driverId, limit, offset }: {
        driverId: string;
        limit: number;
        offset: number;
    }): Promise<ApiResponse<StatisticRecord[]>>;
    update(id: string, updateStatisticRecordDto: UpdateStatisticRecordDto): Promise<ApiResponse<StatisticRecord>>;
    remove(id: string): Promise<ApiResponse<null>>;
    private handleRecordResponse;
    private handleError;
}
