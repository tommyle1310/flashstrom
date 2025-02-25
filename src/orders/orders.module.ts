import { Module, forwardRef } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomerSchema } from 'src/customers/customer.schema';
import { RestaurantSchema } from 'src/restaurants/restaurants.schema';
import { OrderSchema } from './orders.schema';
import { MenuItemSchema } from 'src/menu_items/menu_items.schema';
import { MenuItemVariantSchema } from 'src/menu_item_variants/menu_item_variants.schema';
import { OrdersGateway } from './orders.gateway';
import { DriversModule } from 'src/drivers/drivers.module';
import { DriverSchema } from 'src/drivers/drivers.schema';
import { RestaurantsModule } from 'src/restaurants/restaurants.module';
import { CustomersModule } from 'src/customers/customers.module';
import { MenuItemsModule } from 'src/menu_items/menu_items.module';
import { MenuItemVariantsModule } from 'src/menu_item_variants/menu_item_variants.module';
import { DriverProgressStagesModule } from 'src/driver_progress_stages/driver_progress_stages.module';
import { DriverProgressStageSchema } from 'src/driver_progress_stages/driver_progress_stages.schema';
import { AddressBook } from 'src/address_book/entities/address_book.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AddressBookRepository } from 'src/address_book/address_book.repository';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Order', schema: OrderSchema },
      { name: 'Customer', schema: CustomerSchema },
      { name: 'MenuItem', schema: MenuItemSchema },
      { name: 'MenuItemVariant', schema: MenuItemVariantSchema },
      { name: 'Restaurant', schema: RestaurantSchema },
      { name: 'Driver', schema: DriverSchema },
      { name: 'DriverProgressStage', schema: DriverProgressStageSchema }
    ]),
    TypeOrmModule.forFeature([AddressBook]),
    CustomersModule,
    MenuItemsModule,
    MenuItemVariantsModule,
    forwardRef(() => RestaurantsModule),
    forwardRef(() => DriversModule),
    forwardRef(() => DriverProgressStagesModule)
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersGateway, AddressBookRepository],
  exports: [OrdersService, OrdersGateway]
})
export class OrdersModule {}
