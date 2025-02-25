import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MenuItemSchema } from './menu_items.schema';
import { FoodCategory } from 'src/food_categories/entities/food_category.entity';
import { FoodCategoriesModule } from 'src/food_categories/food_categories.module';
import { MenuItemsController } from './menu_items.controller';
import { MenuItemsService } from './menu_items.service';
import { RestaurantSchema } from 'src/restaurants/restaurants.schema';
import { RestaurantsModule } from 'src/restaurants/restaurants.module';
import { MenuItemVariantSchema } from 'src/menu_item_variants/menu_item_variants.schema';
import { MenuItemVariantsModule } from 'src/menu_item_variants/menu_item_variants.module';
import { FoodCategoriesRepository } from 'src/food_categories/food_categories.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'MenuItem', schema: MenuItemSchema },
      { name: 'Restaurant', schema: RestaurantSchema },
      { name: 'MenuItemVariant', schema: MenuItemVariantSchema }
    ]),
    TypeOrmModule.forFeature([FoodCategory]),
    FoodCategoriesModule,
    forwardRef(() => RestaurantsModule),
    forwardRef(() => MenuItemVariantsModule)
  ],
  controllers: [MenuItemsController],
  providers: [MenuItemsService, FoodCategoriesRepository],
  exports: [MenuItemsService]
})
export class MenuItemsModule {}
