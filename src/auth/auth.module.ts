import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from 'src/user/user.module';  // Import UserModule to make the UserModel available
import { JwtStrategy } from './jwt.strategy'; // Your JwtStrategy
import { AuthService } from './auth.service'; // Your AuthService
import { UserSchema } from 'src/user/user.schema';
import { CustomersModule } from 'src/customers/customers.module';
import { CustomerSchema } from 'src/customers/customer.schema';
import { AuthController } from './auth.controller';
import { EmailService } from 'src/mailer/email.service';
import { MailerCustomModule } from 'src/mailer/mailer.module';
import { UserService } from 'src/user/user.service';
import { DriversModule } from 'src/drivers/drivers.module';
import { DriversService } from 'src/drivers/drivers.service';
import { DriverSchema } from 'src/drivers/drivers.schema';
import { FWalletService } from 'src/fwallets/fwallets.service';
import { FWalletSchema } from 'src/fwallets/fwallets.schema';
import { FwalletsModule } from 'src/fwallets/fwallets.module';
import { RestaurantSchema } from 'src/restaurants/restaurants.schema';
import { RestaurantsModule } from 'src/restaurants/restaurants.module';
import { RestaurantsService } from 'src/restaurants/restaurants.service';
import { PromotionSchema } from 'src/promotions/promotions.schema';
import { PromotionsModule } from 'src/promotions/promotions.module';
import { AddressBookSchema } from 'src/address_book/address_book.schema';
import { AddressBook } from 'src/address_book/address_book.module';
import { AddressBookService } from 'src/address_book/address_book.service';
import { PromotionsService } from 'src/promotions/promotions.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,  // Your JWT secret
      signOptions: { expiresIn: '1h' }, // Token expiration time
    }),
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]), // Make sure the User model is available
    UserModule, // Import UserModule to make the UserService available
    MongooseModule.forFeature([{ name: 'Customer', schema: CustomerSchema }]), // Customer model
    CustomersModule,
    MongooseModule.forFeature([{ name: 'Driver', schema: DriverSchema }]), // driver model
    DriversModule,
    MongooseModule.forFeature([{ name: 'FWallet', schema: FWalletSchema }]), // fwallet model
    FwalletsModule,
    MongooseModule.forFeature([{ name: 'Restaurant', schema: RestaurantSchema }]), // fwallet model
    RestaurantsModule,
    MongooseModule.forFeature([{ name: 'Promotion', schema: PromotionSchema }]), // fwallet model
    PromotionsModule,
    MongooseModule.forFeature([{ name: 'AddressBook', schema: AddressBookSchema }]), // fwallet model
    AddressBook,
    MailerCustomModule,  // Import Mailer module to handle emails
  ],
  providers: [AuthService, JwtStrategy, EmailService, UserService, DriversService, FWalletService, RestaurantsService, AddressBookService, PromotionsService], // Make sure EmailService is included here
  controllers: [AuthController], // Only controllers should be listed here
  exports: [AuthService, EmailService], // Export AuthService and EmailService if needed in other modules
})
export class AuthModule {}
