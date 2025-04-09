import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationsRepository } from './notifications.repository';
import { Admin } from 'src/admin/entities/admin.entity';
import { AdminRepository } from 'src/admin/admin.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, Admin])],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsRepository, AdminRepository]
})
export class NotificationsModule {}
