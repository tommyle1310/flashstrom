import { forwardRef, Module } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { DriversController } from './drivers.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DriverSchema } from './drivers.schema';
import { User } from '../users/entities/user.entity';
import { DriversGateway } from './drivers.gateway';
import { AddressBookService } from 'src/address_book/address_book.service';
import { CustomerSchema } from 'src/customers/customer.schema';
import { RestaurantSchema } from 'src/restaurants/restaurants.schema';
import { RestaurantsModule } from 'src/restaurants/restaurants.module';
import { OrdersModule } from 'src/orders/orders.module';
import { OrdersGateway } from 'src/orders/orders.gateway';
import { RestaurantsGateway } from 'src/restaurants/restaurants.gateway';
import { DriverProgressStagesModule } from 'src/driver_progress_stages/driver_progress_stages.module';
import { AddressBook } from 'src/address_book/entities/address_book.entity';
import { AddressBookRepository } from 'src/address_book/address_book.repository';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Driver', schema: DriverSchema },
      { name: 'Restaurant', schema: RestaurantSchema },
      { name: 'Customer', schema: CustomerSchema }
    ]),
    TypeOrmModule.forFeature([User, AddressBook]),
    forwardRef(() => RestaurantsModule),
    forwardRef(() => OrdersModule),
    DriverProgressStagesModule
  ],
  controllers: [DriversController],
  providers: [
    DriversService,
    DriversGateway,
    AddressBookService,
    RestaurantsGateway,
    OrdersGateway,
    AddressBookRepository
  ],
  exports: [DriversService, DriversGateway]
})
export class DriversModule {}
