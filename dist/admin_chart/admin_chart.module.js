"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminChartModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const admin_chart_record_entity_1 = require("./entities/admin_chart_record.entity");
const admin_chart_controller_1 = require("./admin_chart.controller");
const admin_chart_service_1 = require("./admin_chart.service");
const order_entity_1 = require("../orders/entities/order.entity");
const user_entity_1 = require("../users/entities/user.entity");
const promotion_entity_1 = require("../promotions/entities/promotion.entity");
const customer_entity_1 = require("../customers/entities/customer.entity");
const driver_entity_1 = require("../drivers/entities/driver.entity");
const restaurant_entity_1 = require("../restaurants/entities/restaurant.entity");
const ratings_review_entity_1 = require("../ratings_reviews/entities/ratings_review.entity");
let AdminChartModule = class AdminChartModule {
};
exports.AdminChartModule = AdminChartModule;
exports.AdminChartModule = AdminChartModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                admin_chart_record_entity_1.AdminChartRecord,
                order_entity_1.Order,
                user_entity_1.User,
                promotion_entity_1.Promotion,
                customer_entity_1.Customer,
                driver_entity_1.Driver,
                restaurant_entity_1.Restaurant,
                ratings_review_entity_1.RatingsReview
            ])
        ],
        controllers: [admin_chart_controller_1.AdminChartController],
        providers: [admin_chart_service_1.AdminChartService],
        exports: [admin_chart_service_1.AdminChartService]
    })
], AdminChartModule);
//# sourceMappingURL=admin_chart.module.js.map