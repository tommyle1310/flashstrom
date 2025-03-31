"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestaurantsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const restaurants_service_1 = require("./restaurants.service");
const restaurants_controller_1 = require("./restaurants.controller");
const restaurants_gateway_1 = require("./restaurants.gateway");
const restaurant_entity_1 = require("./entities/restaurant.entity");
const restaurants_repository_1 = require("./restaurants.repository");
const drivers_module_1 = require("../drivers/drivers.module");
const menu_items_module_1 = require("../menu_items/menu_items.module");
const menu_item_variants_module_1 = require("../menu_item_variants/menu_item_variants.module");
const orders_module_1 = require("../orders/orders.module");
const event_emitter_1 = require("@nestjs/event-emitter");
const users_module_1 = require("../users/users.module");
const promotions_module_1 = require("../promotions/promotions.module");
const food_categories_module_1 = require("../food_categories/food_categories.module");
const address_book_module_1 = require("../address_book/address_book.module");
const address_book_entity_1 = require("../address_book/entities/address_book.entity");
const address_book_repository_1 = require("../address_book/address_book.repository");
const food_category_entity_1 = require("../food_categories/entities/food_category.entity");
const food_categories_repository_1 = require("../food_categories/food_categories.repository");
const cart_items_module_1 = require("../cart_items/cart_items.module");
const order_entity_1 = require("../orders/entities/order.entity");
const orders_repository_1 = require("../orders/orders.repository");
const users_repository_1 = require("../users/users.repository");
const user_entity_1 = require("../users/entities/user.entity");
const jwt_1 = require("@nestjs/jwt");
const transactions_service_1 = require("../transactions/transactions.service");
const transaction_entity_1 = require("../transactions/entities/transaction.entity");
const fwallet_entity_1 = require("../fwallets/entities/fwallet.entity");
const fwallets_repository_1 = require("../fwallets/fwallets.repository");
const transactions_repository_1 = require("../transactions/transactions.repository");
const promotions_repository_1 = require("../promotions/promotions.repository");
const promotion_entity_1 = require("../promotions/entities/promotion.entity");
let RestaurantsModule = class RestaurantsModule {
};
exports.RestaurantsModule = RestaurantsModule;
exports.RestaurantsModule = RestaurantsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                restaurant_entity_1.Restaurant,
                address_book_entity_1.AddressBook,
                transaction_entity_1.Transaction,
                food_category_entity_1.FoodCategory,
                promotion_entity_1.Promotion,
                order_entity_1.Order,
                fwallet_entity_1.FWallet,
                user_entity_1.User
            ]),
            users_module_1.UsersModule,
            address_book_module_1.AddressBookModule,
            (0, common_1.forwardRef)(() => drivers_module_1.DriversModule),
            (0, common_1.forwardRef)(() => orders_module_1.OrdersModule),
            (0, common_1.forwardRef)(() => menu_items_module_1.MenuItemsModule),
            (0, common_1.forwardRef)(() => menu_item_variants_module_1.MenuItemVariantsModule),
            (0, common_1.forwardRef)(() => cart_items_module_1.CartItemsModule),
            promotions_module_1.PromotionsModule,
            food_categories_module_1.FoodCategoriesModule,
            event_emitter_1.EventEmitterModule.forRoot()
        ],
        controllers: [restaurants_controller_1.RestaurantsController],
        providers: [
            restaurants_service_1.RestaurantsService,
            restaurants_repository_1.RestaurantsRepository,
            restaurants_gateway_1.RestaurantsGateway,
            address_book_repository_1.AddressBookRepository,
            food_categories_repository_1.FoodCategoriesRepository,
            users_repository_1.UserRepository,
            address_book_repository_1.AddressBookRepository,
            orders_repository_1.OrdersRepository,
            jwt_1.JwtService,
            transactions_service_1.TransactionService,
            fwallets_repository_1.FWalletsRepository,
            transactions_repository_1.TransactionsRepository,
            promotions_repository_1.PromotionsRepository
        ],
        exports: [
            restaurants_service_1.RestaurantsService,
            restaurants_repository_1.RestaurantsRepository,
            restaurants_gateway_1.RestaurantsGateway,
            address_book_repository_1.AddressBookRepository
        ]
    })
], RestaurantsModule);
//# sourceMappingURL=restaurants.module.js.map