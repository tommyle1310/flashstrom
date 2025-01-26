import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MenuItemSchema } from './menu_items.schema';
import { FoodCategorySchema } from 'src/food_categories/food_categories.schema';
import { FoodCategoriesModule } from 'src/food_categories/food_categories.module';
import { MenuItemsController } from './menu_items.controller';
import { MenuItemsService } from './menu_items.service';
import { RestaurantSchema } from 'src/restaurants/restaurants.schema';
import { RestaurantsModule } from 'src/restaurants/restaurants.module';
import { MenuItemVariantSchema } from 'src/menu_item_variants/menu_item_variants.schema';
import { MenuItemVariantsModule } from 'src/menu_item_variants/menu_item_variants.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'MenuItem', schema: MenuItemSchema }]),
    MongooseModule.forFeature([
      { name: 'FoodCategory', schema: FoodCategorySchema },
    ]),
    FoodCategoriesModule,
    MongooseModule.forFeature([
      { name: 'Restaurant', schema: RestaurantSchema },
    ]),
    RestaurantsModule,
    MongooseModule.forFeature([
      { name: 'MenuItemVariant', schema: MenuItemVariantSchema },
    ]),
    forwardRef(() => MenuItemVariantsModule), // ForwardRef to break circular dependency
  ],
  controllers: [MenuItemsController],
  providers: [MenuItemsService],
  exports: [MenuItemsService],
})
export class MenuItemsModule {}
