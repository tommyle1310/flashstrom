import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersGateway } from './orders.gateway';
import { OrderSchema } from './orders.schema';
import { MenuItemSchema } from 'src/menu_items/menu_items.schema';
import { MenuItemVariantSchema } from 'src/menu_item_variants/menu_item_variants.schema';
import { DriverSchema } from 'src/drivers/drivers.schema';
import { DriverProgressStageSchema } from 'src/driver_progress_stages/driver_progress_stages.schema';
import { AddressBook } from 'src/address_book/entities/address_book.entity';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { AddressBookRepository } from 'src/address_book/address_book.repository';
import { RestaurantsRepository } from 'src/restaurants/restaurants.repository';
import { CustomersModule } from 'src/customers/customers.module';
import { MenuItemsModule } from 'src/menu_items/menu_items.module';
import { MenuItemVariantsModule } from 'src/menu_item_variants/menu_item_variants.module';
import { RestaurantsModule } from 'src/restaurants/restaurants.module';
import { DriversModule } from 'src/drivers/drivers.module';
import { DriverProgressStagesModule } from 'src/driver_progress_stages/driver_progress_stages.module';
import { FoodCategory } from 'src/food_categories/entities/food_category.entity';
import { FoodCategoriesModule } from 'src/food_categories/food_categories.module';
import { FoodCategoriesRepository } from 'src/food_categories/food_categories.repository';
import { Customer } from 'src/customers/entities/customer.entity';
import { CustomersRepository } from 'src/customers/customers.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Order', schema: OrderSchema },
      { name: 'MenuItem', schema: MenuItemSchema },
      { name: 'MenuItemVariant', schema: MenuItemVariantSchema },
      { name: 'Driver', schema: DriverSchema },
      { name: 'DriverProgressStage', schema: DriverProgressStageSchema }
    ]),
    TypeOrmModule.forFeature([AddressBook, Restaurant, FoodCategory, Customer]),
    FoodCategoriesModule,
    forwardRef(() => CustomersModule),
    forwardRef(() => MenuItemsModule),
    forwardRef(() => MenuItemVariantsModule),
    forwardRef(() => RestaurantsModule),
    forwardRef(() => DriversModule),
    forwardRef(() => DriverProgressStagesModule)
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrdersGateway,
    AddressBookRepository,
    RestaurantsRepository,
    FoodCategoriesRepository,
    CustomersRepository
  ],
  exports: [OrdersService, OrdersGateway]
})
export class OrdersModule {}
