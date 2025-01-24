import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MenuItemSchema } from './menu_items.schema';
import { FoodCategorySchema } from 'src/food_categories/food_categories.schema';
import { FoodCategoriesModule } from 'src/food_categories/food_categories.module';
import { MenuItemsController } from './menu_items.controller';
import { MenuItemsService } from './menu_items.service';
import { RestaurantSchema } from 'src/restaurants/restaurants.schema';
import { RestaurantsModule } from 'src/restaurants/restaurants.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'MenuItem', schema: MenuItemSchema }, // Registering MenuItem schema
    ]),
    MongooseModule.forFeature([
      { name: 'FoodCategory', schema: FoodCategorySchema },
    ]), // Registering FoodCategory schema
    FoodCategoriesModule, // Importing FoodCategoryModule
    MongooseModule.forFeature([
      { name: 'Restaurant', schema: RestaurantSchema },
    ]), // Registering Restaurant schema
    RestaurantsModule, // Importing restaurant module
  ],
  controllers: [MenuItemsController], // Controllers for the MenuItem CRUD operations
  providers: [MenuItemsService], // Providers for MenuItems logic
})
export class MenuItemsModule {}
