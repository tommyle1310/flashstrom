"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanionAdminModule = void 0;
const common_1 = require("@nestjs/common");
const companion_admin_controller_1 = require("./companion_admin.controller");
const admin_module_1 = require("../admin.module");
const restaurants_module_1 = require("../../restaurants/restaurants.module");
const customers_module_1 = require("../../customers/customers.module");
const drivers_module_1 = require("../../drivers/drivers.module");
const customer_cares_module_1 = require("../../customer_cares/customer_cares.module");
const auth_service_1 = require("../../auth/auth.service");
const admin_service_1 = require("../admin.service");
const restaurants_service_1 = require("../../restaurants/restaurants.service");
const customer_cares_service_1 = require("../../customer_cares/customer_cares.service");
const drivers_service_1 = require("../../drivers/drivers.service");
const customers_service_1 = require("../../customers/customers.service");
const restaurants_repository_1 = require("../../restaurants/restaurants.repository");
const drivers_repository_1 = require("../../drivers/drivers.repository");
const customers_repository_1 = require("../../customers/customers.repository");
const customer_cares_repository_1 = require("../../customer_cares/customer_cares.repository");
const jwt_1 = require("@nestjs/jwt");
const cart_items_service_1 = require("../../cart_items/cart_items.service");
const users_repository_1 = require("../../users/users.repository");
const fwallets_repository_1 = require("../../fwallets/fwallets.repository");
const users_service_1 = require("../../users/users.service");
const promotions_repository_1 = require("../../promotions/promotions.repository");
const menu_items_repository_1 = require("../../menu_items/menu_items.repository");
const menu_item_variants_repository_1 = require("../../menu_item_variants/menu_item_variants.repository");
const cart_items_repository_1 = require("../../cart_items/cart_items.repository");
const food_categories_repository_1 = require("../../food_categories/food_categories.repository");
const orders_repository_1 = require("../../orders/orders.repository");
const menu_items_service_1 = require("../../menu_items/menu_items.service");
const menu_item_variants_service_1 = require("../../menu_item_variants/menu_item_variants.service");
const address_book_repository_1 = require("../../address_book/address_book.repository");
const typeorm_1 = require("@nestjs/typeorm");
const driver_entity_1 = require("../../drivers/entities/driver.entity");
const restaurant_entity_1 = require("../../restaurants/entities/restaurant.entity");
const customer_entity_1 = require("../../customers/entities/customer.entity");
const customer_care_entity_1 = require("../../customer_cares/entities/customer_care.entity");
const food_category_entity_1 = require("../../food_categories/entities/food_category.entity");
const menu_item_entity_1 = require("../../menu_items/entities/menu_item.entity");
const menu_item_variant_entity_1 = require("../../menu_item_variants/entities/menu_item_variant.entity");
const order_entity_1 = require("../../orders/entities/order.entity");
const cart_item_entity_1 = require("../../cart_items/entities/cart_item.entity");
const address_book_entity_1 = require("../../address_book/entities/address_book.entity");
const user_entity_1 = require("../../users/entities/user.entity");
const fwallet_entity_1 = require("../../fwallets/entities/fwallet.entity");
const promotion_entity_1 = require("../../promotions/entities/promotion.entity");
const driver_progress_stages_repository_1 = require("../../driver_progress_stages/driver_progress_stages.repository");
const driver_progress_stage_entity_1 = require("../../driver_progress_stages/entities/driver_progress_stage.entity");
const address_book_service_1 = require("../../address_book/address_book.service");
const transaction_entity_1 = require("../../transactions/entities/transaction.entity");
const transactions_service_1 = require("../../transactions/transactions.service");
const transactions_repository_1 = require("../../transactions/transactions.repository");
const online_session_entity_1 = require("../../online-sessions/entities/online-session.entity");
const online_session_repository_1 = require("../../online-sessions/online-session.repository");
const online_sessions_service_1 = require("../../online-sessions/online-sessions.service");
const email_service_1 = require("../../mailer/email.service");
const nodemailer = require("nodemailer");
let CompanionAdminModule = class CompanionAdminModule {
};
exports.CompanionAdminModule = CompanionAdminModule;
exports.CompanionAdminModule = CompanionAdminModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                driver_entity_1.Driver,
                restaurant_entity_1.Restaurant,
                customer_entity_1.Customer,
                customer_care_entity_1.CustomerCare,
                food_category_entity_1.FoodCategory,
                menu_item_entity_1.MenuItem,
                menu_item_variant_entity_1.MenuItemVariant,
                order_entity_1.Order,
                cart_item_entity_1.CartItem,
                online_session_entity_1.OnlineSession,
                food_category_entity_1.FoodCategory,
                address_book_entity_1.AddressBook,
                user_entity_1.User,
                fwallet_entity_1.FWallet,
                promotion_entity_1.Promotion,
                transaction_entity_1.Transaction,
                driver_progress_stage_entity_1.DriverProgressStage
            ]),
            admin_module_1.AdminModule,
            restaurants_module_1.RestaurantsModule,
            customers_module_1.CustomersModule,
            drivers_module_1.DriversModule,
            customer_cares_module_1.CustomerCaresModule
        ],
        controllers: [companion_admin_controller_1.CompanionAdminController],
        providers: [
            {
                provide: 'MAIL_TRANSPORT',
                useFactory: async () => {
                    const transporter = nodemailer.createTransport({
                        host: 'sandbox.smtp.mailtrap.io',
                        port: 587,
                        secure: false,
                        auth: {
                            user: '389c1523b80572',
                            pass: '9685cd52ea218d'
                        }
                    });
                    await transporter.verify();
                    return transporter;
                }
            },
            auth_service_1.AuthService,
            admin_service_1.AdminService,
            restaurants_service_1.RestaurantsService,
            customer_cares_service_1.CustomerCareService,
            email_service_1.EmailService,
            drivers_service_1.DriversService,
            online_session_repository_1.OnlineSessionsRepository,
            online_sessions_service_1.OnlineSessionsService,
            address_book_service_1.AddressBookService,
            customers_service_1.CustomersService,
            restaurants_repository_1.RestaurantsRepository,
            customers_repository_1.CustomersRepository,
            customer_cares_repository_1.CustomerCaresRepository,
            jwt_1.JwtService,
            cart_items_service_1.CartItemsService,
            users_repository_1.UserRepository,
            fwallets_repository_1.FWalletsRepository,
            users_service_1.UsersService,
            transactions_service_1.TransactionService,
            transactions_repository_1.TransactionsRepository,
            promotions_repository_1.PromotionsRepository,
            menu_items_repository_1.MenuItemsRepository,
            menu_item_variants_repository_1.MenuItemVariantsRepository,
            cart_items_repository_1.CartItemsRepository,
            driver_progress_stages_repository_1.DriverProgressStagesRepository,
            food_categories_repository_1.FoodCategoriesRepository,
            orders_repository_1.OrdersRepository,
            menu_items_service_1.MenuItemsService,
            menu_item_variants_service_1.MenuItemVariantsService,
            address_book_repository_1.AddressBookRepository,
            drivers_repository_1.DriversRepository
        ]
    })
], CompanionAdminModule);
//# sourceMappingURL=companion_admin.module.js.map