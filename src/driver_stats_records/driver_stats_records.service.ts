import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { DriverStatsRecord } from './entities/driver_stats_record.entity';
import { OnlineSession } from 'src/online-sessions/entities/online-session.entity';
import { DriverProgressStage } from 'src/driver_progress_stages/entities/driver_progress_stage.entity';
import { RatingsReview } from 'src/ratings_reviews/entities/ratings_review.entity';
import { createResponse, ApiResponse } from 'src/utils/createResponse';

@Injectable()
export class DriverStatsService {
  constructor(
    @InjectRepository(DriverStatsRecord)
    private driverStatsRepo: Repository<DriverStatsRecord>,
    @InjectRepository(OnlineSession)
    private onlineSessionRepo: Repository<OnlineSession>,
    @InjectRepository(DriverProgressStage)
    private dpsRepo: Repository<DriverProgressStage>,
    @InjectRepository(RatingsReview)
    private ratingsReviewRepo: Repository<RatingsReview>
  ) {}

  async updateStatsForDriver(driverId: string, periodType: string) {
    const now = Math.floor(Date.now() / 1000);
    let periodStart: number, periodEnd: number;

    switch (periodType) {
      case 'daily':
        const today = new Date(now * 1000);
        periodStart = Math.floor(today.setHours(0, 0, 0, 0) / 1000);
        periodEnd = Math.floor(today.setHours(23, 59, 59, 999) / 1000);
        break;
      default:
        throw new Error('Invalid period type');
    }

    console.log(
      `[DEBUG] Current time: ${now}, periodStart: ${periodStart}, periodEnd: ${periodEnd}`
    );

    let stats = await this.driverStatsRepo.findOne({
      where: {
        driver_id: driverId,
        period_type: periodType,
        period_start: periodStart
      }
    });
    if (!stats) {
      stats = this.driverStatsRepo.create({
        driver_id: driverId,
        period_type: periodType,
        period_start: periodStart,
        period_end: periodEnd
      });
    }

    const sessions = await this.onlineSessionRepo.find({
      where: {
        driver_id: driverId,
        start_time: Between(periodStart, periodEnd)
      }
    });
    console.log(
      `[DEBUG] Found ${sessions.length} OnlineSessions for driver ${driverId}:`,
      sessions
    );
    stats.total_online_hours = sessions.reduce((total, session) => {
      const endTime = session.end_time || now;
      const hours = (endTime - session.start_time) / 3600;
      console.log(
        `[DEBUG] Session ${session.id}: start=${session.start_time}, end=${endTime}, hours=${hours}`
      );
      return total + hours;
    }, 0);

    // Sửa query để thử cả epoch và timestamp
    const dpsRecords = await this.dpsRepo
      .createQueryBuilder('dps')
      .where('dps.driver_id = :driverId', { driverId })
      .andWhere('dps.created_at BETWEEN :start AND :end', {
        start: periodStart,
        end: periodEnd
      })
      .getMany();
    console.log(
      `[DEBUG] Found ${dpsRecords.length} DPS records for driver ${driverId}:`,
      dpsRecords
    );
    stats.total_earns = dpsRecords.reduce(
      (sum, dps) => sum + (dps.total_earns || 0),
      0
    );
    stats.total_tips = dpsRecords.reduce(
      (sum, dps) => sum + (dps.total_tips || 0),
      0
    );

    const reviews = await this.ratingsReviewRepo.find({
      where: {
        rr_recipient_driver_id: driverId,
        created_at: Between(periodStart, periodEnd)
      }
    });
    stats.rating_summary = {
      average_food_rating: reviews.length
        ? reviews.reduce((sum, r) => sum + r.food_rating, 0) / reviews.length
        : 0,
      average_delivery_rating: reviews.length
        ? reviews.reduce((sum, r) => sum + r.delivery_rating, 0) /
          reviews.length
        : 0,
      review_count: reviews.length
    };

    await this.driverStatsRepo.save(stats);
    console.log(
      `[DEBUG] Updated stats for driver ${driverId}: total_online_hours=${stats.total_online_hours}, total_earns=${stats.total_earns}, total_tips=${stats.total_tips}`
    );
  }

  async getStatsForDriver(
    driverId: string,
    startDate: number,
    endDate: number,
    aggregate: boolean = false
  ): Promise<ApiResponse<any>> {
    try {
      const stats = await this.driverStatsRepo.find({
        where: {
          driver_id: driverId,
          period_start: Between(startDate, endDate)
        },
        order: { period_start: 'ASC' }
      });

      if (aggregate) {
        const aggregated = {
          driver_id: driverId,
          period_start: startDate,
          period_end: endDate,
          total_online_hours: stats.reduce(
            (sum, s) => sum + s.total_online_hours,
            0
          ),
          total_earns: stats.reduce((sum, s) => sum + s.total_earns, 0),
          total_tips: stats.reduce((sum, s) => sum + s.total_tips, 0),
          rating_summary: {
            average_food_rating: stats.some(
              s => s.rating_summary.review_count > 0
            )
              ? stats.reduce(
                  (sum, s) =>
                    sum +
                    s.rating_summary.average_food_rating *
                      s.rating_summary.review_count,
                  0
                ) /
                stats.reduce((sum, s) => sum + s.rating_summary.review_count, 0)
              : 0,
            average_delivery_rating: stats.some(
              s => s.rating_summary.review_count > 0
            )
              ? stats.reduce(
                  (sum, s) =>
                    sum +
                    s.rating_summary.average_delivery_rating *
                      s.rating_summary.review_count,
                  0
                ) /
                stats.reduce((sum, s) => sum + s.rating_summary.review_count, 0)
              : 0,
            review_count: stats.reduce(
              (sum, s) => sum + s.rating_summary.review_count,
              0
            )
          }
        };
        return createResponse(
          'OK',
          aggregated,
          'Driver stats retrieved successfully'
        );
      }

      return createResponse('OK', stats, 'Driver stats retrieved successfully');
    } catch (error) {
      console.error('Error fetching driver stats:', error);
      return createResponse('ServerError', null, 'Error fetching driver stats');
    }
  }
}
