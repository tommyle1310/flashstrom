import { forwardRef, Module } from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { RestaurantsController } from './restaurants.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { RestaurantSchema } from './restaurants.schema';
import { UsersModule } from 'src/users/users.module';
import { PromotionsModule } from 'src/promotions/promotions.module';
import { MenuItemsService } from 'src/menu_items/menu_items.service';
import { MenuItemSchema } from 'src/menu_items/menu_items.schema';
import { MenuItemsModule } from 'src/menu_items/menu_items.module';
import { FoodCategoriesModule } from 'src/food_categories/food_categories.module';
import { FoodCategorySchema } from 'src/food_categories/food_categories.schema';
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
import { Promotion } from 'src/promotions/entities/promotion.entity';
import { AddressBook } from 'src/address_book/entities/address_book.entity';
import { AddressBookRepository } from 'src/address_book/address_book.repository';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Restaurant', schema: RestaurantSchema },
      { name: 'Driver', schema: DriverSchema },
      { name: 'MenuItem', schema: MenuItemSchema },
      { name: 'MenuItemVariant', schema: MenuItemVariantSchema },
      { name: 'FoodCategory', schema: FoodCategorySchema },
      { name: 'Order', schema: OrderSchema }
    ]),
    TypeOrmModule.forFeature([User, Promotion, AddressBook]),
    UsersModule,
    forwardRef(() => DriversModule),
    MenuItemsModule,
    PromotionsModule,
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
    UserRepository,
    AddressBookRepository
  ],
  exports: [RestaurantsService, RestaurantsGateway]
})
export class RestaurantsModule {}
