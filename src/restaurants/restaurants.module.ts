import { Module } from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { RestaurantsController } from './restaurants.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { RestaurantSchema } from './restaurants.schema';
import { UserSchema } from 'src/user/user.schema';
import { UserModule } from 'src/user/user.module';
import { PromotionSchema } from 'src/promotions/promotions.schema';
import { PromotionsModule } from 'src/promotions/promotions.module';
import { AddressBookSchema } from 'src/address_book/address_book.schema';
import { AddressBook } from 'src/address_book/address_book.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Restaurant', schema: RestaurantSchema },
    ]),
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]), // fwallet model
    UserModule,
    MongooseModule.forFeature([{ name: 'Promotion', schema: PromotionSchema }]), // fwallet model
    PromotionsModule,
    MongooseModule.forFeature([{ name: 'AddressBook', schema: AddressBookSchema }]), // fwallet model
    AddressBook,
  ],
  controllers: [RestaurantsController],
  providers: [RestaurantsService],
})
export class RestaurantsModule {}
