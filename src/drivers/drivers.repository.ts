import { Repository } from 'typeorm';
import { Driver } from './entities/driver.entity';
import { InjectRepository } from '@nestjs/typeorm';

export class DriversRepository {
  constructor(
    @InjectRepository(Driver)
    private driverRepository: Repository<Driver>
  ) {}

  async findById(
    id: string,
    options?: { relations?: string[] }
  ): Promise<Driver> {
    const driver = await this.driverRepository.findOne({
      where: { id },
      relations: options?.relations || ['user']
    });
    return driver || null;
  }

  // Các hàm khác như findOne, findAll, create, update, save, remove giữ nguyên
  async findOne(conditions: object): Promise<Driver> {
    return await this.driverRepository.findOne({ where: conditions });
  }

  async findAll(): Promise<Driver[]> {
    return await this.driverRepository.find();
  }

  async create(createDriverDto: any): Promise<any> {
    const driver = this.driverRepository.create(createDriverDto);
    return await this.driverRepository.save(driver);
  }

  async update(id: string, updateDriverDto: any): Promise<Driver> {
    await this.driverRepository.update(id, updateDriverDto);
    return await this.findById(id);
  }

  async save(driver: Driver): Promise<Driver> {
    return await this.driverRepository.save(driver);
  }

  async remove(id: string): Promise<Driver> {
    const driver = await this.findById(id);
    if (driver) {
      await this.driverRepository.delete(id);
    }
    return driver;
  }

  async findByUserId(userId: string): Promise<Driver> {
    return await this.driverRepository.findOne({ where: { user_id: userId } });
  }
}
