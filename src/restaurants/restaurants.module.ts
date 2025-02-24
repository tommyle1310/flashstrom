import { forwardRef, Module } from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { RestaurantsController } from './restaurants.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { RestaurantSchema } from './restaurants.schema';
import { UsersModule } from 'src/users/users.module';
import { PromotionsModule } from 'src/promotions/promotions.module';
import { AddressBookSchema } from 'src/address_book/address_book.schema';
import { AddressBook } from 'src/address_book/address_book.module';
import { MenuItemsService } from 'src/menu_items/menu_items.service';
import { MenuItemSchema } from 'src/menu_items/menu_items.schema';
import { MenuItemsModule } from 'src/menu_items/menu_items.module';
import { FoodCategoriesModule } from 'src/food_categories/food_categories.module';
import { FoodCategorySchema } from 'src/food_categories/food_categories.schema';
import { PromotionSchema } from 'src/promotions/promotions.schema';
import { MenuItemVariantsService } from 'src/menu_item_variants/menu_item_variants.service';
import { MenuItemVariantSchema } from 'src/menu_item_variants/menu_item_variants.schema';
import { MenuItemVariantsModule } from 'src/menu_item_variants/menu_item_variants.module';
import { RestaurantsGateway } from './restaurants.gateway';
import { DriverSchema } from 'src/drivers/drivers.schema';
import { DriversModule } from 'src/drivers/drivers.module';
import { OrdersModule } from 'src/orders/orders.module';
import { OrderSchema } from 'src/orders/orders.schema';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { UserRepository } from 'src/users/users.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Restaurant', schema: RestaurantSchema },
      { name: 'Driver', schema: DriverSchema },
      { name: 'MenuItem', schema: MenuItemSchema },
      { name: 'MenuItemVariant', schema: MenuItemVariantSchema },
      { name: 'AddressBook', schema: AddressBookSchema },
      { name: 'FoodCategory', schema: FoodCategorySchema },
      { name: 'Promotion', schema: PromotionSchema },
      { name: 'Order', schema: OrderSchema }
    ]),
    TypeOrmModule.forFeature([User]),
    UsersModule,
    forwardRef(() => DriversModule),
    MenuItemsModule,
    PromotionsModule,
    AddressBook,
    FoodCategoriesModule,
    forwardRef(() => OrdersModule),
    MenuItemVariantsModule
  ],
  controllers: [RestaurantsController],
  providers: [
    RestaurantsService,
    MenuItemsService,
    MenuItemVariantsService,
    RestaurantsGateway,
    UserRepository
  ],
  exports: [RestaurantsService, RestaurantsGateway]
})
export class RestaurantsModule {}
