import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AddressBookService } from './address_book.service';
import { AddressBookController } from './address_book.controller';
import { AddressBookSchema } from './address_book.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'AddressBook', schema: AddressBookSchema }]),
  ],
  controllers: [AddressBookController],
  providers: [AddressBookService],
})
export class AddressBook {}
