import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { RestaurantsService } from './restaurants.service';
import { RestaurantsController } from './restaurants.controller';
import { Restaurant } from './entities/restaurant.entity';
import { RestaurantsRepository } from './restaurants.repository';
import { RestaurantsGateway } from './restaurants.gateway';
import { DriversModule } from 'src/drivers/drivers.module';
import { OrdersModule } from 'src/orders/orders.module';
import { MenuItemsModule } from 'src/menu_items/menu_items.module';
import { MenuItemVariantsModule } from 'src/menu_item_variants/menu_item_variants.module';
import { UsersModule } from 'src/users/users.module';
import { PromotionsModule } from 'src/promotions/promotions.module';
import { FoodCategoriesModule } from 'src/food_categories/food_categories.module';
import { AddressBookModule } from 'src/address_book/address_book.module';
import { AddressBook } from 'src/address_book/entities/address_book.entity';
import { AddressBookRepository } from 'src/address_book/address_book.repository';
import { FoodCategory } from 'src/food_categories/entities/food_category.entity';
import { FoodCategoriesRepository } from 'src/food_categories/food_categories.repository';
import { OrderSchema } from 'src/orders/orders.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Order', schema: OrderSchema }]),
    TypeOrmModule.forFeature([Restaurant, AddressBook, FoodCategory]),
    UsersModule,
    AddressBookModule,
    forwardRef(() => DriversModule),
    forwardRef(() => OrdersModule),
    forwardRef(() => MenuItemsModule),
    forwardRef(() => MenuItemVariantsModule),
    PromotionsModule,
    FoodCategoriesModule
  ],
  controllers: [RestaurantsController],
  providers: [
    RestaurantsService,
    RestaurantsRepository,
    RestaurantsGateway,
    AddressBookRepository,
    FoodCategoriesRepository
  ],
  exports: [
    RestaurantsService,
    RestaurantsGateway,
    RestaurantsRepository,
    AddressBookRepository
  ]
})
export class RestaurantsModule {}
