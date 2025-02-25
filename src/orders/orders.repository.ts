import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrdersRepository {
  constructor(
    @InjectRepository(Order)
    private repository: Repository<Order>
  ) {}

  async create(createDto: CreateOrderDto): Promise<Order> {
    const order = this.repository.create(createDto);
    return await this.repository.save(order);
  }

  async findAll(): Promise<Order[]> {
    return await this.repository.find();
  }

  async findById(id: string): Promise<Order> {
    return await this.repository.findOne({ where: { id } });
  }

  async update(id: string, updateDto: UpdateOrderDto): Promise<Order> {
    await this.repository.update(id, {
      ...updateDto,
      updated_at: Math.floor(Date.now() / 1000)
    });
    return await this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected > 0;
  }

  async updateStatus(
    id: string,
    status:
      | 'PENDING'
      | 'RESTAURANT_ACCEPTED'
      | 'IN_PROGRESS'
      | 'DELIVERED'
      | 'CANCELLED'
  ): Promise<Order> {
    await this.repository.update(id, {
      status,
      tracking_info: status as any,
      updated_at: Math.floor(Date.now() / 1000)
    });
    return await this.findById(id);
  }
}
