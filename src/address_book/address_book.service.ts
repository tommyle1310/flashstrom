import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AddressBook } from './address_book.schema';
import { CreateAddressBookDto } from './dto/create-address_book.dto'; // Import the DTO
import { UpdateAddressBookDto } from './dto/update-address_book.dto';
import { createResponse } from 'src/utils/createResponse'; // Import the createResponse function
import { Customer } from 'src/customers/customer.schema';

@Injectable()
export class AddressBookService {
  constructor(
    @InjectModel('AddressBook')
    private readonly AddressBookModel: Model<AddressBook>,
    @InjectModel('Customer')
    private readonly customerModel: Model<Customer>,
  ) {}

  // Create a new address book entry
  async createAddressBook(
    createAddressBookDto: CreateAddressBookDto, // Accept the DTO as an argument
  ): Promise<any> {
    const {
      street,
      city,
      nationality,
      postal_code,
      location,
      title,
      is_default,
    } = createAddressBookDto;

    // Check if the address already exists (simplified example)
    const existingAddressBook = await this.AddressBookModel.findOne({
      street,
      city,
    }).exec();
    if (existingAddressBook) {
      // If address already exists, return a response with error without going into the catch block
      return createResponse('DuplicatedRecord', null, 'Address already exists');
    }

    try {
      // Create a new address book object
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

      // Save the new address book to the database
      await newAddressBook.save();

      // Return success response
      return createResponse(
        'OK',
        newAddressBook,
        'Address book created successfully',
      );
    } catch (error) {
      // Handle unexpected errors and return a generic server error response
      return createResponse(
        'ServerError',
        null,
        'An error occurred while creating the address book',
      );
    }
  }

  // Retrieve all address books
  async getAllAddressBooks(): Promise<any> {
    try {
      const addressBooks = await this.AddressBookModel.find().exec();
      return createResponse('OK', addressBooks, 'Fetched all address books');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while fetching address books',
      );
    }
  }

  // Get a single address book by ID
  async getAddressBookById(id: string): Promise<any> {
    const addressBook = await this.AddressBookModel.findById(id).exec();
    if (!addressBook) {
      return createResponse('NotFound', null, 'Address book not found');
    }
    try {
      return createResponse(
        'OK',
        addressBook,
        'Fetched address book successfully',
      );
    } catch (e) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while creating the address book',
      );
    }
  }

  // Update an existing address book entry
  async updateAddressBook(
    id: string,
    updateData: UpdateAddressBookDto,
    entityId?: string, // Optional parameter id
  ): Promise<any> {
    if (entityId) {
      // Find the customer by entityId and check if the address exists in the customer's address array
      const customer = await this.customerModel.findOne({
        _id: entityId,
        address: { $in: [id] }, // Check if the addressId exists in the customer's address array
      });

      if (!customer) {
        return createResponse('NotFound', null, 'Customer not found');
      }
      console.log('check csus', customer);

      // Iterate over the customer's address array and set is_default: false for all addresses
      await Promise.all(
        customer.address.map(async (addressId) => {
          const address = await this.AddressBookModel.findById(addressId);
          if (address && address.is_default) {
            // If any address has is_default = true, set it to false
            await this.AddressBookModel.findByIdAndUpdate(
              address._id,
              { is_default: false },
              { new: true },
            );
          }
        }),
      );

      // Now, find and update the address with the provided id to set is_default = true
      const updatedAddressBook = await this.AddressBookModel.findByIdAndUpdate(
        id,
        { ...updateData, is_default: true }, // Ensure is_default is true for the updated address
        { new: true },
      ).exec();

      if (!updatedAddressBook) {
        return createResponse('NotFound', null, 'Address book not found');
      }

      return createResponse(
        'OK',
        updatedAddressBook,
        'Address book updated successfully',
      );
    }

    // If is_default is not provided in the updateData, proceed with the regular update
    const updatedAddressBook = await this.AddressBookModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true },
    ).exec();
    console.log('check updated one', updatedAddressBook, id, updateData);

    if (!updatedAddressBook) {
      return createResponse('NotFound', null, 'Address book not found');
    }

    return createResponse(
      'OK',
      updatedAddressBook,
      'Address book updated successfully',
    );
  }

  // Delete an address book entry by ID
  async deleteAddressBook(id: string): Promise<any> {
    const deletedAddressBook =
      await this.AddressBookModel.findByIdAndDelete(id).exec();
    if (!deletedAddressBook) {
      return createResponse('NotFound', null, 'Address book not found');
    }
    try {
      return createResponse('OK', null, 'Address book deleted successfully');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while creating the address book',
      );
    }
  }
}
