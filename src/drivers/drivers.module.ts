import { forwardRef, Module } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { DriversController } from './drivers.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { DriverSchema } from './drivers.schema';
import { UserSchema } from 'src/user/user.schema';
import { DriversGateway } from './drivers.gateway';
import { AddressBookSchema } from 'src/address_book/address_book.schema';
import { AddressBookService } from 'src/address_book/address_book.service';
import { AddressBook } from 'src/address_book/address_book.module';
import { CustomerSchema } from 'src/customers/customer.schema';
import { RestaurantSchema } from 'src/restaurants/restaurants.schema';
import { RestaurantsModule } from 'src/restaurants/restaurants.module';
import { OrdersModule } from 'src/orders/orders.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Driver', schema: DriverSchema },
      { name: 'User', schema: UserSchema },
      { name: 'AddressBook', schema: AddressBookSchema },
      { name: 'Restaurant', schema: RestaurantSchema },
      { name: 'Customer', schema: CustomerSchema }
    ]),
    AddressBook,
    forwardRef(() => RestaurantsModule),
    forwardRef(() => OrdersModule)
  ],
  controllers: [DriversController],
  providers: [DriversService, DriversGateway, AddressBookService],
  exports: [DriversService, DriversGateway]
})
export class DriversModule {}
