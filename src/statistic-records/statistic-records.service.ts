import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StatisticRecord } from './entities/statistic-record.entity';
import { StatisticRecordsRepository } from './statistic-records.repository';
import { CreateStatisticRecordDto } from './dto/create-statistic-record.dto';
import { UpdateStatisticRecordDto } from './dto/update-statistic-record.dto';
import { createResponse, ApiResponse } from 'src/utils/createResponse';

@Injectable()
export class StatisticRecordsService {
  constructor(
    private readonly statisticRecordsRepository: StatisticRecordsRepository,
    @InjectRepository(StatisticRecord)
    private statisticRecordEntityRepository: Repository<StatisticRecord>
  ) {}

  async create(
    createStatisticRecordDto: CreateStatisticRecordDto
  ): Promise<ApiResponse<StatisticRecord>> {
    try {
      if (
        !createStatisticRecordDto.driver_id &&
        !createStatisticRecordDto.customer_care_id &&
        !createStatisticRecordDto.restaurant_id
      ) {
        return createResponse(
          'MissingInput',
          null,
          'At least one of driver_id, customer_care_id, or restaurant_id is required'
        );
      }

      const newRecord = await this.statisticRecordsRepository.create(
        createStatisticRecordDto
      );
      return createResponse(
        'OK',
        newRecord,
        'Statistic record created successfully'
      );
    } catch (error) {
      return this.handleError('Error creating statistic record:', error);
    }
  }

  async findAll(): Promise<ApiResponse<StatisticRecord[]>> {
    try {
      const records = await this.statisticRecordEntityRepository.find();
      return createResponse('OK', records, 'Fetched all statistic records');
    } catch (error) {
      return this.handleError('Error fetching statistic records:', error);
    }
  }

  async findOne(id: string): Promise<ApiResponse<StatisticRecord>> {
    try {
      const record = await this.statisticRecordsRepository.findById(id);
      return this.handleRecordResponse(record);
    } catch (error) {
      return this.handleError('Error fetching statistic record:', error);
    }
  }

  async findByDriverId({
    driverId,
    limit,
    offset
  }: {
    driverId: string;
    limit: number;
    offset: number;
  }): Promise<ApiResponse<StatisticRecord[]>> {
    try {
      const records = await this.statisticRecordsRepository.findByDriverId(
        driverId,
        limit,
        offset
      );
      return createResponse(
        'OK',
        records,
        'Fetched statistic records by driver'
      );
    } catch (error) {
      return this.handleError(
        'Error fetching statistic records by driver:',
        error
      );
    }
  }

  async update(
    id: string,
    updateStatisticRecordDto: UpdateStatisticRecordDto
  ): Promise<ApiResponse<StatisticRecord>> {
    try {
      const record = await this.statisticRecordsRepository.findById(id);
      if (!record) {
        return createResponse('NotFound', null, 'Statistic record not found');
      }

      const updatedRecord = await this.statisticRecordsRepository.update(
        id,
        updateStatisticRecordDto
      );
      return createResponse(
        'OK',
        updatedRecord,
        'Statistic record updated successfully'
      );
    } catch (error) {
      return this.handleError('Error updating statistic record:', error);
    }
  }

  async remove(id: string): Promise<ApiResponse<null>> {
    try {
      const deletedRecord = await this.statisticRecordsRepository.remove(id);
      if (!deletedRecord) {
        return createResponse('NotFound', null, 'Statistic record not found');
      }
      return createResponse(
        'OK',
        null,
        'Statistic record deleted successfully'
      );
    } catch (error) {
      return this.handleError('Error deleting statistic record:', error);
    }
  }

  private handleRecordResponse(
    record: StatisticRecord | null
  ): ApiResponse<StatisticRecord> {
    if (!record) {
      return createResponse('NotFound', null, 'Statistic record not found');
    }
    return createResponse(
      'OK',
      record,
      'Statistic record retrieved successfully'
    );
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
