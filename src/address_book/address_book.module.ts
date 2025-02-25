import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AddressBookService } from './address_book.service';
import { AddressBookController } from './address_book.controller';
import { AddressBook } from './entities/address_book.entity';
import { AddressBookRepository } from './address_book.repository';
import { CustomerSchema } from 'src/customers/customer.schema';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    TypeOrmModule.forFeature([AddressBook]),
    MongooseModule.forFeature([{ name: 'Customer', schema: CustomerSchema }])
  ],
  controllers: [AddressBookController],
  providers: [AddressBookService, AddressBookRepository],
  exports: [AddressBookService]
})
export class AddressBookModule {}
