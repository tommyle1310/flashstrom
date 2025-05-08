import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FchatGateway } from './fchat.gateway';
import { FchatService } from './fchat.service';
import { Message } from './entities/message.entity';
import { ChatRoom } from './entities/chat-room.entity';
import { User } from 'src/users/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { UserRepository } from 'src/users/users.repository';
import { Customer } from 'src/customers/entities/customer.entity';
import { Driver } from 'src/drivers/entities/driver.entity';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { CustomerCare } from 'src/customer_cares/entities/customer_care.entity';
import { RedisService } from 'src/redis/redis.service';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Message,
      ChatRoom,
      User,
      Customer,
      Driver,
      Restaurant,
      CustomerCare
    ])
  ],
  providers: [
    FchatGateway,
    FchatService,
    JwtService,
    UsersService,
    RedisService,
    UserRepository
  ],
  exports: [FchatService]
})
export class FchatModule {}
