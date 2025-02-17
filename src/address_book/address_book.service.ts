import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AddressBook } from './address_book.schema';
import { CreateAddressBookDto } from './dto/create-address_book.dto';
import { UpdateAddressBookDto } from './dto/update-address_book.dto';
import { createResponse } from 'src/utils/createResponse';
import { ApiResponse } from 'src/utils/createResponse';
import { Customer } from 'src/customers/customer.schema';

@Injectable()
export class AddressBookService {
  constructor(
    @InjectModel('AddressBook')
    private readonly addressBookModel: Model<AddressBook>,
    @InjectModel('Customer') private readonly customerModel: Model<Customer>
  ) {}

  async createAddressBook(
    createAddressBookDto: CreateAddressBookDto
  ): Promise<ApiResponse<AddressBook>> {
    try {
      const existingAddress =
        await this.findExistingAddress(createAddressBookDto);
      if (existingAddress) {
        return this.handleDuplicateAddress();
      }

      const newAddress = await this.saveNewAddress(createAddressBookDto);
      return createResponse(
        'OK',
        newAddress,
        'Address book created successfully'
      );
    } catch (error) {
      return this.handleError('Error creating address book:', error);
    }
  }

  async getAllAddressBooks(): Promise<ApiResponse<AddressBook[]>> {
    try {
      const addressBooks = await this.addressBookModel.find().exec();
      return createResponse('OK', addressBooks, 'Fetched all address books');
    } catch (error) {
      return this.handleError('Error fetching address books:', error);
    }
  }

  async getAddressBookById(id: string): Promise<ApiResponse<AddressBook>> {
    try {
      const addressBook = await this.addressBookModel.findById(id).exec();
      return this.handleAddressBookResponse(addressBook);
    } catch (error) {
      return this.handleError('Error fetching address book:', error);
    }
  }

  async updateAddressBook(
    id: string,
    updateData: UpdateAddressBookDto,
    entityId?: string
  ): Promise<ApiResponse<AddressBook>> {
    try {
      if (entityId) {
        return await this.handleCustomerAddressUpdate(id, updateData, entityId);
      }

      const updatedAddress = await this.addressBookModel
        .findByIdAndUpdate(id, updateData, { new: true })
        .exec();
      return this.handleAddressBookResponse(updatedAddress);
    } catch (error) {
      return this.handleError('Error updating address book:', error);
    }
  }

  async deleteAddressBook(id: string): Promise<ApiResponse<null>> {
    try {
      const deletedAddress = await this.addressBookModel
        .findByIdAndDelete(id)
        .exec();
      if (!deletedAddress) {
        return createResponse('NotFound', null, 'Address book not found');
      }
      return createResponse('OK', null, 'Address book deleted successfully');
    } catch (error) {
      return this.handleError('Error deleting address book:', error);
    }
  }

  // Private helper methods
  private async findExistingAddress(
    addressData: CreateAddressBookDto
  ): Promise<AddressBook | null> {
    return this.addressBookModel
      .findOne({
        street: addressData.street,
        city: addressData.city
      })
      .exec();
  }

  private async saveNewAddress(
    addressData: CreateAddressBookDto
  ): Promise<AddressBook> {
    const newAddress = new this.addressBookModel({
      ...addressData,
      created_at: new Date().getTime(),
      updated_at: new Date().getTime()
    });
    return newAddress.save();
  }

  private async handleCustomerAddressUpdate(
    id: string,
    updateData: UpdateAddressBookDto,
    entityId: string
  ): Promise<ApiResponse<AddressBook>> {
    const customer = await this.findCustomerWithAddress(entityId, id);
    if (!customer) {
      return createResponse('NotFound', null, 'Customer not found');
    }

    await this.updateCustomerAddresses(customer.address);
    const updatedAddress = await this.updateAddressWithDefault(id, updateData);

    if (!updatedAddress) {
      return createResponse('NotFound', null, 'Address book not found');
    }

    return createResponse(
      'OK',
      updatedAddress,
      'Address book updated successfully'
    );
  }

  private async findCustomerWithAddress(
    entityId: string,
    addressId: string
  ): Promise<Customer | null> {
    return this.customerModel.findOne({
      _id: entityId,
      address: { $in: [addressId] }
    });
  }

  private async updateCustomerAddresses(addresses: string[]): Promise<void> {
    await Promise.all(
      addresses.map(async addressId => {
        const address = await this.addressBookModel.findById(addressId);
        if (address?.is_default) {
          await this.addressBookModel.findByIdAndUpdate(
            address._id,
            { is_default: false },
            { new: true }
          );
        }
      })
    );
  }

  private async updateAddressWithDefault(
    id: string,
    updateData: UpdateAddressBookDto
  ): Promise<AddressBook | null> {
    return this.addressBookModel
      .findByIdAndUpdate(id, { ...updateData, is_default: true }, { new: true })
      .exec();
  }

  private handleDuplicateAddress(): ApiResponse<null> {
    return createResponse('DuplicatedRecord', null, 'Address already exists');
  }

  private handleAddressBookResponse(
    addressBook: AddressBook | null
  ): ApiResponse<AddressBook> {
    if (!addressBook) {
      return createResponse('NotFound', null, 'Address book not found');
    }
    return createResponse(
      'OK',
      addressBook,
      'Address book retrieved successfully'
    );
  }

  private handleError(message: string, error: any): ApiResponse<null> {
    console.error(message, error);
    return createResponse(
      'ServerError',
      null,
      'An error occurred while processing your request'
    );
  }
}
