import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { FchatGateway } from './fchat.gateway';
import { FchatService } from './fchat.service';
import { AdminChatService } from './admin-chat.service';
import { AdminChatGateway } from './admin-chat.gateway';
import { ChatbotService } from './chatbot.service';
import { SupportChatService } from './support-chat.service';
import { Message } from './entities/message.entity';
import { ChatRoom } from './entities/chat-room.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Driver } from '../drivers/entities/driver.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';
import { CustomerCare } from '../customer_cares/entities/customer_care.entity';
import { Admin } from '../admin/entities/admin.entity';
import { Order } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';
import { RedisService } from '../redis/redis.service';
import { AdminModule } from 'src/admin/admin.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Message,
      ChatRoom,
      Customer,
      Driver,
      Restaurant,
      CustomerCare,
      Admin,
      Order,
      User
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'fallback-secret',
      signOptions: { expiresIn: '24h' }
    }),
    UsersModule,
    AdminModule
  ],
  providers: [
    FchatGateway,
    AdminChatGateway,
    FchatService,
    AdminChatService,
    ChatbotService,
    SupportChatService,
    RedisService
  ],
  exports: [FchatService, AdminChatService, ChatbotService, SupportChatService]
})
export class FchatModule {}
