import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { CustomersModule } from 'src/customers/customers.module';
import { DriversModule } from 'src/drivers/drivers.module';
import { RestaurantsModule } from 'src/restaurants/restaurants.module';
import { UserModule } from 'src/user/user.module';
import { PromotionsModule } from 'src/promotions/promotions.module';
import { CustomerSchema } from 'src/customers/customer.schema';
import { DriverSchema } from 'src/drivers/drivers.schema';
import { RestaurantSchema } from 'src/restaurants/restaurants.schema';
import { UserSchema } from 'src/user/user.schema';
import { RestaurantsService } from 'src/restaurants/restaurants.service';
import { DriversService } from 'src/drivers/drivers.service';
import { CustomersService } from 'src/customers/customers.service';
import { AddressBookSchema } from 'src/address_book/address_book.schema';
import { AddressBook } from 'src/address_book/address_book.module';
import { MenuItemsModule } from 'src/menu_items/menu_items.module'; // Import MenuItemsModule
import { MenuItemsService } from 'src/menu_items/menu_items.service';
import { MenuItemSchema } from 'src/menu_items/menu_items.schema';
import { FoodCategorySchema } from 'src/food_categories/food_categories.schema';
import { FoodCategoriesModule } from 'src/food_categories/food_categories.module';
import { MenuItemVariantsModule } from 'src/menu_item_variants/menu_item_variants.module'; // Import MenuItemVariantsModule

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'AddressBook', schema: AddressBookSchema },
    ]),
    AddressBook,
    MongooseModule.forFeature([{ name: 'Customer', schema: CustomerSchema }]),
    CustomersModule,
    MongooseModule.forFeature([{ name: 'Driver', schema: DriverSchema }]),
    DriversModule,
    MongooseModule.forFeature([
      { name: 'Restaurant', schema: RestaurantSchema },
    ]),
    RestaurantsModule,
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),
    UserModule,
    PromotionsModule,
    MongooseModule.forFeature([{ name: 'MenuItem', schema: MenuItemSchema }]),
    MenuItemsModule, // Import MenuItemsModule here
    MongooseModule.forFeature([
      { name: 'FoodCategory', schema: FoodCategorySchema },
    ]),
    FoodCategoriesModule, // Import FoodCategorysModule here
    MenuItemVariantsModule, // Import MenuItemVariantsModule here
  ],
  controllers: [UploadController],
  providers: [
    UploadService,
    RestaurantsService,
    DriversService,
    MenuItemsService,
    CustomersService,
  ],
})
export class UploadModule {}
