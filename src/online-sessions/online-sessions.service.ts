import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnlineSession } from './entities/online-session.entity';
import { CreateOnlineSessionDto } from './dto/create-online-session.dto';
import { UpdateOnlineSessionDto } from './dto/update-online-session.dto';
import { OnlineSessionsRepository } from './online-session.repository';
import { createResponse, ApiResponse } from 'src/utils/createResponse';

@Injectable()
export class OnlineSessionsService {
  constructor(
    private readonly onlineSessionsRepository: OnlineSessionsRepository,
    @InjectRepository(OnlineSession)
    private onlineSessionEntityRepository: Repository<OnlineSession>
  ) {}

  async create(
    createOnlineSessionDto: CreateOnlineSessionDto
  ): Promise<ApiResponse<OnlineSession>> {
    try {
      if (
        !createOnlineSessionDto.driver_id &&
        !createOnlineSessionDto.customer_care_id
      ) {
        return createResponse(
          'MissingInput',
          null,
          'Driver ID or Customer Care ID is required'
        );
      }

      const newSession = await this.onlineSessionsRepository.create(
        createOnlineSessionDto
      );
      return createResponse(
        'OK',
        newSession,
        'Online session created successfully'
      );
    } catch (error: any) {
      return this.handleError('Error creating online session:', error);
    }
  }

  async findAll(): Promise<ApiResponse<OnlineSession[]>> {
    try {
      const sessions = await this.onlineSessionEntityRepository.find();
      return createResponse('OK', sessions, 'Fetched all online sessions');
    } catch (error: any) {
      return this.handleError('Error fetching online sessions:', error);
    }
  }

  async findOne(id: string): Promise<ApiResponse<OnlineSession>> {
    try {
      const session = await this.onlineSessionsRepository.findById(id);
      return this.handleSessionResponse(session);
    } catch (error: any) {
      return this.handleError('Error fetching online session:', error);
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
  }): Promise<ApiResponse<OnlineSession[]>> {
    try {
      const sessions = await this.onlineSessionsRepository.findByDriverId(
        driverId,
        limit,
        offset
      );
      return createResponse(
        'OK',
        sessions,
        'Fetched online sessions by driver'
      );
    } catch (error: any) {
      return this.handleError('Error fetching sessions by driver:', error);
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
  }): Promise<ApiResponse<OnlineSession[]>> {
    try {
      const sessions = await this.onlineSessionsRepository.findByCustomerCareId(
        customerCareId,
        limit,
        offset
      );
      return createResponse(
        'OK',
        sessions,
        'Fetched online sessions by customer care'
      );
    } catch (error: any) {
      return this.handleError(
        'Error fetching sessions by customer care:',
        error
      );
    }
  }

  async update(
    id: string,
    updateOnlineSessionDto: UpdateOnlineSessionDto
  ): Promise<ApiResponse<OnlineSession>> {
    try {
      const session = await this.onlineSessionsRepository.findById(id);
      if (!session) {
        return createResponse('NotFound', null, 'Online session not found');
      }

      const updatedSession = await this.onlineSessionsRepository.update(
        id,
        updateOnlineSessionDto
      );
      return createResponse(
        'OK',
        updatedSession,
        'Online session updated successfully'
      );
    } catch (error: any) {
      return this.handleError('Error updating online session:', error);
    }
  }

  async findOneByDriverIdAndActive(
    driverId: string
  ): Promise<OnlineSession | null> {
    const session = await this.onlineSessionEntityRepository.findOne({
      where: { driver_id: driverId, is_active: true },
      order: { start_time: 'DESC' }
    });
    return session || null;
  }

  async endSession(id: string): Promise<ApiResponse<OnlineSession>> {
    try {
      const session = await this.onlineSessionsRepository.findById(id);
      if (!session) {
        return createResponse('NotFound', null, 'Online session not found');
      }

      const updateData: UpdateOnlineSessionDto = {
        end_time: Math.floor(Date.now() / 1000),
        is_active: false
      };
      const updatedSession = await this.onlineSessionsRepository.update(
        id,
        updateData
      );
      return createResponse(
        'OK',
        updatedSession,
        'Online session ended successfully'
      );
    } catch (error: any) {
      return this.handleError('Error ending online session:', error);
    }
  }

  async remove(id: string): Promise<ApiResponse<null>> {
    try {
      const deletedSession = await this.onlineSessionsRepository.remove(id);
      if (!deletedSession) {
        return createResponse('NotFound', null, 'Online session not found');
      }
      return createResponse('OK', null, 'Online session deleted successfully');
    } catch (error: any) {
      return this.handleError('Error deleting online session:', error);
    }
  }

  private handleSessionResponse(
    session: OnlineSession | null
  ): ApiResponse<OnlineSession> {
    if (!session) {
      return createResponse('NotFound', null, 'Online session not found');
    }
    return createResponse(
      'OK',
      session,
      'Online session retrieved successfully'
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
