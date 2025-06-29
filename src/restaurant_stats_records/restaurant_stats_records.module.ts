import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantStatsRecord } from './entities/restaurant_stats_record.entity';
import { RestaurantStatsService } from './restaurant_stats_records.service';
import { RestaurantStatsController } from './restaurant_stats_records.controller';
import { Order } from 'src/orders/entities/order.entity';
import { RatingsReview } from 'src/ratings_reviews/entities/ratings_review.entity';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { RestaurantsRepository } from 'src/restaurants/restaurants.repository';
import { FoodCategory } from 'src/food_categories/entities/food_category.entity';
import { User } from 'src/users/entities/user.entity';
import { UserRepository } from 'src/users/users.repository';
import { AddressBook } from 'src/address_book/entities/address_book.entity';
import { AddressBookRepository } from 'src/address_book/address_book.repository';
import { OnlineSession } from 'src/online-sessions/entities/online-session.entity';
import { Transaction } from 'src/transactions/entities/transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RestaurantStatsRecord,
      Order,
      RatingsReview,
      FoodCategory,
      User,
      AddressBook,
      Restaurant,
      OnlineSession,
      Transaction
    ])
  ],
  controllers: [RestaurantStatsController],
  providers: [
    RestaurantStatsService,
    RestaurantsRepository,
    UserRepository,
    AddressBookRepository
  ],
  exports: [RestaurantStatsService]
})
export class RestaurantStatsModule {}
