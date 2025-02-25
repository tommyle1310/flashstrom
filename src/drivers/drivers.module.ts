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
import { RestaurantsModule } from 'src/restaurants/restaurants.module';
import { OrdersModule } from 'src/orders/orders.module';
import { OrdersGateway } from 'src/orders/orders.gateway';
import { RestaurantsGateway } from 'src/restaurants/restaurants.gateway';
import { DriverProgressStagesModule } from 'src/driver_progress_stages/driver_progress_stages.module';
import { AddressBook } from 'src/address_book/entities/address_book.entity';
import { AddressBookRepository } from 'src/address_book/address_book.repository';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { RestaurantsRepository } from 'src/restaurants/restaurants.repository';
import { FoodCategory } from 'src/food_categories/entities/food_category.entity';
import { FoodCategoriesModule } from 'src/food_categories/food_categories.module';
import { FoodCategoriesRepository } from 'src/food_categories/food_categories.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Driver', schema: DriverSchema },
      { name: 'Customer', schema: CustomerSchema }
    ]),
    TypeOrmModule.forFeature([User, AddressBook, Restaurant, FoodCategory]),
    forwardRef(() => RestaurantsModule),
    forwardRef(() => OrdersModule),
    DriverProgressStagesModule,
    FoodCategoriesModule
  ],
  controllers: [DriversController],
  providers: [
    DriversService,
    DriversGateway,
    AddressBookService,
    RestaurantsGateway,
    OrdersGateway,
    AddressBookRepository,
    RestaurantsRepository,
    FoodCategoriesRepository
  ],
  exports: [DriversService, DriversGateway]
})
export class DriversModule {}
