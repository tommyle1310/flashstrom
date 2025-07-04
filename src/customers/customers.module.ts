import { Module, forwardRef } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { User } from '../users/entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

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
import { Customer } from './entities/customer.entity';
import { CustomersRepository } from './customers.repository';
import { CartItem } from 'src/cart_items/entities/cart_item.entity';
import { CartItemsRepository } from 'src/cart_items/cart_items.repository';
import { OrdersRepository } from 'src/orders/orders.repository';
import { Order } from 'src/orders/entities/order.entity';
import { JwtService } from '@nestjs/jwt';
import { PromotionsRepository } from 'src/promotions/promotions.repository';
import { Promotion } from 'src/promotions/entities/promotion.entity';
import { Notification } from 'src/notifications/entities/notification.entity';
import { NotificationsRepository } from 'src/notifications/notifications.repository';
import { RedisService } from 'src/redis/redis.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { AdminRepository } from 'src/admin/admin.repository';
import { Admin } from 'src/admin/entities/admin.entity';
import { MenuItemsRepository } from 'src/menu_items/menu_items.repository';
import { MenuItem } from 'src/menu_items/entities/menu_item.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      AddressBook,
      FoodCategory,
      Restaurant,
      Admin,
      Customer,
      Promotion,
      CartItem,
      Notification,
      Order,
      MenuItem
    ]),
    forwardRef(() => CartItemsModule),
    UsersModule,
    AddressBookModule,
    forwardRef(() => RestaurantsModule)
  ],
  controllers: [CustomersController],
  providers: [
    CustomersService,
    AddressBookService,
    NotificationsService,
    AdminRepository,
    CustomersGateway,
    UserRepository,
    RedisService,
    AddressBookRepository,
    NotificationsRepository,
    FoodCategoriesRepository,
    RestaurantsRepository,
    CustomersRepository,
    PromotionsRepository,
    CartItemsRepository,
    OrdersRepository,
    JwtService,
    MenuItemsRepository
  ],
  exports: [CustomersService, CustomersGateway, CustomersRepository]
})
export class CustomersModule {}
