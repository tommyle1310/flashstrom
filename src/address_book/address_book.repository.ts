import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { AddressBook } from './entities/address_book.entity';
import { CreateAddressBookDto } from './dto/create-address_book.dto';
import { UpdateAddressBookDto } from './dto/update-address_book.dto';

@Injectable()
export class AddressBookRepository {
  constructor(
    @InjectRepository(AddressBook)
    private repository: Repository<AddressBook>,
  ) {}

  async create(createDto: CreateAddressBookDto): Promise<AddressBook> {
    const address = this.repository.create(createDto);
    return await this.repository.save(address);
  }

  async findAll(): Promise<AddressBook[]> {
    return await this.repository.find();
  }

  async findById(id: string): Promise<AddressBook | null> {
    return await this.repository.findOne({ where: { id } });
  }

  // async findByUserId(user_id: string): Promise<AddressBook[]> {
  //   return await this.repository.find({ where: { user_id } });
  // }

  // async findDefaultByUserId(user_id: string): Promise<AddressBook | null> {
  //   return await this.repository.findOne({ where: { user_id, is_default: true } });
  // }

  async findByStreetAndCity(street: string, city: string): Promise<AddressBook | null> {
    return await this.repository.findOne({ where: { street, city } });
  }

  async update(id: string, updateDto: UpdateAddressBookDto): Promise<AddressBook | null> {
    const address = await this.findById(id);
    if (!address) return null;
    await this.repository.update(id, {
      ...updateDto,
      updated_at: Math.floor(Date.now() / 1000),
    });
    return await this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected > 0;
  }
}