import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DriversService } from './drivers.service';
import { DriversController } from './drivers.controller';
import { DriversGateway } from './drivers.gateway';
import { Driver } from './entities/driver.entity';
import { DriversRepository } from './drivers.repository';
import { AddressBookRepository } from 'src/address_book/address_book.repository';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { OrdersModule } from '../orders/orders.module';
import { DriverProgressStagesModule } from '../driver_progress_stages/driver_progress_stages.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AddressBook } from 'src/address_book/entities/address_book.entity';
import { OrdersRepository } from 'src/orders/orders.repository';
import { Order } from 'src/orders/entities/order.entity';
import { JwtService } from '@nestjs/jwt';
import { PromotionsRepository } from 'src/promotions/promotions.repository';
import { Promotion } from 'src/promotions/entities/promotion.entity';
import { DriverProgressStage } from 'src/driver_progress_stages/entities/driver_progress_stage.entity';
import { DriverProgressStagesRepository } from 'src/driver_progress_stages/driver_progress_stages.repository';
import { OnlineSession } from 'src/online-sessions/entities/online-session.entity';
import { OnlineSessionsRepository } from 'src/online-sessions/online-session.repository';
import { OnlineSessionsService } from 'src/online-sessions/online-sessions.service';
import { DriverStatsService } from 'src/driver_stats_records/driver_stats_records.service';
import { DriverStatsRecord } from 'src/driver_stats_records/entities/driver_stats_record.entity';
import { RatingsReview } from 'src/ratings_reviews/entities/ratings_review.entity';
import { RatingsReviewsRepository } from 'src/ratings_reviews/ratings_reviews.repository';
import { FinanceRulesRepository } from 'src/finance_rules/finance_rules.repository';
import { FinanceRule } from 'src/finance_rules/entities/finance_rule.entity';
import { FinanceRulesService } from 'src/finance_rules/finance_rules.service';
import { AdminRepository } from 'src/admin/admin.repository';
import { Admin } from 'src/admin/entities/admin.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Driver,
      AddressBook,
      Order,
      Promotion,
      DriverProgressStage,
      Admin,
      OnlineSession,
      FinanceRule,
      DriverStatsRecord,
      RatingsReview
    ]),
    forwardRef(() => RestaurantsModule),
    forwardRef(() => OrdersModule),
    DriverProgressStagesModule,
    EventEmitterModule.forRoot()
  ],
  controllers: [DriversController],
  providers: [
    DriversService,
    DriversGateway,
    OrdersRepository,
    DriversRepository,
    OnlineSessionsService,
    RatingsReviewsRepository,
    OnlineSessionsRepository,
    FinanceRulesRepository,
    FinanceRulesService,
    AdminRepository,
    AddressBookRepository,
    DriverProgressStagesRepository,
    PromotionsRepository,
    JwtService,
    DriverStatsService
  ],
  exports: [DriversService, DriversRepository]
})
export class DriversModule {}
