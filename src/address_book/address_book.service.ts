import { Injectable } from '@nestjs/common';
import { AddressBookRepository } from './address_book.repository';
import { CreateAddressBookDto } from './dto/create-address_book.dto';
import { UpdateAddressBookDto } from './dto/update-address_book.dto';
import { createResponse, ApiResponse } from 'src/utils/createResponse';
import { AddressBook } from './entities/address_book.entity';
import { CustomersRepository } from 'src/customers/customers.repository';

@Injectable()
export class AddressBookService {
  constructor(
    private readonly addressBookRepository: AddressBookRepository,
    private readonly customerRepository: CustomersRepository
  ) {}

  async create(
    createAddressBookDto: CreateAddressBookDto,
    customerId?: string
  ): Promise<ApiResponse<AddressBook>> {
    try {
      console.log('check create address book service', createAddressBookDto);
      const newAddress =
        await this.addressBookRepository.create(createAddressBookDto);
      console.log('check create address book service newAddress', newAddress);

      if (customerId) {
        const customer = await this.customerRepository.findById(customerId);
        if (!customer) {
          return createResponse('NotFound', null, 'Customer not found');
        }

        if (!customer.address) {
          customer.address = [];
        }

        customer.address.push(newAddress);
        await this.customerRepository.save(customer);
      }

      return createResponse('OK', newAddress, 'Address created successfully');
    } catch (error: any) {
      console.error('Error creating address:', error);
      return createResponse(
        'ServerError',
        null,
        'An error occurred while creating the address'
      );
    }
  }

  async findAll(): Promise<ApiResponse<AddressBook[]>> {
    try {
      const addresses = await this.addressBookRepository.findAll();
      return createResponse('OK', addresses, 'Addresses fetched successfully');
    } catch (error: any) {
      console.error('Error fetching addresses:', error);
      return createResponse(
        'ServerError',
        null,
        'An error occurred while fetching addresses'
      );
    }
  }

  async findOne(id: string): Promise<ApiResponse<AddressBook>> {
    try {
      const address = await this.addressBookRepository.findById(id);
      if (!address) {
        return createResponse('NotFound', null, 'Address not found');
      }
      return createResponse('OK', address, 'Address fetched successfully');
    } catch (error: any) {
      console.error('Error fetching address:', error);
      return createResponse(
        'ServerError',
        null,
        'An error occurred while fetching the address'
      );
    }
  }

  async update(
    id: string,
    updateAddressBookDto: UpdateAddressBookDto
  ): Promise<ApiResponse<AddressBook>> {
    try {
      const updatedAddress = await this.addressBookRepository.update(
        id,
        updateAddressBookDto
      );
      if (!updatedAddress) {
        return createResponse('NotFound', null, 'Address not found');
      }
      return createResponse(
        'OK',
        updatedAddress,
        'Address updated successfully'
      );
    } catch (error: any) {
      console.error('Error updating address:', error);
      return createResponse(
        'ServerError',
        null,
        'An error occurred while updating the address'
      );
    }
  }

  async remove(id: string, customerId?: string): Promise<ApiResponse<null>> {
    try {
      if (customerId) {
        const customer = await this.customerRepository.findById(customerId);
        if (!customer) {
          return createResponse('NotFound', null, 'Customer not found');
        }

        customer.address = customer.address.filter(addr => addr.id !== id);
        await this.customerRepository.save(customer);
      }

      await this.addressBookRepository.delete(id);
      return createResponse('OK', null, 'Address deleted successfully');
    } catch (error: any) {
      console.error('Error deleting address:', error);
      return createResponse(
        'ServerError',
        null,
        'An error occurred while deleting the address'
      );
    }
  }

  async toggleCustomerAddress(
    customerId: string,
    addressId: string
  ): Promise<ApiResponse<any>> {
    try {
      const customer = await this.customerRepository.findById(customerId);
      if (!customer) {
        return createResponse('NotFound', null, 'Customer not found');
      }

      const address = await this.addressBookRepository.findById(addressId);
      if (!address) {
        return createResponse('NotFound', null, 'Address not found');
      }

      if (!customer.address) {
        customer.address = [];
      }

      // Find if address exists in customer's addresses
      const existingIndex = customer.address.findIndex(
        addr => addr.id === addressId
      );
      console.log(
        'cehck what here',
        existingIndex,
        addressId,
        customer.address
      );
      if (existingIndex === -1) {
        return createResponse(
          'NotFound',
          null,
          'Address not associated with customer'
        );
      }

      // Reset all addresses is_default to false
      customer.address.forEach(addr => {
        if (addr.id !== addressId) {
          addr.is_default = false;
        }
      });

      // Toggle is_default for the target address
      customer.address[existingIndex].is_default =
        !customer.address[existingIndex].is_default;

      await this.customerRepository.save(customer);
      return createResponse(
        'OK',
        customer,
        'Customer default address updated successfully'
      );
    } catch (error: any) {
      console.error('Error toggling customer address:', error);
      return createResponse(
        'ServerError',
        null,
        'An error occurred while updating customer address'
      );
    }
  }
}
