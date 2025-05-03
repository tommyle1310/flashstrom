import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Penalty } from './entities/penalty.entity';

@Injectable()
export class PenaltiesRepository {
  constructor(
    @InjectRepository(Penalty)
    private penaltyEntityRepository: Repository<Penalty>
  ) {}

  async findById(id: string): Promise<Penalty> {
    return await this.penaltyEntityRepository.findOne({
      where: { id },
      relations: ['penaltied_by', 'rule']
    });
  }

  async findByDriverId(
    driverId: string,
    limit: number,
    offset: number
  ): Promise<Penalty[]> {
    return await this.penaltyEntityRepository.find({
      where: { driver_id: driverId },
      take: limit,
      skip: offset,
      order: { issued_at: 'DESC' },
      relations: ['penaltied_by', 'rule']
    });
  }

  async findByCustomerCareId(
    customerCareId: string,
    limit: number,
    offset: number
  ): Promise<Penalty[]> {
    return await this.penaltyEntityRepository.find({
      where: { customer_care_id: customerCareId },
      take: limit,
      skip: offset,
      order: { issued_at: 'DESC' },
      relations: ['penaltied_by', 'rule']
    });
  }

  async findByRestaurantId(
    restaurantId: string,
    limit: number,
    offset: number
  ): Promise<Penalty[]> {
    return await this.penaltyEntityRepository.find({
      where: { restaurant_id: restaurantId },
      take: limit,
      skip: offset,
      order: { issued_at: 'DESC' },
      relations: ['penaltied_by', 'rule']
    });
  }

  async findByAdminId(
    adminId: string,
    limit: number,
    offset: number
  ): Promise<Penalty[]> {
    return await this.penaltyEntityRepository.find({
      where: { penaltied_by_id: adminId },
      take: limit,
      skip: offset,
      order: { issued_at: 'DESC' },
      relations: ['penaltied_by', 'rule']
    });
  }

  async create(createPenaltyDto: any): Promise<any> {
    const penalty = this.penaltyEntityRepository.create(createPenaltyDto);
    return await this.penaltyEntityRepository.save(penalty);
  }

  async update(id: string, updatePenaltyDto: any): Promise<Penalty> {
    await this.penaltyEntityRepository.update(id, updatePenaltyDto);
    return await this.findById(id);
  }

  async remove(id: string): Promise<Penalty> {
    const penalty = await this.findById(id);
    if (penalty) {
      await this.penaltyEntityRepository.delete(id);
    }
    return penalty;
  }

  async findAllPaginated(
    skip: number,
    limit: number
  ): Promise<[Penalty[], number]> {
    return this.penaltyEntityRepository.findAndCount({
      skip,
      take: limit,
      relations: ['driver', 'customerCare', 'restaurant', 'admin']
    });
  }
}
