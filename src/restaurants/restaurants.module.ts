import { Module } from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { RestaurantsController } from './restaurants.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { RestaurantSchema } from './restaurants.schema';
import { UserSchema } from 'src/user/user.schema';
import { UserModule } from 'src/user/user.module';
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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Restaurant', schema: RestaurantSchema },
    ]),
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),
    UserModule,
    MongooseModule.forFeature([{ name: 'MenuItem', schema: MenuItemSchema }]),
    MongooseModule.forFeature([
      { name: 'MenuItemVariant', schema: MenuItemVariantSchema },
    ]),
    PromotionsModule,
    MongooseModule.forFeature([
      { name: 'AddressBook', schema: AddressBookSchema },
    ]),
    MongooseModule.forFeature([
      { name: 'FoodCategory', schema: FoodCategorySchema },
    ]),
    FoodCategoriesModule,
    MongooseModule.forFeature([{ name: 'Promotion', schema: PromotionSchema }]),
    PromotionsModule,
    AddressBook,
    FoodCategoriesModule,
  ],
  controllers: [RestaurantsController],
  providers: [
    RestaurantsService,
    MenuItemsService,
    MenuItemVariantsService,
    RestaurantsGateway, // Add RestaurantsGateway to providers
  ],
  exports: [RestaurantsService, RestaurantsGateway],
})
export class RestaurantsModule {}
