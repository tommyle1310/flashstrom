import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantStatsRecord } from './entities/restaurant_stats_record.entity';
import { RestaurantStatsService } from './restaurant_stats_records.service';
import { RestaurantStatsController } from './restaurant_stats_records.controller';
import { Order } from 'src/orders/entities/order.entity';
import { RatingsReview } from 'src/ratings_reviews/entities/ratings_review.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([RestaurantStatsRecord, Order, RatingsReview])
  ],
  controllers: [RestaurantStatsController],
  providers: [RestaurantStatsService],
  exports: [RestaurantStatsService]
})
export class RestaurantStatsModule {}
