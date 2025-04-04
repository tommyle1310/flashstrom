"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadModule = void 0;
const common_1 = require("@nestjs/common");
const upload_service_1 = require("./upload.service");
const upload_controller_1 = require("./upload.controller");
const customers_module_1 = require("../customers/customers.module");
const drivers_module_1 = require("../drivers/drivers.module");
const restaurants_module_1 = require("../restaurants/restaurants.module");
const restaurants_service_1 = require("../restaurants/restaurants.service");
const drivers_service_1 = require("../drivers/drivers.service");
const customers_service_1 = require("../customers/customers.service");
const menu_items_module_1 = require("../menu_items/menu_items.module");
const menu_items_service_1 = require("../menu_items/menu_items.service");
const food_categories_module_1 = require("../food_categories/food_categories.module");
const menu_item_variants_module_1 = require("../menu_item_variants/menu_item_variants.module");
const orders_module_1 = require("../orders/orders.module");
const typeorm_1 = require("@nestjs/typeorm");
const user_entity_1 = require("../users/entities/user.entity");
const users_repository_1 = require("../users/users.repository");
const promotions_service_1 = require("../promotions/promotions.service");
const promotions_repository_1 = require("../promotions/promotions.repository");
const promotion_entity_1 = require("../promotions/entities/promotion.entity");
const address_book_entity_1 = require("../address_book/entities/address_book.entity");
const address_book_repository_1 = require("../address_book/address_book.repository");
const food_category_entity_1 = require("../food_categories/entities/food_category.entity");
const food_categories_repository_1 = require("../food_categories/food_categories.repository");
const restaurant_entity_1 = require("../restaurants/entities/restaurant.entity");
const restaurants_repository_1 = require("../restaurants/restaurants.repository");
const customer_entity_1 = require("../customers/entities/customer.entity");
const customers_repository_1 = require("../customers/customers.repository");
const driver_entity_1 = require("../drivers/entities/driver.entity");
const drivers_repository_1 = require("../drivers/drivers.repository");
const drivers_gateway_1 = require("../drivers/drivers.gateway");
const driver_progress_stages_service_1 = require("../driver_progress_stages/driver_progress_stages.service");
const driver_progress_stages_module_1 = require("../driver_progress_stages/driver_progress_stages.module");
const menu_item_entity_1 = require("../menu_items/entities/menu_item.entity");
const menu_item_variant_entity_1 = require("../menu_item_variants/entities/menu_item_variant.entity");
const menu_item_variants_repository_1 = require("../menu_item_variants/menu_item_variants.repository");
const menu_items_repository_1 = require("../menu_items/menu_items.repository");
const order_entity_1 = require("../orders/entities/order.entity");
const orders_repository_1 = require("../orders/orders.repository");
const customer_care_inquiry_entity_1 = require("../customer_cares_inquires/entities/customer_care_inquiry.entity");
const driver_progress_stage_entity_1 = require("../driver_progress_stages/entities/driver_progress_stage.entity");
const driver_progress_stages_repository_1 = require("../driver_progress_stages/driver_progress_stages.repository");
const jwt_1 = require("@nestjs/jwt");
const transactions_service_1 = require("../transactions/transactions.service");
const transaction_entity_1 = require("../transactions/entities/transaction.entity");
const fwallet_entity_1 = require("../fwallets/entities/fwallet.entity");
const fwallets_repository_1 = require("../fwallets/fwallets.repository");
const transactions_repository_1 = require("../transactions/transactions.repository");
const online_session_entity_1 = require("../online-sessions/entities/online-session.entity");
const online_sessions_service_1 = require("../online-sessions/online-sessions.service");
const online_session_repository_1 = require("../online-sessions/online-session.repository");
let UploadModule = class UploadModule {
};
exports.UploadModule = UploadModule;
exports.UploadModule = UploadModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                user_entity_1.User,
                promotion_entity_1.Promotion,
                address_book_entity_1.AddressBook,
                food_category_entity_1.FoodCategory,
                restaurant_entity_1.Restaurant,
                customer_entity_1.Customer,
                online_session_entity_1.OnlineSession,
                driver_entity_1.Driver,
                menu_item_entity_1.MenuItem,
                menu_item_variant_entity_1.MenuItemVariant,
                order_entity_1.Order,
                driver_progress_stage_entity_1.DriverProgressStage,
                customer_care_inquiry_entity_1.CustomerCareInquiry,
                transaction_entity_1.Transaction,
                fwallet_entity_1.FWallet
            ]),
            customers_module_1.CustomersModule,
            drivers_module_1.DriversModule,
            restaurants_module_1.RestaurantsModule,
            menu_items_module_1.MenuItemsModule,
            food_categories_module_1.FoodCategoriesModule,
            menu_item_variants_module_1.MenuItemVariantsModule,
            driver_progress_stages_module_1.DriverProgressStagesModule,
            orders_module_1.OrdersModule
        ],
        controllers: [upload_controller_1.UploadController],
        providers: [
            upload_service_1.UploadService,
            restaurants_service_1.RestaurantsService,
            drivers_service_1.DriversService,
            jwt_1.JwtService,
            fwallets_repository_1.FWalletsRepository,
            transactions_repository_1.TransactionsRepository,
            online_sessions_service_1.OnlineSessionsService,
            online_session_repository_1.OnlineSessionsRepository,
            menu_items_service_1.MenuItemsService,
            customers_service_1.CustomersService,
            users_repository_1.UserRepository,
            transactions_service_1.TransactionService,
            promotions_service_1.PromotionsService,
            promotions_repository_1.PromotionsRepository,
            address_book_repository_1.AddressBookRepository,
            food_categories_repository_1.FoodCategoriesRepository,
            driver_progress_stages_repository_1.DriverProgressStagesRepository,
            restaurants_repository_1.RestaurantsRepository,
            customers_repository_1.CustomersRepository,
            drivers_repository_1.DriversRepository,
            drivers_gateway_1.DriversGateway,
            driver_progress_stages_service_1.DriverProgressStagesService,
            menu_items_repository_1.MenuItemsRepository,
            menu_item_variants_repository_1.MenuItemVariantsRepository,
            orders_repository_1.OrdersRepository
        ]
    })
], UploadModule);
//# sourceMappingURL=upload.module.js.map