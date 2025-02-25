import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomerSchema } from './customer.schema';
import { User } from '../users/entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartItemSchema } from 'src/cart_items/cart_items.schema';

// Import CartItemsModule to make CartItemsService available
import { CartItemsModule } from 'src/cart_items/cart_items.module';
import { AddressBookService } from 'src/address_book/address_book.service';
import { CustomersGateway } from './customers.gateway';
import { UserRepository } from 'src/users/users.repository';
import { UsersModule } from 'src/users/users.module';
import { AddressBook } from 'src/address_book/entities/address_book.entity';
import { AddressBookModule } from 'src/address_book/address_book.module';
import { AddressBookRepository } from 'src/address_book/address_book.repository';
import { FoodCategory } from 'src/food_categories/entities/food_category.entity';
import { FoodCategoriesRepository } from 'src/food_categories/food_categories.repository';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { RestaurantsModule } from 'src/restaurants/restaurants.module';
import { RestaurantsRepository } from 'src/restaurants/restaurants.repository';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Customer', schema: CustomerSchema },
      { name: 'CartItem', schema: CartItemSchema }
    ]),
    TypeOrmModule.forFeature([User, AddressBook, FoodCategory, Restaurant]),
    CartItemsModule,
    UsersModule,
    AddressBookModule,
    RestaurantsModule
  ],
  controllers: [CustomersController],
  providers: [
    CustomersService,
    AddressBookService,
    CustomersGateway,
    UserRepository,
    AddressBookRepository,
    FoodCategoriesRepository,
    RestaurantsRepository
  ],
  exports: [CustomersService, CustomersGateway]
})
export class CustomersModule {}
