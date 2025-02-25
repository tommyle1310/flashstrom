import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { CustomersModule } from 'src/customers/customers.module';
import { DriversModule } from 'src/drivers/drivers.module';
import { RestaurantsModule } from 'src/restaurants/restaurants.module';
// import { PromotionsModule } from 'src/promotions/promotions.module';
import { CustomerSchema } from 'src/customers/customer.schema';
import { DriverSchema } from 'src/drivers/drivers.schema';
import { RestaurantsService } from 'src/restaurants/restaurants.service';
import { DriversService } from 'src/drivers/drivers.service';
import { CustomersService } from 'src/customers/customers.service';
import { MenuItemsModule } from 'src/menu_items/menu_items.module';
import { MenuItemsService } from 'src/menu_items/menu_items.service';
import { MenuItemSchema } from 'src/menu_items/menu_items.schema';
import { FoodCategoriesModule } from 'src/food_categories/food_categories.module';
import { MenuItemVariantsModule } from 'src/menu_item_variants/menu_item_variants.module';
import { OrderSchema } from 'src/orders/orders.schema';
import { OrdersModule } from 'src/orders/orders.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { UserRepository } from 'src/users/users.repository';
import { PromotionsService } from 'src/promotions/promotions.service';
import { PromotionsRepository } from 'src/promotions/promotions.repository';
import { Promotion } from 'src/promotions/entities/promotion.entity';
import { MenuItemVariantSchema } from 'src/menu_item_variants/menu_item_variants.schema';
import { AddressBook } from 'src/address_book/entities/address_book.entity';
import { AddressBookRepository } from 'src/address_book/address_book.repository';
import { FoodCategory } from 'src/food_categories/entities/food_category.entity';
import { FoodCategoriesRepository } from 'src/food_categories/food_categories.repository';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { RestaurantsRepository } from 'src/restaurants/restaurants.repository';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Order', schema: OrderSchema },
      { name: 'Customer', schema: CustomerSchema },
      { name: 'Driver', schema: DriverSchema },
      { name: 'MenuItem', schema: MenuItemSchema },
      { name: 'MenuItemVariant', schema: MenuItemVariantSchema }
    ]),
    TypeOrmModule.forFeature([
      User,
      Promotion,
      AddressBook,
      FoodCategory,
      Restaurant
    ]),
    CustomersModule,
    DriversModule,
    RestaurantsModule,
    MenuItemsModule,
    FoodCategoriesModule,
    MenuItemVariantsModule,
    OrdersModule
  ],
  controllers: [UploadController],
  providers: [
    UploadService,
    RestaurantsService,
    DriversService,
    MenuItemsService,
    CustomersService,
    UserRepository,
    PromotionsService,
    PromotionsRepository,
    AddressBookRepository,
    FoodCategoriesRepository,
    RestaurantsRepository
  ]
})
export class UploadModule {}
