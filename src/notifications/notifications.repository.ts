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

  async findAll(options?: any): Promise<Notification[]> {
    return await this.notificationEntityRepository.find({
      ...options,
      order: { created_at: 'DESC' }, // Giữ nguyên sắp xếp mặc định
      relations: options?.relations || ['created_by'] // Mặc định populate created_by
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

  async findAllPaginated(
    skip: number,
    limit: number
  ): Promise<[Notification[], number]> {
    return await this.notificationEntityRepository.findAndCount({
      skip,
      take: limit,
      relations: ['user']
    });
  }

  async findBroadcastNotifications(
    targetUser: string
  ): Promise<Notification[]> {
    try {
      // Use raw query to avoid TypeORM hydration issues with array columns
      const rawResults = await this.notificationEntityRepository.query(
        `
        SELECT
          n.id,
          n.avatar,
          n.title,
          n.desc,
          n.image,
          n.link,
          n.target_user,
          n.created_by_id,
          n.is_read,
          n.target_user_id,
          n.created_at,
          n.updated_at,
          a.id as admin_id,
          a.first_name as admin_first_name,
          a.last_name as admin_last_name,
          u.email as admin_email
        FROM notifications n
        LEFT JOIN admins a ON n.created_by_id = a.id
        LEFT JOIN users u ON a.user_id = u.id
        WHERE $1 = ANY(n.target_user)
          AND n.target_user_id IS NULL
        ORDER BY n.created_at DESC
      `,
        [targetUser]
      );

      // Manually map the results to avoid TypeORM hydration issues
      return rawResults.map(row => ({
        id: row.id,
        avatar: row.avatar,
        title: row.title,
        desc: row.desc,
        image: row.image,
        link: row.link,
        target_user: row.target_user,
        created_by_id: row.created_by_id,
        is_read: row.is_read,
        target_user_id: row.target_user_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        created_by: row.admin_id
          ? {
              id: row.admin_id,
              first_name: row.admin_first_name,
              last_name: row.admin_last_name,
              email: row.admin_email
            }
          : null
      })) as Notification[];
    } catch (error) {
      console.error('Error in findBroadcastNotifications:', error);
      // Return empty array instead of throwing to prevent breaking the notification flow
      return [];
    }
  }

  async findSpecificNotifications(
    targetUserId: string
  ): Promise<Notification[]> {
    try {
      // Use raw query to avoid TypeORM hydration issues
      const rawResults = await this.notificationEntityRepository.query(
        `
        SELECT
          n.id,
          n.avatar,
          n.title,
          n.desc,
          n.image,
          n.link,
          n.target_user,
          n.created_by_id,
          n.is_read,
          n.target_user_id,
          n.created_at,
          n.updated_at,
          a.id as admin_id,
          a.first_name as admin_first_name,
          a.last_name as admin_last_name,
          u.email as admin_email
        FROM notifications n
        LEFT JOIN admins a ON n.created_by_id = a.id
        LEFT JOIN users u ON a.user_id = u.id
        WHERE n.target_user_id = $1
        ORDER BY n.created_at DESC
      `,
        [targetUserId]
      );

      // Manually map the results to avoid TypeORM hydration issues
      return rawResults.map(row => ({
        id: row.id,
        avatar: row.avatar,
        title: row.title,
        desc: row.desc,
        image: row.image,
        link: row.link,
        target_user: row.target_user,
        created_by_id: row.created_by_id,
        is_read: row.is_read,
        target_user_id: row.target_user_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        created_by: row.admin_id
          ? {
              id: row.admin_id,
              first_name: row.admin_first_name,
              last_name: row.admin_last_name,
              email: row.admin_email
            }
          : null
      })) as Notification[];
    } catch (error) {
      console.error('Error in findSpecificNotifications:', error);
      // Return empty array instead of throwing to prevent breaking the notification flow
      return [];
    }
  }
}
