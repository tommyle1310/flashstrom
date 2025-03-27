import { Module } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { StatisticsController } from './statistics.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Statistics } from './entities/statistic.entity';
import { StatisticsRepository } from './statistics.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Statistics])],
  controllers: [StatisticsController],
  providers: [StatisticsService, StatisticsRepository]
})
export class StatisticsModule {}
