import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenuItemSchema } from './menu_items.schema';
import { MenuItemsController } from './menu_items.controller';
import { MenuItemsService } from './menu_items.service';
import { FoodCategory } from 'src/food_categories/entities/food_category.entity';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { FoodCategoriesRepository } from 'src/food_categories/food_categories.repository';
import { RestaurantsRepository } from 'src/restaurants/restaurants.repository';
import { FoodCategoriesModule } from 'src/food_categories/food_categories.module';
import { MenuItemVariantSchema } from 'src/menu_item_variants/menu_item_variants.schema';
import { MenuItemVariantsModule } from 'src/menu_item_variants/menu_item_variants.module';
import { RestaurantsModule } from 'src/restaurants/restaurants.module';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'MenuItem', schema: MenuItemSchema },
      { name: 'MenuItemVariant', schema: MenuItemVariantSchema }
    ]),
    TypeOrmModule.forFeature([FoodCategory, Restaurant]),
    FoodCategoriesModule,
    forwardRef(() => RestaurantsModule),
    forwardRef(() => MenuItemVariantsModule)
  ],
  controllers: [MenuItemsController],
  providers: [
    MenuItemsService,
    FoodCategoriesRepository,
    RestaurantsRepository
  ],
  exports: [MenuItemsService]
})
export class MenuItemsModule {}
