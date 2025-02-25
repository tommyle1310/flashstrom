import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomerSchema } from './customer.schema';
import { User } from '../users/entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantSchema } from 'src/restaurants/restaurants.schema';
import { FoodCategorySchema } from 'src/food_categories/food_categories.schema';
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
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Customer', schema: CustomerSchema },
      { name: 'CartItem', schema: CartItemSchema },
      { name: 'Restaurant', schema: RestaurantSchema },
      { name: 'FoodCategory', schema: FoodCategorySchema }
    ]),
    TypeOrmModule.forFeature([User, AddressBook]),
    CartItemsModule,
    UsersModule,
    AddressBookModule
  ],
  controllers: [CustomersController],
  providers: [
    CustomersService,
    AddressBookService,
    CustomersGateway,
    UserRepository,
    AddressBookRepository
  ],
  exports: [CustomersService, CustomersGateway]
})
export class CustomersModule {}
