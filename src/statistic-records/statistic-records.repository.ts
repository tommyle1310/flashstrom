import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StatisticRecord } from './entities/statistic-record.entity';

@Injectable()
export class StatisticRecordsRepository {
  constructor(
    @InjectRepository(StatisticRecord)
    private statisticRecordEntityRepository: Repository<StatisticRecord>
  ) {}

  async findById(id: string): Promise<StatisticRecord> {
    return await this.statisticRecordEntityRepository.findOne({
      where: { id }
    });
  }

  async findByDriverId(
    driverId: string,
    limit: number,
    offset: number
  ): Promise<StatisticRecord[]> {
    return await this.statisticRecordEntityRepository.find({
      where: { driver_id: driverId },
      take: limit,
      skip: offset,
      order: { period_start: 'DESC' }
    });
  }

  async create(createStatisticRecordDto: any): Promise<StatisticRecord> {
    const record = this.statisticRecordEntityRepository.create(
      createStatisticRecordDto
    );
    return await this.statisticRecordEntityRepository.save(record);
  }

  async update(
    id: string,
    updateStatisticRecordDto: any
  ): Promise<StatisticRecord> {
    await this.statisticRecordEntityRepository.update(
      id,
      updateStatisticRecordDto
    );
    return await this.findById(id);
  }

  async remove(id: string): Promise<StatisticRecord> {
    const record = await this.findById(id);
    if (record) {
      await this.statisticRecordEntityRepository.delete(id);
    }
    return record;
  }
}
