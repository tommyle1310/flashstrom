import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createUser(createUserDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get('search')
  searchUsers(
    @Query('q') query: string,
    @Query('user_type')
    userType?: 'customer' | 'driver' | 'restaurant' | 'customer_care' | 'admin',
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20'
  ): Promise<any> | { status: string; data: null; message: string } {
    // Basic validation
    if (!query || query.trim().length === 0) {
      return {
        status: 'InvalidFormatInput',
        data: null,
        message: 'Search query is required'
      };
    }

    if (query.trim().length < 2) {
      return {
        status: 'InvalidFormatInput',
        data: null,
        message: 'Search query must be at least 2 characters long'
      };
    }

    const parsedPage = parseInt(page, 10) || 1;
    const parsedLimit = Math.min(parseInt(limit, 10) || 20, 100); // Max 100 results per page

    return this.usersService.searchUsers({
      query: query.trim(),
      userType,
      page: parsedPage,
      limit: parsedLimit
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
