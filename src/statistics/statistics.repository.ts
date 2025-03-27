import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Statistics } from './entities/statistic.entity';

@Injectable()
export class StatisticsRepository {
  constructor(
    @InjectRepository(Statistics)
    private statisticsEntityRepository: Repository<Statistics>
  ) {}

  async findById(id: string): Promise<Statistics> {
    return await this.statisticsEntityRepository.findOne({
      where: { id },
      relations: ['records']
    });
  }

  async findByDriverId(
    driverId: string,
    periodType: string,
    limit: number,
    offset: number
  ): Promise<Statistics[]> {
    return await this.statisticsEntityRepository.find({
      where: { driver_id: driverId, period_type: periodType },
      take: limit,
      skip: offset,
      order: { period_start: 'DESC' },
      relations: ['records']
    });
  }

  async findByCustomerCareId(
    customerCareId: string,
    periodType: string,
    limit: number,
    offset: number
  ): Promise<Statistics[]> {
    return await this.statisticsEntityRepository.find({
      where: { customer_care_id: customerCareId, period_type: periodType },
      take: limit,
      skip: offset,
      order: { period_start: 'DESC' },
      relations: ['records']
    });
  }

  async findByRestaurantId(
    restaurantId: string,
    periodType: string,
    limit: number,
    offset: number
  ): Promise<Statistics[]> {
    return await this.statisticsEntityRepository.find({
      where: { restaurant_id: restaurantId, period_type: periodType },
      take: limit,
      skip: offset,
      order: { period_start: 'DESC' },
      relations: ['records']
    });
  }

  async create(createStatisticsDto: any): Promise<any> {
    const stats = this.statisticsEntityRepository.create(createStatisticsDto);
    return await this.statisticsEntityRepository.save(stats);
  }

  async update(id: string, updateStatisticsDto: any): Promise<Statistics> {
    await this.statisticsEntityRepository.update(id, updateStatisticsDto);
    return await this.findById(id);
  }

  async remove(id: string): Promise<Statistics> {
    const stats = await this.findById(id);
    if (stats) {
      await this.statisticsEntityRepository.delete(id);
    }
    return stats;
  }
}
