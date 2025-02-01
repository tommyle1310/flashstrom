import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomerSchema } from 'src/customers/customer.schema';
import { CustomersModule } from 'src/customers/customers.module';
import { RestaurantSchema } from 'src/restaurants/restaurants.schema';
import { RestaurantsModule } from 'src/restaurants/restaurants.module';
import { OrderSchema } from './orders.schema';
import { AddressBook } from 'src/address_book/address_book.module';
import { AddressBookSchema } from 'src/address_book/address_book.schema';
import { MenuItemSchema } from 'src/menu_items/menu_items.schema';
import { MenuItemsModule } from 'src/menu_items/menu_items.module';
import { MenuItemVariantSchema } from 'src/menu_item_variants/menu_item_variants.schema';
import { MenuItemVariantsModule } from 'src/menu_item_variants/menu_item_variants.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Customer', schema: CustomerSchema }]),
    CustomersModule,
    MongooseModule.forFeature([{ name: 'MenuItem', schema: MenuItemSchema }]),
    MenuItemsModule,
    MongooseModule.forFeature([
      { name: 'MenuItemVariant', schema: MenuItemVariantSchema },
    ]),
    MenuItemVariantsModule,
    MongooseModule.forFeature([
      { name: 'Restaurant', schema: RestaurantSchema },
    ]),
    RestaurantsModule,
    MongooseModule.forFeature([
      { name: 'AddressBook', schema: AddressBookSchema },
    ]),
    AddressBook,
    MongooseModule.forFeature([{ name: 'Order', schema: OrderSchema }]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
