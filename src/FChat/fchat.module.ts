import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { FchatGateway } from './fchat.gateway';
import { FchatService } from './fchat.service';
import { ChatbotService } from './chatbot.service';
import { SupportChatService } from './support-chat.service';
import { Message } from './entities/message.entity';
import { ChatRoom } from './entities/chat-room.entity';
import { Customer } from 'src/customers/entities/customer.entity';
import { Driver } from 'src/drivers/entities/driver.entity';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { CustomerCare } from 'src/customer_cares/entities/customer_care.entity';
import { User } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/users.service';
import { RedisService } from 'src/redis/redis.service';
import { UserRepository } from 'src/users/users.repository';
import { AdminRepository } from 'src/admin/admin.repository';
import { Admin } from 'src/admin/entities/admin.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Message,
      ChatRoom,
      Customer,
      Driver,
      Restaurant,
      CustomerCare,
      User,
      Admin
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret',
      signOptions: { expiresIn: '24h' }
    }),
    EventEmitterModule.forRoot({
      global: true,
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false
    })
  ],
  providers: [
    FchatGateway,
    FchatService,
    ChatbotService,
    SupportChatService,
    UsersService,
    RedisService,
    UserRepository,
    AdminRepository
  ],
  exports: [FchatService, ChatbotService, SupportChatService]
})
export class FchatModule {}
