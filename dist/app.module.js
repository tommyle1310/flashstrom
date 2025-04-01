"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const address_book_module_1 = require("./address_book/address_book.module");
const customers_module_1 = require("./customers/customers.module");
const drivers_module_1 = require("./drivers/drivers.module");
const upload_module_1 = require("./upload/upload.module");
const auth_module_1 = require("./auth/auth.module");
const email_service_1 = require("./mailer/email.service");
const mailer_module_1 = require("./mailer/mailer.module");
const fwallets_module_1 = require("./fwallets/fwallets.module");
const transactions_module_1 = require("./transactions/transactions.module");
const food_categories_module_1 = require("./food_categories/food_categories.module");
const promotions_module_1 = require("./promotions/promotions.module");
const restaurants_module_1 = require("./restaurants/restaurants.module");
const menu_items_module_1 = require("./menu_items/menu_items.module");
const menu_item_variants_module_1 = require("./menu_item_variants/menu_item_variants.module");
const cart_items_module_1 = require("./cart_items/cart_items.module");
const orders_module_1 = require("./orders/orders.module");
const ratings_reviews_module_1 = require("./ratings_reviews/ratings_reviews.module");
const admin_module_1 = require("./admin/admin.module");
const customer_cares_module_1 = require("./customer_cares/customer_cares.module");
const finance_admin_module_1 = require("./admin/finance_admin/finance_admin.module");
const event_emitter_1 = require("@nestjs/event-emitter");
const driver_progress_stages_module_1 = require("./driver_progress_stages/driver_progress_stages.module");
const companion_admin_module_1 = require("./admin/companion_admin/companion_admin.module");
const typeorm_1 = require("@nestjs/typeorm");
const users_module_1 = require("./users/users.module");
const customer_cares_inquires_module_1 = require("./customer_cares_inquires/customer_cares_inquires.module");
const fchat_module_1 = require("./FChat/fchat.module");
const statistics_module_1 = require("./statistics/statistics.module");
const penalties_module_1 = require("./penalties/penalties.module");
const online_sessions_module_1 = require("./online-sessions/online-sessions.module");
const penalty_rules_module_1 = require("./penalty-rules/penalty-rules.module");
const statistic_records_module_1 = require("./statistic-records/statistic-records.module");
const finance_rules_module_1 = require("./finance_rules/finance_rules.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            address_book_module_1.AddressBookModule,
            event_emitter_1.EventEmitterModule.forRoot(),
            customers_module_1.CustomersModule,
            drivers_module_1.DriversModule,
            upload_module_1.UploadModule,
            auth_module_1.AuthModule,
            mailer_module_1.MailerCustomModule,
            fwallets_module_1.FwalletsModule,
            transactions_module_1.TransactionsModule,
            food_categories_module_1.FoodCategoriesModule,
            promotions_module_1.PromotionsModule,
            restaurants_module_1.RestaurantsModule,
            menu_items_module_1.MenuItemsModule,
            menu_item_variants_module_1.MenuItemVariantsModule,
            cart_items_module_1.CartItemsModule,
            orders_module_1.OrdersModule,
            ratings_reviews_module_1.RatingsReviewsModule,
            admin_module_1.AdminModule,
            customer_cares_module_1.CustomerCaresModule,
            finance_admin_module_1.FinanceAdminModule,
            driver_progress_stages_module_1.DriverProgressStagesModule,
            companion_admin_module_1.CompanionAdminModule,
            customer_cares_inquires_module_1.CustomerCareInquiriesModule,
            fchat_module_1.FchatModule,
            typeorm_1.TypeOrmModule.forRoot({
                type: 'postgres',
                host: process.env.NEON_HOST,
                port: parseInt(process.env.NEON_PORT),
                username: process.env.NEON_USER,
                password: process.env.NEON_PASSWORD,
                database: process.env.NEON_DATABASE,
                ssl: true,
                entities: [__dirname + '/**/*.entity{.ts,.js}'],
                synchronize: true
            }),
            users_module_1.UsersModule,
            statistics_module_1.StatisticsModule,
            penalties_module_1.PenaltiesModule,
            online_sessions_module_1.OnlineSessionsModule,
            penalty_rules_module_1.PenaltyRulesModule,
            statistic_records_module_1.StatisticRecordsModule,
            finance_rules_module_1.FinanceRulesModule
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService, email_service_1.EmailService]
    })
], AppModule);
//# sourceMappingURL=app.module.js.map