import { Module } from '@nestjs/common';
import { DriverStatsService } from './driver_stats_records.service';
import { DriverStatsController } from './driver_stats_records.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DriverStatsRecord } from './entities/driver_stats_record.entity';
import { OnlineSessionsRepository } from 'src/online-sessions/online-session.repository';
import { OnlineSession } from 'src/online-sessions/entities/online-session.entity';
import { DriverProgressStage } from 'src/driver_progress_stages/entities/driver_progress_stage.entity';
import { DriverProgressStagesRepository } from 'src/driver_progress_stages/driver_progress_stages.repository';
import { RatingsReviewsRepository } from 'src/ratings_reviews/ratings_reviews.repository';
import { RatingsReview } from 'src/ratings_reviews/entities/ratings_review.entity';
import { Order } from 'src/orders/entities/order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DriverStatsRecord,
      OnlineSession,
      DriverProgressStage,
      RatingsReview,
      Order
    ])
  ],
  controllers: [DriverStatsController],
  providers: [
    DriverStatsService,
    OnlineSessionsRepository,
    DriverProgressStagesRepository,
    RatingsReviewsRepository
  ]
})
export class DriverStatsRecordsModule {}
