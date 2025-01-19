// app.module.ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from './user/user.module';
import { AddressBook as AddressBookModule } from './address_book/address_book.module';
import { CustomersModule } from './customers/customers.module';
import { UploadModule } from './upload/upload.module';
import { AuthModule } from './auth/auth.module'; // Make sure AuthModule is imported here

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI), // Your MongoDB URI
    UserModule,
    AddressBookModule,
    CustomersModule,
    UploadModule,
    AuthModule, // Ensure AuthModule is imported
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
