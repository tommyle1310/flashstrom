import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnlineSession } from './entities/online-session.entity';

@Injectable()
export class OnlineSessionsRepository {
  constructor(
    @InjectRepository(OnlineSession)
    private onlineSessionEntityRepository: Repository<OnlineSession>
  ) {}

  async findById(id: string): Promise<OnlineSession> {
    return await this.onlineSessionEntityRepository.findOne({ where: { id } });
  }

  async findByDriverId(
    driverId: string,
    limit: number,
    offset: number
  ): Promise<OnlineSession[]> {
    return await this.onlineSessionEntityRepository.find({
      where: { driver_id: driverId },
      take: limit,
      skip: offset,
      order: { start_time: 'DESC' }
    });
  }

  async findByCustomerCareId(
    customerCareId: string,
    limit: number,
    offset: number
  ): Promise<OnlineSession[]> {
    return await this.onlineSessionEntityRepository.find({
      where: { customer_care_id: customerCareId },
      take: limit,
      skip: offset,
      order: { start_time: 'DESC' }
    });
  }

  async create(createOnlineSessionDto: any): Promise<any> {
    const session = this.onlineSessionEntityRepository.create(
      createOnlineSessionDto
    );
    return await this.onlineSessionEntityRepository.save(session);
  }

  async update(
    id: string,
    updateOnlineSessionDto: any
  ): Promise<OnlineSession> {
    await this.onlineSessionEntityRepository.update(id, updateOnlineSessionDto);
    return await this.findById(id);
  }

  async remove(id: string): Promise<OnlineSession> {
    const session = await this.findById(id);
    if (session) {
      await this.onlineSessionEntityRepository.delete(id);
    }
    return session;
  }
}
