import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationsRepository } from './notifications.repository';
import { Admin } from 'src/admin/entities/admin.entity';
import { AdminRepository } from 'src/admin/admin.repository';
import { User } from 'src/users/entities/user.entity';
import { UserRepository } from 'src/users/users.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, Admin, User])],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsRepository,
    UserRepository,
    AdminRepository
  ]
})
export class NotificationsModule {}
