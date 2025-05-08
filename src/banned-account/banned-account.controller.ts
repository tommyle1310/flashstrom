import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { BannedAccountService } from './banned-account.service';
import { CreateBannedAccountDto } from './dto/create-banned-account.dto';
import { UpdateBannedAccountDto } from './dto/update-banned-account.dto';

@Controller('banned-account')
export class BannedAccountController {
  constructor(private readonly bannedAccountService: BannedAccountService) {}

  @Post()
  create(@Body() createBannedAccountDto: CreateBannedAccountDto) {
    return this.bannedAccountService.create(createBannedAccountDto);
  }

  @Get()
  findAll() {
    return this.bannedAccountService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bannedAccountService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBannedAccountDto: UpdateBannedAccountDto) {
    return this.bannedAccountService.update(+id, updateBannedAccountDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bannedAccountService.remove(+id);
  }
}
