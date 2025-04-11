import { Module } from '@nestjs/common';
import { CompanionAdminController } from './companion_admin.controller';
import { AdminModule } from '../admin.module';
import { RestaurantsModule } from 'src/restaurants/restaurants.module';
import { CustomersModule } from 'src/customers/customers.module';
import { DriversModule } from 'src/drivers/drivers.module';
import { CustomerCaresModule } from 'src/customer_cares/customer_cares.module';
import { AuthService } from 'src/auth/auth.service';
import { AdminService } from '../admin.service';
import { RestaurantsService } from 'src/restaurants/restaurants.service';
import { CustomerCareService } from 'src/customer_cares/customer_cares.service';
import { DriversService } from 'src/drivers/drivers.service';
import { CustomersService } from 'src/customers/customers.service';
import { RestaurantsRepository } from 'src/restaurants/restaurants.repository';
import { DriversRepository } from 'src/drivers/drivers.repository';
import { CustomersRepository } from 'src/customers/customers.repository';
import { CustomerCaresRepository } from 'src/customer_cares/customer_cares.repository';
import { JwtService } from '@nestjs/jwt';
import { CartItemsService } from 'src/cart_items/cart_items.service';
import { UserRepository } from 'src/users/users.repository';
import { FWalletsRepository } from 'src/fwallets/fwallets.repository';
import { UsersService } from 'src/users/users.service';
import { PromotionsRepository } from 'src/promotions/promotions.repository';
import { MenuItemsRepository } from 'src/menu_items/menu_items.repository';
import { MenuItemVariantsRepository } from 'src/menu_item_variants/menu_item_variants.repository';
import { CartItemsRepository } from 'src/cart_items/cart_items.repository';
import { FoodCategoriesRepository } from 'src/food_categories/food_categories.repository';
import { OrdersRepository } from 'src/orders/orders.repository';
import { MenuItemsService } from 'src/menu_items/menu_items.service';
import { MenuItemVariantsService } from 'src/menu_item_variants/menu_item_variants.service';
import { AddressBookRepository } from 'src/address_book/address_book.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Driver } from 'src/drivers/entities/driver.entity';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { Customer } from 'src/customers/entities/customer.entity';
import { CustomerCare } from 'src/customer_cares/entities/customer_care.entity';
import { FoodCategory } from 'src/food_categories/entities/food_category.entity';
import { MenuItem } from 'src/menu_items/entities/menu_item.entity';
import { MenuItemVariant } from 'src/menu_item_variants/entities/menu_item_variant.entity';
import { Order } from 'src/orders/entities/order.entity';
import { CartItem } from 'src/cart_items/entities/cart_item.entity';
import { AddressBook } from 'src/address_book/entities/address_book.entity';
import { User } from 'src/users/entities/user.entity';
import { FWallet } from 'src/fwallets/entities/fwallet.entity';
import { Promotion } from 'src/promotions/entities/promotion.entity';
import { DriverProgressStagesRepository } from 'src/driver_progress_stages/driver_progress_stages.repository';
import { DriverProgressStage } from 'src/driver_progress_stages/entities/driver_progress_stage.entity';
import { AddressBookService } from 'src/address_book/address_book.service';
import { Transaction } from 'src/transactions/entities/transaction.entity';
import { TransactionService } from 'src/transactions/transactions.service';
import { TransactionsRepository } from 'src/transactions/transactions.repository';
import { OnlineSession } from 'src/online-sessions/entities/online-session.entity';
import { OnlineSessionsRepository } from 'src/online-sessions/online-session.repository';
import { OnlineSessionsService } from 'src/online-sessions/online-sessions.service';
import { EmailService } from 'src/mailer/email.service';
import * as nodemailer from 'nodemailer';
import { DriverStatsRecord } from 'src/driver_stats_records/entities/driver_stats_record.entity';
import { DriverStatsService } from 'src/driver_stats_records/driver_stats_records.service';
import { RatingsReview } from 'src/ratings_reviews/entities/ratings_review.entity';
import { RatingsReviewsRepository } from 'src/ratings_reviews/ratings_reviews.repository';
import { BannedAccount } from 'src/banned-account/entities/banned-account.entity';
import { Notification } from 'src/notifications/entities/notification.entity';
import { NotificationsRepository } from 'src/notifications/notifications.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Driver,
      Restaurant,
      Customer,
      CustomerCare,
      FoodCategory,
      MenuItem,
      MenuItemVariant,
      Order,
      BannedAccount,
      CartItem,
      OnlineSession,
      Notification,
      FoodCategory,
      AddressBook,
      User,
      FWallet,
      Promotion,
      Transaction,
      DriverStatsRecord,
      RatingsReview,
      DriverProgressStage
    ]),
    AdminModule,
    RestaurantsModule,
    CustomersModule,
    DriversModule,
    CustomerCaresModule
  ],
  controllers: [CompanionAdminController],
  providers: [
    {
      provide: 'MAIL_TRANSPORT',
      useFactory: async () => {
        // Create a nodemailer transporter
        const transporter = nodemailer.createTransport({
          host: 'sandbox.smtp.mailtrap.io', // Replace with your email service host
          port: 587, // Use 465 for SSL, 587 for TLS
          secure: false, // Use true for port 465, false for 587
          auth: {
            user: '389c1523b80572', // Replace with your email
            pass: '9685cd52ea218d' // Replace with your email password or app-specific password
          }
        });

        // Verify the transporter configuration
        await transporter.verify();
        return transporter;
      }
    },
    AuthService,
    AdminService,
    RestaurantsService,
    CustomerCareService,
    EmailService,
    DriversService,
    NotificationsRepository,
    DriverStatsService,
    OnlineSessionsRepository,
    OnlineSessionsService,
    AddressBookService,
    CustomersService,
    RestaurantsRepository,
    CustomersRepository,
    CustomerCaresRepository,
    RatingsReviewsRepository,
    JwtService,
    CartItemsService,
    UserRepository,
    FWalletsRepository,
    UsersService,
    TransactionService,
    TransactionsRepository,
    PromotionsRepository,
    MenuItemsRepository,
    MenuItemVariantsRepository,
    CartItemsRepository,
    DriverProgressStagesRepository,
    FoodCategoriesRepository,
    OrdersRepository,
    MenuItemsService,
    MenuItemVariantsService,
    AddressBookRepository,
    DriversRepository
  ]
})
export class CompanionAdminModule {}
