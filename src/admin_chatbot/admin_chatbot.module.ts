import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AdminChatbotService } from './admin_chatbot.service';
import { AdminChatbotGateway } from './admin_chatbot.gateway';
import { DataSeedingService } from './data-seeding.service';
import { StartupService } from './startup.service';
import { ChatbotResponse } from './entities/chatbot_response.entity';
import { ChatbotGuide } from './entities/chatbot_guide.entity';
import { FAQ } from '../faq/entities/faq.entity';
import { FinanceRule } from '../finance_rules/entities/finance_rule.entity';
import { Order } from '../orders/entities/order.entity';
import { Customer } from '../customers/entities/customer.entity';
import { RedisService } from '../redis/redis.service';
import { AdminChatbotController } from './admin_chatbot.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatbotResponse,
      ChatbotGuide,
      FAQ,
      FinanceRule,
      Order,
      Customer
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '1h' }
    })
  ],
  controllers: [AdminChatbotController],
  providers: [
    AdminChatbotService,
    AdminChatbotGateway,
    DataSeedingService,
    StartupService,
    RedisService
  ],
  exports: [AdminChatbotService, DataSeedingService]
})
export class AdminChatbotModule {}
