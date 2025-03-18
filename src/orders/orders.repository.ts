import { Injectable } from '@nestjs/common';
import { Repository, In, DeepPartial } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Order, OrderStatus, OrderTrackingInfo } from './entities/order.entity';
import { Promotion } from 'src/promotions/entities/promotion.entity'; // Thêm import
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrdersRepository {
  constructor(
    @InjectRepository(Order)
    private repository: Repository<Order>,
    @InjectRepository(Promotion) // Thêm repo cho Promotion
    private promotionRepository: Repository<Promotion>
  ) {}

  async create(createDto: CreateOrderDto): Promise<Order> {
    // Xử lý promotions_applied nếu có
    let promotionsApplied: Promotion[] = [];
    if (createDto.promotions_applied?.length > 0) {
      promotionsApplied = await this.promotionRepository.find({
        where: {
          id: In(createDto.promotions_applied) // Query Promotion từ ID
        }
      });
    }

    // Tạo orderData với type đúng
    const orderData: DeepPartial<Order> = {
      ...createDto,
      status: createDto.status as OrderStatus,
      tracking_info: createDto.tracking_info as OrderTrackingInfo,
      promotions_applied: promotionsApplied // Gán Promotion[]
    };

    const order = this.repository.create(orderData);
    return await this.repository.save(order); // Trả về Order, không phải Order[]
  }

  async findAll(): Promise<Order[]> {
    return await this.repository.find();
  }

  async findById(id: string): Promise<Order> {
    const result = await this.repository.findOne({
      where: { id },
      relations: ['restaurantAddress', 'customerAddress']
    });
    return result;
  }

  async findOne(conditions: object): Promise<Order> {
    return await this.repository.findOne({ where: conditions });
  }

  async update(id: string, updateDto: UpdateOrderDto): Promise<Order> {
    // Lấy order hiện tại để giữ promotions_applied nếu không update
    const existingOrder = await this.findById(id);
    if (!existingOrder) {
      throw new Error('Order not found'); // Hoặc trả về null tùy anh
    }

    // Xử lý promotions_applied nếu có trong DTO
    let promotionsApplied: Promotion[] = existingOrder.promotions_applied || [];
    if (updateDto.promotions_applied?.length > 0) {
      promotionsApplied = await this.promotionRepository.find({
        where: {
          id: In(updateDto.promotions_applied) // Query Promotion từ ID
        }
      });
    }

    // Tạo updateData với type đúng
    const updateData: DeepPartial<Order> = {
      ...updateDto,
      status: updateDto.status ? (updateDto.status as OrderStatus) : undefined,
      tracking_info: updateDto.tracking_info
        ? (updateDto.tracking_info as OrderTrackingInfo)
        : undefined,
      promotions_applied: promotionsApplied, // Gán Promotion[]
      updated_at: Math.floor(Date.now() / 1000)
    };

    await this.repository.update(id, updateData);
    return await this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected > 0;
  }

  async updateStatus(
    id: string,
    {
      status,
      tracking_info
    }: { status: OrderStatus; tracking_info: OrderTrackingInfo }
  ): Promise<Order> {
    await this.repository.update(id, {
      status,
      tracking_info,
      updated_at: Math.floor(Date.now() / 1000)
    });
    return this.findById(id);
  }

  async updateTrackingInfo(
    id: string,
    tracking_info: OrderTrackingInfo
  ): Promise<Order> {
    await this.repository.update(id, {
      tracking_info,
      updated_at: Math.floor(Date.now() / 1000)
    });
    return this.findById(id);
  }

  async updateDriverTips(id: string, driver_tips: number): Promise<Order> {
    await this.repository.update(id, {
      driver_tips,
      updated_at: Math.floor(Date.now() / 1000)
    });
    return this.findById(id);
  }
}
