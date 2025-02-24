import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { CustomersModule } from 'src/customers/customers.module';
import { DriversModule } from 'src/drivers/drivers.module';
import { RestaurantsModule } from 'src/restaurants/restaurants.module';
import { PromotionsModule } from 'src/promotions/promotions.module';
import { CustomerSchema } from 'src/customers/customer.schema';
import { DriverSchema } from 'src/drivers/drivers.schema';
import { RestaurantSchema } from 'src/restaurants/restaurants.schema';
import { RestaurantsService } from 'src/restaurants/restaurants.service';
import { DriversService } from 'src/drivers/drivers.service';
import { CustomersService } from 'src/customers/customers.service';
import { AddressBookSchema } from 'src/address_book/address_book.schema';
import { AddressBook } from 'src/address_book/address_book.module';
import { MenuItemsModule } from 'src/menu_items/menu_items.module';
import { MenuItemsService } from 'src/menu_items/menu_items.service';
import { MenuItemSchema } from 'src/menu_items/menu_items.schema';
import { FoodCategorySchema } from 'src/food_categories/food_categories.schema';
import { FoodCategoriesModule } from 'src/food_categories/food_categories.module';
import { MenuItemVariantsModule } from 'src/menu_item_variants/menu_item_variants.module';
import { OrderSchema } from 'src/orders/orders.schema';
import { OrdersModule } from 'src/orders/orders.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { UserRepository } from 'src/users/users.repository';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'AddressBook', schema: AddressBookSchema },
      { name: 'Order', schema: OrderSchema },
      { name: 'Customer', schema: CustomerSchema },
      { name: 'Driver', schema: DriverSchema },
      { name: 'Restaurant', schema: RestaurantSchema },
      { name: 'MenuItem', schema: MenuItemSchema },
      { name: 'FoodCategory', schema: FoodCategorySchema }
    ]),
    TypeOrmModule.forFeature([User]),
    AddressBook,
    CustomersModule,
    DriversModule,
    RestaurantsModule,
    PromotionsModule,
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
    UserRepository
  ]
})
export class UploadModule {}
