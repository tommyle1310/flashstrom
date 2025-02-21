import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from 'src/user/user.module'; // Import UserModule to make the UserModel available
import { JwtStrategy } from './jwt.strategy'; // Your JwtStrategy
import { AuthService } from './auth.service'; // Your AuthService
import { UserSchema } from 'src/user/user.schema';
import { CustomersModule } from 'src/customers/customers.module';
import { CustomerSchema } from 'src/customers/customer.schema';
import { AuthController } from './auth.controller';
import { EmailService } from 'src/mailer/email.service';
import { MailerCustomModule } from 'src/mailer/mailer.module';
import { UserService } from 'src/user/user.service';
import { DriversModule } from 'src/drivers/drivers.module';
import { DriversService } from 'src/drivers/drivers.service';
import { DriverSchema } from 'src/drivers/drivers.schema';
import { FWalletService } from 'src/fwallets/fwallets.service';
import { FWalletSchema } from 'src/fwallets/fwallets.schema';
import { FwalletsModule } from 'src/fwallets/fwallets.module';
import { RestaurantSchema } from 'src/restaurants/restaurants.schema';
import { RestaurantsModule } from 'src/restaurants/restaurants.module';
import { RestaurantsService } from 'src/restaurants/restaurants.service';
import { PromotionSchema } from 'src/promotions/promotions.schema';
import { PromotionsModule } from 'src/promotions/promotions.module';
import { AddressBookSchema } from 'src/address_book/address_book.schema';
import { AddressBook } from 'src/address_book/address_book.module';
import { AddressBookService } from 'src/address_book/address_book.service';
import { PromotionsService } from 'src/promotions/promotions.service';
import { MenuItemsService } from 'src/menu_items/menu_items.service';
import { MenuItemSchema } from 'src/menu_items/menu_items.schema';
import { MenuItemsModule } from 'src/menu_items/menu_items.module';
import { FoodCategoriesModule } from 'src/food_categories/food_categories.module'; // Import FoodCategoriesModule
import { FoodCategorySchema } from 'src/food_categories/food_categories.schema'; // Import FoodCategorySchema
import { MenuItemVariantsService } from 'src/menu_item_variants/menu_item_variants.service';
import { MenuItemVariantSchema } from 'src/menu_item_variants/menu_item_variants.schema';
import { MenuItemVariantsModule } from 'src/menu_item_variants/menu_item_variants.module';
import { CartItemSchema } from 'src/cart_items/cart_items.schema';
import { CartItemsModule } from 'src/cart_items/cart_items.module';
import { CartItemsService } from 'src/cart_items/cart_items.service';
import { OrderSchema } from 'src/orders/orders.schema';
import { OrdersModule } from 'src/orders/orders.module';
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET, // Your JWT secret
      signOptions: { expiresIn: '1h' } // Token expiration time
    }),
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),
    UserModule,
    MongooseModule.forFeature([{ name: 'Customer', schema: CustomerSchema }]),
    CustomersModule,
    MongooseModule.forFeature([{ name: 'Driver', schema: DriverSchema }]),
    DriversModule,
    MongooseModule.forFeature([{ name: 'FWallet', schema: FWalletSchema }]),
    FwalletsModule,
    MongooseModule.forFeature([
      { name: 'Restaurant', schema: RestaurantSchema }
    ]),
    RestaurantsModule,
    MongooseModule.forFeature([{ name: 'Promotion', schema: PromotionSchema }]),
    PromotionsModule,
    MongooseModule.forFeature([
      { name: 'AddressBook', schema: AddressBookSchema }
    ]),
    AddressBook,
    MongooseModule.forFeature([{ name: 'MenuItem', schema: MenuItemSchema }]),
    MenuItemsModule,
    MongooseModule.forFeature([
      { name: 'MenuItemVariant', schema: MenuItemVariantSchema }
    ]),
    MenuItemVariantsModule,
    MongooseModule.forFeature([{ name: 'CartItem', schema: CartItemSchema }]),
    CartItemsModule,
    FoodCategoriesModule, // Import FoodCategoriesModule to make FoodCategoryModel available
    MongooseModule.forFeature([
      { name: 'FoodCategory', schema: FoodCategorySchema }
    ]), // Register FoodCategorySchema
    MailerCustomModule,
    MongooseModule.forFeature([{ name: 'Order', schema: OrderSchema }]),
    OrdersModule
  ],
  providers: [
    AuthService,
    JwtStrategy,
    EmailService,
    UserService,
    DriversService,
    FWalletService,
    RestaurantsService,
    AddressBookService,
    CartItemsService,
    PromotionsService,
    MenuItemsService,
    MenuItemVariantsService
  ],
  controllers: [AuthController],
  exports: [AuthService, EmailService]
})
export class AuthModule {}
