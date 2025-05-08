import {
  Body,
  Controller,
  Param,
  Post,
  Get,
  Patch,
  Delete,
  Query
} from '@nestjs/common';
import { OnlineSessionsService } from './online-sessions.service'; // Giả định service
import { CreateOnlineSessionDto } from './dto/create-online-session.dto';
import { UpdateOnlineSessionDto } from './dto/update-online-session.dto';

@Controller('online-sessions')
export class OnlineSessionsController {
  constructor(private readonly onlineSessionsService: OnlineSessionsService) {}

  @Post()
  create(@Body() createOnlineSessionDto: CreateOnlineSessionDto) {
    return this.onlineSessionsService.create(createOnlineSessionDto);
  }

  @Get()
  findAll() {
    return this.onlineSessionsService.findAll();
  }

  @Get('/by-driver/:driverId')
  async findByDriverId(
    @Param('driverId') driverId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10; // Mặc định 10
    const offsetNum = offset ? parseInt(offset, 10) : 0; // Mặc định 0
    return this.onlineSessionsService.findByDriverId({
      driverId,
      limit: limitNum,
      offset: offsetNum
    });
  }

  @Get('/by-customer-care/:customerCareId')
  async findByCustomerCareId(
    @Param('customerCareId') customerCareId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10; // Mặc định 10
    const offsetNum = offset ? parseInt(offset, 10) : 0; // Mặc định 0
    return this.onlineSessionsService.findByCustomerCareId({
      customerCareId,
      limit: limitNum,
      offset: offsetNum
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.onlineSessionsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateOnlineSessionDto: UpdateOnlineSessionDto
  ) {
    return this.onlineSessionsService.update(id, updateOnlineSessionDto);
  }

  @Patch(':id/end-session')
  endSession(@Param('id') id: string) {
    return this.onlineSessionsService.endSession(id); // Đánh dấu phiên kết thúc
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.onlineSessionsService.remove(id);
  }
}
