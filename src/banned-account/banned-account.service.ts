import { Injectable } from '@nestjs/common';
import { CreateBannedAccountDto } from './dto/create-banned-account.dto';
import { UpdateBannedAccountDto } from './dto/update-banned-account.dto';

@Injectable()
export class BannedAccountService {
  create(createBannedAccountDto: CreateBannedAccountDto) {
    return 'This action adds a new bannedAccount';
  }

  findAll() {
    return `This action returns all bannedAccount`;
  }

  findOne(id: number) {
    return `This action returns a #${id} bannedAccount`;
  }

  update(id: number, updateBannedAccountDto: UpdateBannedAccountDto) {
    return `This action updates a #${id} bannedAccount`;
  }

  remove(id: number) {
    return `This action removes a #${id} bannedAccount`;
  }
}
