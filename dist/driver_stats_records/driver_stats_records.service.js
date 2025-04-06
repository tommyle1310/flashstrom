"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriverStatsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const driver_stats_record_entity_1 = require("./entities/driver_stats_record.entity");
const online_session_entity_1 = require("../online-sessions/entities/online-session.entity");
const driver_progress_stage_entity_1 = require("../driver_progress_stages/entities/driver_progress_stage.entity");
const ratings_review_entity_1 = require("../ratings_reviews/entities/ratings_review.entity");
const createResponse_1 = require("../utils/createResponse");
let DriverStatsService = class DriverStatsService {
    constructor(driverStatsRepo, onlineSessionRepo, dpsRepo, ratingsReviewRepo) {
        this.driverStatsRepo = driverStatsRepo;
        this.onlineSessionRepo = onlineSessionRepo;
        this.dpsRepo = dpsRepo;
        this.ratingsReviewRepo = ratingsReviewRepo;
    }
    async updateStatsForDriver(driverId, periodType) {
        const now = Math.floor(Date.now() / 1000);
        let periodStart, periodEnd;
        switch (periodType) {
            case 'daily':
                const today = new Date(now * 1000);
                periodStart = Math.floor(today.setHours(0, 0, 0, 0) / 1000);
                periodEnd = Math.floor(today.setHours(23, 59, 59, 999) / 1000);
                break;
            default:
                throw new Error('Invalid period type');
        }
        console.log(`[DEBUG] Current time: ${now}, periodStart: ${periodStart}, periodEnd: ${periodEnd}`);
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
                start_time: (0, typeorm_2.Between)(periodStart, periodEnd)
            }
        });
        console.log(`[DEBUG] Found ${sessions.length} OnlineSessions for driver ${driverId}:`, sessions);
        stats.total_online_hours = sessions.reduce((total, session) => {
            const endTime = session.end_time || now;
            const hours = (endTime - session.start_time) / 3600;
            console.log(`[DEBUG] Session ${session.id}: start=${session.start_time}, end=${endTime}, hours=${hours}`);
            return total + hours;
        }, 0);
        const dpsRecords = await this.dpsRepo
            .createQueryBuilder('dps')
            .where('dps.driver_id = :driverId', { driverId })
            .andWhere('dps.created_at BETWEEN :start AND :end', {
            start: periodStart,
            end: periodEnd
        })
            .getMany();
        console.log(`[DEBUG] Found ${dpsRecords.length} DPS records for driver ${driverId}:`, dpsRecords);
        stats.total_earns = dpsRecords.reduce((sum, dps) => sum + (dps.total_earns || 0), 0);
        stats.total_tips = dpsRecords.reduce((sum, dps) => sum + (dps.total_tips || 0), 0);
        const reviews = await this.ratingsReviewRepo.find({
            where: {
                rr_recipient_driver_id: driverId,
                created_at: (0, typeorm_2.Between)(periodStart, periodEnd)
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
        console.log(`[DEBUG] Updated stats for driver ${driverId}: total_online_hours=${stats.total_online_hours}, total_earns=${stats.total_earns}, total_tips=${stats.total_tips}`);
    }
    async getStatsForDriver(driverId, startDate, endDate, aggregate = false) {
        try {
            const stats = await this.driverStatsRepo.find({
                where: {
                    driver_id: driverId,
                    period_start: (0, typeorm_2.Between)(startDate, endDate)
                },
                order: { period_start: 'ASC' }
            });
            if (aggregate) {
                const aggregated = {
                    driver_id: driverId,
                    period_start: startDate,
                    period_end: endDate,
                    total_online_hours: stats.reduce((sum, s) => sum + s.total_online_hours, 0),
                    total_earns: stats.reduce((sum, s) => sum + s.total_earns, 0),
                    total_tips: stats.reduce((sum, s) => sum + s.total_tips, 0),
                    rating_summary: {
                        average_food_rating: stats.some(s => s.rating_summary.review_count > 0)
                            ? stats.reduce((sum, s) => sum +
                                s.rating_summary.average_food_rating *
                                    s.rating_summary.review_count, 0) /
                                stats.reduce((sum, s) => sum + s.rating_summary.review_count, 0)
                            : 0,
                        average_delivery_rating: stats.some(s => s.rating_summary.review_count > 0)
                            ? stats.reduce((sum, s) => sum +
                                s.rating_summary.average_delivery_rating *
                                    s.rating_summary.review_count, 0) /
                                stats.reduce((sum, s) => sum + s.rating_summary.review_count, 0)
                            : 0,
                        review_count: stats.reduce((sum, s) => sum + s.rating_summary.review_count, 0)
                    }
                };
                return (0, createResponse_1.createResponse)('OK', aggregated, 'Driver stats retrieved successfully');
            }
            return (0, createResponse_1.createResponse)('OK', stats, 'Driver stats retrieved successfully');
        }
        catch (error) {
            console.error('Error fetching driver stats:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error fetching driver stats');
        }
    }
};
exports.DriverStatsService = DriverStatsService;
exports.DriverStatsService = DriverStatsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(driver_stats_record_entity_1.DriverStatsRecord)),
    __param(1, (0, typeorm_1.InjectRepository)(online_session_entity_1.OnlineSession)),
    __param(2, (0, typeorm_1.InjectRepository)(driver_progress_stage_entity_1.DriverProgressStage)),
    __param(3, (0, typeorm_1.InjectRepository)(ratings_review_entity_1.RatingsReview)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], DriverStatsService);
//# sourceMappingURL=driver_stats_records.service.js.map