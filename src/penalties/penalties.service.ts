import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Penalty } from './entities/penalty.entity';
import { PenaltiesRepository } from './penalties.repository';
import { CreatePenaltyDto } from './dto/create-penalty.dto';
import { UpdatePenaltyDto } from './dto/update-penalty.dto';
import { createResponse, ApiResponse } from 'src/utils/createResponse';
import { Admin } from 'src/admin/entities/admin.entity';
import { PenaltyRulesRepository } from 'src/penalty-rules/penalty-rules.repository';
import { AdminRepository } from 'src/admin/admin.repository';
import { DriversRepository } from 'src/drivers/drivers.repository';

@Injectable()
export class PenaltiesService {
  private readonly logger = new Logger(PenaltiesService.name);

  constructor(
    private readonly penaltiesRepository: PenaltiesRepository,
    private readonly penaltyRulesRepository: PenaltyRulesRepository,
    private readonly driverRepository: DriversRepository,
    private readonly adminRepository: AdminRepository,
    @InjectRepository(Penalty)
    private penaltyEntityRepository: Repository<Penalty>
  ) {}

  async create(
    createPenaltyDto: CreatePenaltyDto
  ): Promise<ApiResponse<Penalty>> {
    try {
      // Kiểm tra xem ít nhất một trong driver_id, customer_care_id, hoặc restaurant_id có tồn tại
      if (
        !createPenaltyDto.driver_id &&
        !createPenaltyDto.customer_care_id &&
        !createPenaltyDto.restaurant_id
      ) {
        return createResponse(
          'MissingInput',
          null,
          'At least one of driver_id, customer_care_id, or restaurant_id is required'
        );
      }

      // Kiểm tra xem penaltied_by_id (Admin) có tồn tại không
      const admin = await this.adminRepository.findById(
        createPenaltyDto.penaltied_by_id
      );
      if (!admin) {
        return createResponse(
          'NotFound',
          null,
          `Admin with ID ${createPenaltyDto.penaltied_by_id} not found`
        );
      }
      const driver = await this.driverRepository.findById(
        createPenaltyDto.driver_id
      );
      if (!driver) {
        return createResponse(
          'NotFound',
          null,
          `Driver with ID ${createPenaltyDto.driver_id} not found`
        );
      }

      // Kiểm tra xem rule_id (PenaltyRule) có tồn tại không
      const rule = await this.penaltyRulesRepository.findById(
        createPenaltyDto.rule_id
      );
      if (!rule) {
        return createResponse(
          'NotFound',
          null,
          `Penalty rule with ID ${createPenaltyDto.rule_id} not found`
        );
      }

      // Nếu tất cả validation đều pass, tạo penalty
      const newPenalty =
        await this.penaltiesRepository.create(createPenaltyDto);
      return createResponse('OK', newPenalty, 'Penalty created successfully');
    } catch (error: any) {
      return this.handleError('Error creating penalty:', error);
    }
  }

  async findAll(): Promise<ApiResponse<Penalty[]>> {
    try {
      const penalties = await this.penaltyEntityRepository.find({
        relations: ['penaltied_by', 'rule']
      });
      return createResponse('OK', penalties, 'Fetched all penalties');
    } catch (error: any) {
      return this.handleError('Error fetching penalties:', error);
    }
  }

  async findOne(id: string): Promise<ApiResponse<Penalty>> {
    try {
      const penalty = await this.penaltiesRepository.findById(id);
      return this.handlePenaltyResponse(penalty);
    } catch (error: any) {
      return this.handleError('Error fetching penalty:', error);
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
  }): Promise<ApiResponse<Penalty[]>> {
    try {
      const penalties = await this.penaltiesRepository.findByDriverId(
        driverId,
        limit,
        offset
      );
      return createResponse('OK', penalties, 'Fetched penalties by driver');
    } catch (error: any) {
      return this.handleError('Error fetching penalties by driver:', error);
    }
  }

