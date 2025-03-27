import { Module } from '@nestjs/common';
import { StatisticRecordsService } from './statistic-records.service';
import { StatisticRecordsController } from './statistic-records.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Statistics } from 'src/statistics/entities/statistic.entity';
import { StatisticRecord } from './entities/statistic-record.entity';
import { StatisticRecordsRepository } from './statistic-records.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Statistics, StatisticRecord])],
  controllers: [StatisticRecordsController],
  providers: [StatisticRecordsService, StatisticRecordsRepository]
})
export class StatisticRecordsModule {}
