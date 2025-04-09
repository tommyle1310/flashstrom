import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationsRepository {
  constructor(
    @InjectRepository(Notification)
    private notificationEntityRepository: Repository<Notification>
  ) {}

  async findById(id: string): Promise<Notification> {
    return await this.notificationEntityRepository.findOne({
      where: { id },
      relations: ['created_by']
    });
  }

  async findAll(): Promise<Notification[]> {
    return await this.notificationEntityRepository.find({
      order: { created_at: 'DESC' },
      relations: ['created_by']
    });
  }

  async create(createNotificationDto: any): Promise<any> {
    const notification = this.notificationEntityRepository.create(
      createNotificationDto
    );
    return await this.notificationEntityRepository.save(notification);
  }

  async update(id: string, updateNotificationDto: any): Promise<Notification> {
    await this.notificationEntityRepository.update(id, updateNotificationDto);
    return await this.findById(id);
  }

  async remove(id: string): Promise<Notification> {
    const notification = await this.findById(id);
    if (notification) {
      await this.notificationEntityRepository.delete(id);
    }
    return notification;
  }
}
