import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Statistics } from './entities/statistic.entity';
import { StatisticsRepository } from './statistics.repository';
import { CreateStatisticsDto } from './dto/create-statistic.dto';
import { UpdateStatisticsDto } from './dto/update-statistic.dto';
import { createResponse, ApiResponse } from 'src/utils/createResponse';

@Injectable()
export class StatisticsService {
  constructor(
    private readonly statisticsRepository: StatisticsRepository,
    @InjectRepository(Statistics)
    private statisticsEntityRepository: Repository<Statistics>
  ) {}

  async create(
    createStatisticsDto: CreateStatisticsDto
  ): Promise<ApiResponse<Statistics>> {
    try {
      if (
        !createStatisticsDto.driver_id &&
        !createStatisticsDto.customer_care_id &&
        !createStatisticsDto.restaurant_id
      ) {
        return createResponse(
          'MissingInput',
          null,
          'At least one of driver_id, customer_care_id, or restaurant_id is required'
        );
      }

      const newStats =
        await this.statisticsRepository.create(createStatisticsDto);
      return createResponse('OK', newStats, 'Statistics created successfully');
    } catch (error) {
      return this.handleError('Error creating statistics:', error);
    }
  }

  async findAll(): Promise<ApiResponse<Statistics[]>> {
    try {
      const stats = await this.statisticsEntityRepository.find({
        relations: ['records']
      });
      return createResponse('OK', stats, 'Fetched all statistics');
    } catch (error) {
      return this.handleError('Error fetching statistics:', error);
    }
  }

  async findOne(id: string): Promise<ApiResponse<Statistics>> {
    try {
      const stats = await this.statisticsRepository.findById(id);
      return this.handleStatsResponse(stats);
    } catch (error) {
      return this.handleError('Error fetching statistics:', error);
    }
  }

  async findByDriverId({
    driverId,
    periodType,
    limit,
    offset
  }: {
    driverId: string;
    periodType: string;
    limit: number;
    offset: number;
  }): Promise<ApiResponse<Statistics[]>> {
    try {
      const stats = await this.statisticsRepository.findByDriverId(
        driverId,
        periodType,
        limit,
        offset
      );
      return createResponse('OK', stats, 'Fetched statistics by driver');
    } catch (error) {
      return this.handleError('Error fetching statistics by driver:', error);
    }
  }

  async findByCustomerCareId({
    customerCareId,
    periodType,
    limit,
    offset
  }: {
    customerCareId: string;
    periodType: string;
    limit: number;
    offset: number;
  }): Promise<ApiResponse<Statistics[]>> {
    try {
      const stats = await this.statisticsRepository.findByCustomerCareId(
        customerCareId,
        periodType,
        limit,
        offset
      );
      return createResponse('OK', stats, 'Fetched statistics by customer care');
    } catch (error) {
      return this.handleError(
        'Error fetching statistics by customer care:',
        error
      );
    }
  }

  async findByRestaurantId({
    restaurantId,
    periodType,
    limit,
    offset
  }: {
    restaurantId: string;
    periodType: string;
    limit: number;
    offset: number;
  }): Promise<ApiResponse<Statistics[]>> {
    try {
      const stats = await this.statisticsRepository.findByRestaurantId(
        restaurantId,
        periodType,
        limit,
        offset
      );
      return createResponse('OK', stats, 'Fetched statistics by restaurant');
    } catch (error) {
      return this.handleError(
        'Error fetching statistics by restaurant:',
        error
      );
    }
  }

  async update(
    id: string,
    updateStatisticsDto: UpdateStatisticsDto
  ): Promise<ApiResponse<Statistics>> {
    try {
      const stats = await this.statisticsRepository.findById(id);
      if (!stats) {
        return createResponse('NotFound', null, 'Statistics not found');
      }

      const updatedStats = await this.statisticsRepository.update(
        id,
        updateStatisticsDto
      );
      return createResponse(
        'OK',
        updatedStats,
        'Statistics updated successfully'
      );
    } catch (error) {
      return this.handleError('Error updating statistics:', error);
    }
  }

  async remove(id: string): Promise<ApiResponse<null>> {
    try {
      const deletedStats = await this.statisticsRepository.remove(id);
      if (!deletedStats) {
        return createResponse('NotFound', null, 'Statistics not found');
      }
      return createResponse('OK', null, 'Statistics deleted successfully');
    } catch (error) {
      return this.handleError('Error deleting statistics:', error);
    }
  }

  private handleStatsResponse(
    stats: Statistics | null
  ): ApiResponse<Statistics> {
    if (!stats) {
      return createResponse('NotFound', null, 'Statistics not found');
    }
    return createResponse('OK', stats, 'Statistics retrieved successfully');
  }

  private handleError(message: string, error: any): ApiResponse<null> {
    console.error(message, error);
    return createResponse(
      'ServerError',
      null,
      'An error occurred while processing your request'
    );
  }
}
