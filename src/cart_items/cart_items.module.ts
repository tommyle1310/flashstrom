import { Module, forwardRef } from '@nestjs/common';
import { CartItemsService } from './cart_items.service';
import { CartItemsController } from './cart_items.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerSchema } from 'src/customers/customer.schema';
import { CartItemSchema } from './cart_items.schema'; // Assuming you have the CartItem schema
import { MenuItemSchema } from 'src/menu_items/menu_items.schema';
import { MenuItemVariantSchema } from 'src/menu_item_variants/menu_item_variants.schema';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { RestaurantsRepository } from 'src/restaurants/restaurants.repository';
import { RestaurantsModule } from 'src/restaurants/restaurants.module';
import { FoodCategory } from 'src/food_categories/entities/food_category.entity';
import { FoodCategoriesRepository } from 'src/food_categories/food_categories.repository';
import { FoodCategoriesModule } from 'src/food_categories/food_categories.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Customer', schema: CustomerSchema }, // Injecting Customer schema
      { name: 'MenuItem', schema: MenuItemSchema }, // Injecting Customer schema
      { name: 'MenuItemVariant', schema: MenuItemVariantSchema }, // Injecting Customer schema
      { name: 'CartItem', schema: CartItemSchema } // Injecting CartItem schema
    ]),
    TypeOrmModule.forFeature([Restaurant, FoodCategory]),
    forwardRef(() => RestaurantsModule),
    FoodCategoriesModule
  ],
  controllers: [CartItemsController],
  providers: [
    CartItemsService,
    RestaurantsRepository,
    FoodCategoriesRepository
  ],
  exports: [CartItemsService]
})
export class CartItemsModule {}
