"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestaurantStatsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const restaurant_stats_record_entity_1 = require("./entities/restaurant_stats_record.entity");
const restaurant_stats_records_service_1 = require("./restaurant_stats_records.service");
const restaurant_stats_records_controller_1 = require("./restaurant_stats_records.controller");
const order_entity_1 = require("../orders/entities/order.entity");
const ratings_review_entity_1 = require("../ratings_reviews/entities/ratings_review.entity");
const restaurant_entity_1 = require("../restaurants/entities/restaurant.entity");
const restaurants_repository_1 = require("../restaurants/restaurants.repository");
const food_category_entity_1 = require("../food_categories/entities/food_category.entity");
const user_entity_1 = require("../users/entities/user.entity");
const users_repository_1 = require("../users/users.repository");
const address_book_entity_1 = require("../address_book/entities/address_book.entity");
const address_book_repository_1 = require("../address_book/address_book.repository");
let RestaurantStatsModule = class RestaurantStatsModule {
};
exports.RestaurantStatsModule = RestaurantStatsModule;
exports.RestaurantStatsModule = RestaurantStatsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                restaurant_stats_record_entity_1.RestaurantStatsRecord,
                order_entity_1.Order,
                ratings_review_entity_1.RatingsReview,
                food_category_entity_1.FoodCategory,
                user_entity_1.User,
                address_book_entity_1.AddressBook,
                restaurant_entity_1.Restaurant
            ])
        ],
        controllers: [restaurant_stats_records_controller_1.RestaurantStatsController],
        providers: [
            restaurant_stats_records_service_1.RestaurantStatsService,
            restaurants_repository_1.RestaurantsRepository,
            users_repository_1.UserRepository,
            address_book_repository_1.AddressBookRepository
        ],
        exports: [restaurant_stats_records_service_1.RestaurantStatsService]
    })
], RestaurantStatsModule);
//# sourceMappingURL=restaurant_stats_records.module.js.map