import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { DriverProgressStage } from './entities/driver_progress_stage.entity';
import { CreateDriverProgressStageDto } from './dto/create-driver-progress-stage.dto';
import { UpdateDriverProgressStageDto } from './dto/update-driver-progress-stage.dto';

@Injectable()
export class DriverProgressStagesRepository {
  constructor(
    @InjectRepository(DriverProgressStage)
    private repository: Repository<DriverProgressStage>
  ) {}

  async create(
    createDto: CreateDriverProgressStageDto
  ): Promise<DriverProgressStage> {
    const stage = this.repository.create(createDto);
    return await this.repository.save(stage);
  }

  async findAll(): Promise<DriverProgressStage[]> {
    return await this.repository.find();
  }

  async findById(id: string): Promise<DriverProgressStage> {
    return await this.repository.findOne({ where: { id } });
  }

  async findByDriverId(driverId: string): Promise<DriverProgressStage> {
    return await this.repository.findOne({ where: { driver_id: driverId } });
  }

  async update(
    id: string,
    updateDto: UpdateDriverProgressStageDto
  ): Promise<DriverProgressStage> {
    await this.repository.update(id, {
      ...updateDto,
      updated_at: Math.floor(Date.now() / 1000)
    });
    return await this.findById(id);
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected > 0;
  }

  async updateStages(id: string, stages: any[]): Promise<DriverProgressStage> {
    await this.repository.update(id, {
      stages,
      updated_at: Math.floor(Date.now() / 1000)
    });
    return await this.findById(id);
  }
}
