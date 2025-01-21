import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from './user/user.module';
import { AddressBook as AddressBookModule } from './address_book/address_book.module';
import { CustomersModule } from './customers/customers.module';
import { DriversModule } from './drivers/drivers.module';
import { UploadModule } from './upload/upload.module';
import { AuthModule } from './auth/auth.module'; // Make sure AuthModule is imported here
import { EmailService } from './mailer/email.service';
import { MailerCustomModule } from './mailer/mailer.module'; // Import MailerCustomModule (which configures MailerService)
import { FwalletsModule } from './fwallets/fwallets.module';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI), // Your MongoDB URI
    UserModule,
    AddressBookModule,
    CustomersModule,
    DriversModule,
    UploadModule,
    AuthModule, // Ensure AuthModule is imported
    MailerCustomModule,
    FwalletsModule, // Import the mailer module here
  ],
  controllers: [AppController],
  providers: [AppService, EmailService],
})
export class AppModule {}
