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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Driver,
      AddressBook,
      Order,
      Promotion,
      DriverProgressStage
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
    AddressBookRepository,
    DriverProgressStagesRepository,
    PromotionsRepository,
    JwtService
  ],
  exports: [DriversService, DriversRepository]
})
export class DriversModule {}