  async findByCustomerCareId({
    customerCareId,
    limit,
    offset
  }: {
    customerCareId: string;
    limit: number;
    offset: number;
  }): Promise<ApiResponse<Penalty[]>> {
    try {
      const penalties = await this.penaltiesRepository.findByCustomerCareId(
        customerCareId,
        limit,
        offset
      );
      return createResponse(
        'OK',
        penalties,
        'Fetched penalties by customer care'
      );
    } catch (error: any) {
      return this.handleError(
        'Error fetching penalties by customer care:',
        error
      );
    }
  }

  async findByRestaurantId({
    restaurantId,
    limit,
    offset
  }: {
    restaurantId: string;
    limit: number;
    offset: number;
  }): Promise<ApiResponse<Penalty[]>> {
    try {
      const penalties = await this.penaltiesRepository.findByRestaurantId(
        restaurantId,
        limit,
        offset
      );
      return createResponse('OK', penalties, 'Fetched penalties by restaurant');
    } catch (error: any) {
      return this.handleError('Error fetching penalties by restaurant:', error);
    }
  }

  async findByAdminId({
    adminId,
    limit,
    offset
  }: {
    adminId: string;
    limit: number;
    offset: number;
  }): Promise<ApiResponse<Penalty[]>> {
    try {
      const penalties = await this.penaltiesRepository.findByAdminId(
        adminId,
        limit,
        offset
      );
      return createResponse('OK', penalties, 'Fetched penalties by admin');
    } catch (error: any) {
      return this.handleError('Error fetching penalties by admin:', error);
    }
  }

  async update(
    id: string,
    updatePenaltyDto: UpdatePenaltyDto
  ): Promise<ApiResponse<Penalty>> {
    try {
      const penalty = await this.penaltiesRepository.findById(id);
      if (!penalty) {
        return createResponse('NotFound', null, 'Penalty not found');
      }

      const updatedPenalty = await this.penaltiesRepository.update(
        id,
        updatePenaltyDto
      );
      return createResponse(
        'OK',
        updatedPenalty,
        'Penalty updated successfully'
      );
    } catch (error: any) {
      return this.handleError('Error updating penalty:', error);
    }
  }

  async updateStatus(
    id: string,
    status: string
  ): Promise<ApiResponse<Penalty>> {
    try {
      const penalty = await this.penaltiesRepository.findById(id);
      if (!penalty) {
        return createResponse('NotFound', null, 'Penalty not found');
      }

      const updateData: UpdatePenaltyDto = { status };
      const updatedPenalty = await this.penaltiesRepository.update(
        id,
        updateData
      );
      return createResponse(
        'OK',
        updatedPenalty,
        'Penalty status updated successfully'
      );
    } catch (error: any) {
      return this.handleError('Error updating penalty status:', error);
    }
  }

  async remove(id: string): Promise<ApiResponse<null>> {
    try {
      const deletedPenalty = await this.penaltiesRepository.remove(id);
      if (!deletedPenalty) {
        return createResponse('NotFound', null, 'Penalty not found');
      }
      return createResponse('OK', null, 'Penalty deleted successfully');
    } catch (error: any) {
      return this.handleError('Error deleting penalty:', error);
    }
  }

  async findAllPaginated(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      const [items, total] = await this.penaltiesRepository.findAllPaginated(
        skip,
        limit
      );
      const totalPages = Math.ceil(total / limit);

      return createResponse('OK', {
        totalPages,
        currentPage: page,
        totalItems: total,
        items
      });
    } catch (error) {
      this.logger.error(
        `Error fetching paginated penalties: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return createResponse('ServerError', null);
    }
  }

  private handlePenaltyResponse(penalty: Penalty | null): ApiResponse<Penalty> {
    if (!penalty) {
      return createResponse('NotFound', null, 'Penalty not found');
    }
    return createResponse('OK', penalty, 'Penalty retrieved successfully');
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
