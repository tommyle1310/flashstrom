import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtStrategy } from './jwt.strategy';
import { AuthService } from './auth.service';
import { CustomersModule } from 'src/customers/customers.module';
import { AuthController } from './auth.controller';
import { EmailService } from 'src/mailer/email.service';
import { MailerCustomModule } from 'src/mailer/mailer.module';
import { DriversModule } from 'src/drivers/drivers.module';
import { DriversService } from 'src/drivers/drivers.service';
import { FWalletService } from 'src/fwallets/fwallets.service';
import { FwalletsModule } from 'src/fwallets/fwallets.module';
import { RestaurantsModule } from 'src/restaurants/restaurants.module';
import { RestaurantsService } from 'src/restaurants/restaurants.service';
import { PromotionsModule } from 'src/promotions/promotions.module';
import { AddressBook } from 'src/address_book/address_book.module';
import { AddressBookService } from 'src/address_book/address_book.service';
import { PromotionsService } from 'src/promotions/promotions.service';
import { MenuItemsService } from 'src/menu_items/menu_items.service';
import { MenuItemsModule } from 'src/menu_items/menu_items.module';
import { FoodCategoriesModule } from 'src/food_categories/food_categories.module';
import { MenuItemVariantsService } from 'src/menu_item_variants/menu_item_variants.service';
import { MenuItemVariantsModule } from 'src/menu_item_variants/menu_item_variants.module';
import { CartItemsModule } from 'src/cart_items/cart_items.module';
import { CartItemsService } from 'src/cart_items/cart_items.service';
import { OrdersModule } from 'src/orders/orders.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Admin } from '../admin/entities/admin.entity';
import { UsersService } from 'src/users/users.service';
import { UserRepository } from 'src/users/users.repository';

// Import your Mongoose schemas
import { CustomerSchema } from 'src/customers/customer.schema';
import { DriverSchema } from 'src/drivers/drivers.schema';
import { FWalletSchema } from 'src/fwallets/fwallets.schema';
import { RestaurantSchema } from 'src/restaurants/restaurants.schema';
import { AddressBookSchema } from 'src/address_book/address_book.schema';
import { MenuItemVariantSchema } from 'src/menu_item_variants/menu_item_variants.schema';
import { PromotionSchema } from 'src/promotions/promotions.schema';
import { MenuItemSchema } from 'src/menu_items/menu_items.schema';
import { OrderSchema } from 'src/orders/orders.schema';
import { FoodCategorySchema } from 'src/food_categories/food_categories.schema';
import { CartItemSchema } from 'src/cart_items/cart_items.schema';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1h' }
    }),
    TypeOrmModule.forFeature([User, Admin]),

    // Add Mongoose models
    MongooseModule.forFeature([
      { name: 'Customer', schema: CustomerSchema },
      { name: 'Driver', schema: DriverSchema },
      { name: 'FWallet', schema: FWalletSchema },
      { name: 'AddressBook', schema: AddressBookSchema },
      { name: 'Restaurant', schema: RestaurantSchema },
      { name: 'Promotion', schema: PromotionSchema },
      { name: 'MenuItem', schema: MenuItemSchema },
      { name: 'MenuItemVariant', schema: MenuItemVariantSchema },
      { name: 'CartItem', schema: CartItemSchema },
      { name: 'Order', schema: OrderSchema },
      { name: 'FoodCategory', schema: FoodCategorySchema }
    ]),

    CustomersModule,
    DriversModule,
    FwalletsModule,
    RestaurantsModule,
    PromotionsModule,
    AddressBook,
    MenuItemsModule,
    MenuItemVariantsModule,
    CartItemsModule,
    FoodCategoriesModule,
    MailerCustomModule,
    OrdersModule
  ],
  providers: [
    AuthService,
    JwtStrategy,
    EmailService,
    UsersService,
    DriversService,
    FWalletService,
    RestaurantsService,
    AddressBookService,
    CartItemsService,
    PromotionsService,
    MenuItemsService,
    MenuItemVariantsService,
    UserRepository
  ],
  controllers: [AuthController],
  exports: [AuthService, EmailService]
})
export class AuthModule {}
