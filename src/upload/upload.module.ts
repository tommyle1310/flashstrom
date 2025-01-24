import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { CustomersModule } from 'src/customers/customers.module';
import { DriversModule } from 'src/drivers/drivers.module';
import { RestaurantsModule } from 'src/restaurants/restaurants.module'; // Import RestaurantsModule
import { UserModule } from 'src/user/user.module';
import { PromotionsModule } from 'src/promotions/promotions.module';
import { CustomerSchema } from 'src/customers/customer.schema';
import { DriverSchema } from 'src/drivers/drivers.schema';
import { RestaurantSchema } from 'src/restaurants/restaurants.schema';
import { UserSchema } from 'src/user/user.schema';
import { RestaurantsService } from 'src/restaurants/restaurants.service';
import { DriversService } from 'src/drivers/drivers.service';
import { CustomersService } from 'src/customers/customers.service';
import { AddressBookSchema } from 'src/address_book/address_book.schema';
import { AddressBook } from 'src/address_book/address_book.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'AddressBook', schema: AddressBookSchema },
    ]),
    AddressBook, // Import AddressBookModule

    MongooseModule.forFeature([{ name: 'Customer', schema: CustomerSchema }]),
    CustomersModule,
    MongooseModule.forFeature([{ name: 'Driver', schema: DriverSchema }]),
    DriversModule,
    MongooseModule.forFeature([
      { name: 'Restaurant', schema: RestaurantSchema },
    ]),
    RestaurantsModule, // Ensure RestaurantsModule is imported
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),
    UserModule,
    PromotionsModule, // Import PromotionsModule to make PromotionModel available
  ],
  controllers: [UploadController],
  providers: [
    UploadService,
    RestaurantsService,
    DriversService,
    CustomersService,
  ],
})
export class UploadModule {}
