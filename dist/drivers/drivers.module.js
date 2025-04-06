"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriversModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const drivers_service_1 = require("./drivers.service");
const drivers_controller_1 = require("./drivers.controller");
const drivers_gateway_1 = require("./drivers.gateway");
const driver_entity_1 = require("./entities/driver.entity");
const drivers_repository_1 = require("./drivers.repository");
const address_book_repository_1 = require("../address_book/address_book.repository");
const restaurants_module_1 = require("../restaurants/restaurants.module");
const orders_module_1 = require("../orders/orders.module");
const driver_progress_stages_module_1 = require("../driver_progress_stages/driver_progress_stages.module");
const event_emitter_1 = require("@nestjs/event-emitter");
const address_book_entity_1 = require("../address_book/entities/address_book.entity");
const orders_repository_1 = require("../orders/orders.repository");
const order_entity_1 = require("../orders/entities/order.entity");
const jwt_1 = require("@nestjs/jwt");
const promotions_repository_1 = require("../promotions/promotions.repository");
const promotion_entity_1 = require("../promotions/entities/promotion.entity");
const driver_progress_stage_entity_1 = require("../driver_progress_stages/entities/driver_progress_stage.entity");
const driver_progress_stages_repository_1 = require("../driver_progress_stages/driver_progress_stages.repository");
const online_session_entity_1 = require("../online-sessions/entities/online-session.entity");
const online_session_repository_1 = require("../online-sessions/online-session.repository");
const online_sessions_service_1 = require("../online-sessions/online-sessions.service");
const driver_stats_records_service_1 = require("../driver_stats_records/driver_stats_records.service");
const driver_stats_record_entity_1 = require("../driver_stats_records/entities/driver_stats_record.entity");
const ratings_review_entity_1 = require("../ratings_reviews/entities/ratings_review.entity");
const ratings_reviews_repository_1 = require("../ratings_reviews/ratings_reviews.repository");
const finance_rules_repository_1 = require("../finance_rules/finance_rules.repository");
const finance_rule_entity_1 = require("../finance_rules/entities/finance_rule.entity");
const finance_rules_service_1 = require("../finance_rules/finance_rules.service");
const admin_repository_1 = require("../admin/admin.repository");
const admin_entity_1 = require("../admin/entities/admin.entity");
let DriversModule = class DriversModule {
};
exports.DriversModule = DriversModule;
exports.DriversModule = DriversModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                driver_entity_1.Driver,
                address_book_entity_1.AddressBook,
                order_entity_1.Order,
                promotion_entity_1.Promotion,
                driver_progress_stage_entity_1.DriverProgressStage,
                admin_entity_1.Admin,
                online_session_entity_1.OnlineSession,
                finance_rule_entity_1.FinanceRule,
                driver_stats_record_entity_1.DriverStatsRecord,
                ratings_review_entity_1.RatingsReview
            ]),
            (0, common_1.forwardRef)(() => restaurants_module_1.RestaurantsModule),
            (0, common_1.forwardRef)(() => orders_module_1.OrdersModule),
            driver_progress_stages_module_1.DriverProgressStagesModule,
            event_emitter_1.EventEmitterModule.forRoot()
        ],
        controllers: [drivers_controller_1.DriversController],
        providers: [
            drivers_service_1.DriversService,
            drivers_gateway_1.DriversGateway,
            orders_repository_1.OrdersRepository,
            drivers_repository_1.DriversRepository,
            online_sessions_service_1.OnlineSessionsService,
            ratings_reviews_repository_1.RatingsReviewsRepository,
            online_session_repository_1.OnlineSessionsRepository,
            finance_rules_repository_1.FinanceRulesRepository,
            finance_rules_service_1.FinanceRulesService,
            admin_repository_1.AdminRepository,
            address_book_repository_1.AddressBookRepository,
            driver_progress_stages_repository_1.DriverProgressStagesRepository,
            promotions_repository_1.PromotionsRepository,
            jwt_1.JwtService,
            driver_stats_records_service_1.DriverStatsService
        ],
        exports: [drivers_service_1.DriversService, drivers_repository_1.DriversRepository]
    })
], DriversModule);
//# sourceMappingURL=drivers.module.js.map