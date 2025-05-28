import { Module } from '@nestjs/common';
import { FinanceRulesService } from './finance_rules.service';
import { FinanceRulesController } from './finance_rules.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinanceRule } from './entities/finance_rule.entity';
import { FinanceRulesRepository } from './finance_rules.repository';
import { DriversRepository } from 'src/drivers/drivers.repository';
import { Driver } from 'src/drivers/entities/driver.entity';
import { Admin } from 'src/admin/entities/admin.entity';
import { AdminRepository } from 'src/admin/admin.repository';
import { Order } from 'src/orders/entities/order.entity';
import { OrdersRepository } from 'src/orders/orders.repository';
import { Promotion } from 'src/promotions/entities/promotion.entity';
import { PromotionsRepository } from 'src/promotions/promotions.repository';
import { UserRepository } from 'src/users/users.repository';
import { User } from 'src/users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FinanceRule,
      Driver,
      Admin,
      Order,
      User,
      Promotion
    ])
  ],
  controllers: [FinanceRulesController],
  providers: [
    FinanceRulesService,
    FinanceRulesRepository,
    DriversRepository,
    OrdersRepository,
    PromotionsRepository,
    AdminRepository,
    UserRepository
  ]
})
export class FinanceRulesModule {}
