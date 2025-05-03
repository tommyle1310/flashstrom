import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationsRepository } from './notifications.repository';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { createResponse, ApiResponse } from 'src/utils/createResponse';
import { AdminRepository } from 'src/admin/admin.repository';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly adminRepository: AdminRepository,
    @InjectRepository(Notification)
    private notificationEntityRepository: Repository<Notification>
  ) {}

  async create(
    createNotificationDto: CreateNotificationDto
  ): Promise<ApiResponse<Notification>> {
    try {
      const admin = await this.adminRepository.findById(
        createNotificationDto.created_by_id
      );
      if (!admin) {
        return createResponse(
          'NotFound',
          null,
          `Admin with ID ${createNotificationDto.created_by_id} not found`
        );
      }

      const newNotification = await this.notificationsRepository.create(
        createNotificationDto
      );
      return createResponse(
        'OK',
        newNotification,
        'Notification created successfully'
      );
    } catch (error: any) {
      return this.handleError('Error creating notification:', error);
    }
  }

  async findAll(): Promise<ApiResponse<Notification[]>> {
    try {
      const notifications = await this.notificationsRepository.findAll();
      return createResponse('OK', notifications, 'Fetched all notifications');
    } catch (error: any) {
      return this.handleError('Error fetching notifications:', error);
    }
  }

  async findOne(id: string): Promise<ApiResponse<Notification>> {
    try {
      const notification = await this.notificationsRepository.findById(id);
      return this.handleNotificationResponse(notification);
    } catch (error: any) {
      return this.handleError('Error fetching notification:', error);
    }
  }

  async update(
    id: string,
    updateNotificationDto: UpdateNotificationDto
  ): Promise<ApiResponse<Notification>> {
    try {
      const notification = await this.notificationsRepository.findById(id);
      if (!notification) {
        return createResponse('NotFound', null, 'Notification not found');
      }

      const updatedNotification = await this.notificationsRepository.update(
        id,
        updateNotificationDto
      );
      return createResponse(
        'OK',
        updatedNotification,
        'Notification updated successfully'
      );
    } catch (error: any) {
      return this.handleError('Error updating notification:', error);
    }
  }

  async remove(id: string): Promise<ApiResponse<null>> {
    try {
      const deletedNotification = await this.notificationsRepository.remove(id);
      if (!deletedNotification) {
        return createResponse('NotFound', null, 'Notification not found');
      }
      return createResponse('OK', null, 'Notification deleted successfully');
    } catch (error: any) {
      return this.handleError('Error deleting notification:', error);
    }
  }

  private handleNotificationResponse(
    notification: Notification | null
  ): ApiResponse<Notification> {
    if (!notification) {
      return createResponse('NotFound', null, 'Notification not found');
    }
    return createResponse(
      'OK',
      notification,
      'Notification retrieved successfully'
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

  async broadcast(
    broadcastNotificationDto: BroadcastNotificationDto
  ): Promise<ApiResponse<Notification[]>> {
    try {
      const admin = await this.adminRepository.findById(
        broadcastNotificationDto.created_by_id
      );
      if (!admin) {
        return createResponse(
          'NotFound',
          null,
          `Admin with ID ${broadcastNotificationDto.created_by_id} not found`
        );
      }

      const notifications: Notification[] = [];
      const { target_user, content, created_by_id } = broadcastNotificationDto;

      for (const target of target_user) {
        const targetContent = content[target.toLowerCase()]; // Lấy nội dung theo target_user (e.g., "customer", "restaurant")

        if (!targetContent) {
          return createResponse(
            'MissingInput',
            null,
            `Missing content for target_user: ${target}`
          );
        }

        const notificationData = {
          avatar: targetContent.avatar,
          title: targetContent.title,
          desc: targetContent.desc,
          image: targetContent.image || null,
          link: targetContent.link || null,
          target_user: [target], // Chỉ gửi cho từng nhóm cụ thể
          created_by_id,
          target_user_id: null // Không nhắm đến user cụ thể
        };

        const newNotification =
          await this.notificationsRepository.create(notificationData);
        notifications.push(newNotification);
      }

      return createResponse(
        'OK',
        notifications,
        'Broadcast notifications created successfully'
      );
    } catch (error: any) {
      return this.handleError('Error broadcasting notifications:', error);
    }
  }

  async findAllPaginated(
    page: number = 1,
    limit: number = 10
  ): Promise<
    ApiResponse<{
      totalPages: number;
      currentPage: number;
      totalItems: number;
      items: Notification[];
    }>
  > {
    try {
      const skip = (page - 1) * limit;
      const [notifications, total] =
        await this.notificationsRepository.findAllPaginated(skip, limit);
      const totalPages = Math.ceil(total / limit);

      return createResponse(
        'OK',
        {
          totalPages,
          currentPage: page,
          totalItems: total,
          items: notifications
        },
        'Fetched paginated notifications'
      );
    } catch (error: any) {
      console.error('Error fetching paginated notifications:', error);
      return createResponse(
        'ServerError',
        null,
        'Error fetching paginated notifications'
      );
    }
  }
}
