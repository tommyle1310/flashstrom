import { Module } from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { RestaurantsController } from './restaurants.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { RestaurantSchema } from './restaurants.schema';
import { UserSchema } from 'src/user/user.schema';
import { UserModule } from 'src/user/user.module';
import { PromotionsModule } from 'src/promotions/promotions.module'; // Already importing PromotionsModule
import { AddressBookSchema } from 'src/address_book/address_book.schema';
import { AddressBook } from 'src/address_book/address_book.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Restaurant', schema: RestaurantSchema },
    ]), // Register the Restaurant schema
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]), // Register User schema
    UserModule,
    PromotionsModule, // Import PromotionsModule to access PromotionModel
    MongooseModule.forFeature([
      { name: 'AddressBook', schema: AddressBookSchema },
    ]), // Register AddressBook schema
    AddressBook,
  ],
  controllers: [RestaurantsController],
  providers: [RestaurantsService],
  exports: [RestaurantsService],
})
export class RestaurantsModule {}
