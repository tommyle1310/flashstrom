import { Injectable } from '@nestjs/common';
import { AddressBookRepository } from './address_book.repository';
import { CreateAddressBookDto } from './dto/create-address_book.dto';
import { UpdateAddressBookDto } from './dto/update-address_book.dto';
import { createResponse } from 'src/utils/createResponse';
import { ApiResponse } from 'src/utils/createResponse';
import { AddressBook } from './entities/address_book.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Customer } from '../customers/customer.schema';

@Injectable()
export class AddressBookService {
  constructor(
    private readonly addressBookRepository: AddressBookRepository,
    @InjectModel('Customer') private readonly customerModel: Model<Customer>
  ) {}

  async createAddressBook(
    createAddressBookDto: CreateAddressBookDto
  ): Promise<ApiResponse<AddressBook>> {
    try {
      const existingAddress =
        await this.addressBookRepository.findByStreetAndCity(
          createAddressBookDto.street,
          createAddressBookDto.city
        );

      if (existingAddress) {
        return createResponse(
          'DuplicatedRecord',
          null,
          'Address already exists'
        );
      }

      const newAddress =
        await this.addressBookRepository.create(createAddressBookDto);
      return createResponse(
        'OK',
        newAddress,
        'Address book created successfully'
      );
    } catch (error) {
      console.error('Error creating address book:', error);
      return createResponse('ServerError', null, 'Error creating address book');
    }
  }

  async getAllAddressBooks(): Promise<ApiResponse<AddressBook[]>> {
    try {
      const addressBooks = await this.addressBookRepository.findAll();
      return createResponse('OK', addressBooks, 'Fetched all address books');
    } catch (error) {
      console.error('Error fetching address books:', error);
      return createResponse(
        'ServerError',
        null,
        'Error fetching address books'
      );
    }
  }

  async getAddressBookById(id: string): Promise<ApiResponse<AddressBook>> {
    try {
      const addressBook = await this.addressBookRepository.findById(id);
      if (!addressBook) {
        return createResponse('NotFound', null, 'Address book not found');
      }
      return createResponse(
        'OK',
        addressBook,
        'Address book retrieved successfully'
      );
    } catch (error) {
      console.error('Error fetching address book:', error);
      return createResponse('ServerError', null, 'Error fetching address book');
    }
  }

  async updateAddressBook(
    id: string,
    updateData: UpdateAddressBookDto,
    customerId?: string
  ): Promise<ApiResponse<AddressBook>> {
    try {
      const addressBook = await this.addressBookRepository.findById(id);
      if (!addressBook) {
        return createResponse('NotFound', null, 'Address book not found');
      }

      // If customerId is provided, update customer's address array
      if (customerId) {
        const customer = await this.customerModel.findById(customerId);
        if (!customer) {
          return createResponse('NotFound', null, 'Customer not found');
        }

        // Check if address already exists in customer's address array
        if (customer.address.includes(id)) {
          return createResponse(
            'DuplicatedRecord',
            null,
            "Address already exists in customer's address book"
          );
        }

        // Add address to customer's address array
        await this.customerModel.findByIdAndUpdate(
          customerId,
          { $push: { address: id } },
          { new: true }
        );
      }

      const updatedAddress = await this.addressBookRepository.update(
        id,
        updateData
      );
      return createResponse(
        'OK',
        updatedAddress,
        'Address book updated successfully'
      );
    } catch (error) {
      console.error('Error updating address book:', error);
      return createResponse('ServerError', null, 'Error updating address book');
    }
  }

  async deleteAddressBook(id: string): Promise<ApiResponse<null>> {
    try {
      const result = await this.addressBookRepository.delete(id);
      if (!result) {
        return createResponse('NotFound', null, 'Address book not found');
      }
      return createResponse('OK', null, 'Address book deleted successfully');
    } catch (error) {
      console.error('Error deleting address book:', error);
      return createResponse('ServerError', null, 'Error deleting address book');
    }
  }
}
