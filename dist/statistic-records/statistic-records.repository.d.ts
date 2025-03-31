import { Repository } from 'typeorm';
import { StatisticRecord } from './entities/statistic-record.entity';
export declare class StatisticRecordsRepository {
    private statisticRecordEntityRepository;
    constructor(statisticRecordEntityRepository: Repository<StatisticRecord>);
    findById(id: string): Promise<StatisticRecord>;
    findByDriverId(driverId: string, limit: number, offset: number): Promise<StatisticRecord[]>;
    create(createStatisticRecordDto: any): Promise<StatisticRecord>;
    update(id: string, updateStatisticRecordDto: any): Promise<StatisticRecord>;
    remove(id: string): Promise<StatisticRecord>;
}
