import { Module } from '@nestjs/common';
import { PenaltiesService } from './penalties.service';
import { PenaltiesController } from './penalties.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Penalty } from './entities/penalty.entity';
import { PenaltiesRepository } from './penalties.repository';
import { AdminRepository } from 'src/admin/admin.repository';
import { Admin } from 'src/admin/entities/admin.entity';
import { PenaltyRule } from 'src/penalty-rules/entities/penalty-rule.entity';
import { PenaltyRulesRepository } from 'src/penalty-rules/penalty-rules.repository';
import { Driver } from 'src/drivers/entities/driver.entity';
import { DriversRepository } from 'src/drivers/drivers.repository';
import { Order } from 'src/orders/entities/order.entity';
import { OrdersRepository } from 'src/orders/orders.repository';
import { PromotionsRepository } from 'src/promotions/promotions.repository';
import { Promotion } from 'src/promotions/entities/promotion.entity';
import { User } from 'src/users/entities/user.entity';
import { UserRepository } from 'src/users/users.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Penalty,
      Admin,
      PenaltyRule,
      Driver,
      User,
      Order,
      Promotion
    ])
  ],
  controllers: [PenaltiesController],
  providers: [
    PenaltiesService,
    PenaltiesRepository,
    AdminRepository,
    PenaltyRulesRepository,
    DriversRepository,
    PromotionsRepository,
    OrdersRepository,
    UserRepository
  ]
})
export class PenaltiesModule {}
