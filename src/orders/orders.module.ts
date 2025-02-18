import { Module, forwardRef } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomerSchema } from 'src/customers/customer.schema';
import { RestaurantSchema } from 'src/restaurants/restaurants.schema';
import { OrderSchema } from './orders.schema';
import { AddressBookSchema } from 'src/address_book/address_book.schema';
import { MenuItemSchema } from 'src/menu_items/menu_items.schema';
import { MenuItemVariantSchema } from 'src/menu_item_variants/menu_item_variants.schema';
import { OrdersGateway } from './orders.gateway';
import { DriversModule } from 'src/drivers/drivers.module';
import { DriverSchema } from 'src/drivers/drivers.schema';
import { RestaurantsModule } from 'src/restaurants/restaurants.module';
import { CustomersModule } from 'src/customers/customers.module';
import { MenuItemsModule } from 'src/menu_items/menu_items.module';
import { MenuItemVariantsModule } from 'src/menu_item_variants/menu_item_variants.module';
import { AddressBook } from 'src/address_book/address_book.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Order', schema: OrderSchema },
      { name: 'Customer', schema: CustomerSchema },
      { name: 'MenuItem', schema: MenuItemSchema },
      { name: 'MenuItemVariant', schema: MenuItemVariantSchema },
      { name: 'Restaurant', schema: RestaurantSchema },
      { name: 'Driver', schema: DriverSchema },
      { name: 'AddressBook', schema: AddressBookSchema }
    ]),
    CustomersModule,
    MenuItemsModule,
    AddressBook,
    MenuItemVariantsModule,
    forwardRef(() => RestaurantsModule),
    forwardRef(() => DriversModule)
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersGateway],
  exports: [OrdersService, OrdersGateway]
})
export class OrdersModule {}
