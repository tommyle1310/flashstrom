import { Injectable } from '@nestjs/common';
import { Repository, DeepPartial } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Order, OrderStatus, OrderTrackingInfo } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersRepository {
  constructor(
    @InjectRepository(Order)
    private repository: Repository<Order>
  ) {}

  async create(createDto: CreateOrderDto): Promise<Order> {
    // Vouchers are handled by VouchersService, not in repository
    // The vouchers_applied field will be populated by the service layer
    const orderData: DeepPartial<Order> = {
      customer_id: createDto.customer_id,
      restaurant_id: createDto.restaurant_id,
      payment_method: createDto.payment_method,
      payment_status: createDto.payment_status,
      customer_location: createDto.customer_location,
      restaurant_location: createDto.restaurant_location,
      customer_note: createDto.customer_note,
      restaurant_note: createDto.restaurant_note,
      delivery_time: createDto.delivery_time,
      total_amount: createDto.total_amount,
      delivery_fee: createDto.delivery_fee,
      service_fee: createDto.service_fee,
      sub_total: createDto.sub_total,
      discount_amount: createDto.discount_amount,
      order_items: createDto.order_items,
      status: createDto.status as OrderStatus,
      tracking_info: createDto.tracking_info as OrderTrackingInfo,
      order_time: createDto.order_time,
      vouchers_applied: [] // Will be populated by service layer
    };

    const order = this.repository.create(orderData);
    return await this.repository.save(order);
  }

  async findAll(): Promise<Order[]> {
    return await this.repository.find();
  }

  async findById(id: string): Promise<Order> {
    const result = await this.repository.findOne({
      where: { id },
      relations: ['restaurantAddress', 'customerAddress'],
      cache: false // Disable caching to ensure fresh data
    });
    return result;
  }

  async findOne(conditions: object): Promise<Order> {
    return await this.repository.findOne({ where: conditions });
  }

  async update(id: string, updateDto: any): Promise<Order> {
    // Lấy order hiện tại để kiểm tra sự tồn tại
    const existingOrder = await this.findById(id);
    if (!existingOrder) {
      throw new Error('Order not found');
    }

    // Lọc các trường đơn giản để cập nhật
    const updateData: Partial<Order> = {
      status: updateDto.status ? (updateDto.status as OrderStatus) : undefined,
      tracking_info: updateDto.tracking_info
        ? (updateDto.tracking_info as OrderTrackingInfo)
        : undefined,
      driver_id: updateDto.driver_id,
      distance: updateDto.distance,
      updated_at: Math.floor(Date.now() / 1000)
    };

    // Xóa các trường undefined để tránh ghi đè không mong muốn
    Object.keys(updateData).forEach(
      key => updateData[key] === undefined && delete updateData[key]
    );

    // Cập nhật các trường đơn giản
    await this.repository
      .createQueryBuilder()
      .update(Order)
      .set(updateData)
      .where('id = :id', { id })
      .execute();

    // Note: Voucher updates should be handled separately via VouchersService
    // This repository only handles basic order field updates

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

  async findAllPaginated(
    skip: number,
    limit: number
  ): Promise<[Order[], number]> {
    return await this.repository.findAndCount({
      skip,
      take: limit,
      relations: ['customer', 'restaurant', 'driver']
    });
  }
}
