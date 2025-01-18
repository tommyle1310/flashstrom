import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AddressBook } from './address_book.schema';
import { CreateAddressBookDto } from './dto/create-address_book.dto'; // Import the DTO
import { UpdateAddressBookDto } from './dto/update-address_book.dto';

@Injectable()
export class AddressBookService {
  constructor(@InjectModel('AddressBook') private readonly AddressBookModel: Model<AddressBook>) {}

  // Create a new address book entry
  async createAddressBook(
    createAddressBookDto: CreateAddressBookDto, // Accept the DTO as an argument
  ): Promise<AddressBook> {
    const { street, city, nationality, postal_code, location, title, is_default } = createAddressBookDto;

    const newAddressBook = new this.AddressBookModel({
      street,
      city,
      nationality,
      postal_code,
      location,
      title,
      is_default,
      created_at: new Date().getTime(),
      updated_at: new Date().getTime(),
    });

    return newAddressBook.save();
  }

  // Retrieve all address books
  async getAllAddressBooks(): Promise<AddressBook[]> {
    return this.AddressBookModel.find().exec();
  }

   // Get a single address book by ID
  async getAddressBookById(id: string): Promise<AddressBook> {
    return this.AddressBookModel.findById(id).exec();
  }

  // Update an existing address book entry
  async updateAddressBook(id: string, updateData: UpdateAddressBookDto): Promise<AddressBook> {
    return this.AddressBookModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  // Delete an address book entry by ID
  async deleteAddressBook(id: string): Promise<any> {
    return this.AddressBookModel.findByIdAndDelete(id).exec();
  }
}
