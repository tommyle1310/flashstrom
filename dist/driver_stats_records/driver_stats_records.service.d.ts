import { Repository } from 'typeorm';
import { DriverStatsRecord } from './entities/driver_stats_record.entity';
import { OnlineSession } from 'src/online-sessions/entities/online-session.entity';
import { DriverProgressStage } from 'src/driver_progress_stages/entities/driver_progress_stage.entity';
import { RatingsReview } from 'src/ratings_reviews/entities/ratings_review.entity';
import { ApiResponse } from 'src/utils/createResponse';
export declare class DriverStatsService {
    private driverStatsRepo;
    private onlineSessionRepo;
    private dpsRepo;
    private ratingsReviewRepo;
    constructor(driverStatsRepo: Repository<DriverStatsRecord>, onlineSessionRepo: Repository<OnlineSession>, dpsRepo: Repository<DriverProgressStage>, ratingsReviewRepo: Repository<RatingsReview>);
    updateStatsForDriver(driverId: string, periodType: string): Promise<void>;
    getStatsForDriver(driverId: string, startDate: number, endDate: number, aggregate?: boolean): Promise<ApiResponse<any>>;
}
