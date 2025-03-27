import {
  Body,
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Query
} from '@nestjs/common';
import { StatisticRecordsService } from './statistic-records.service';
import { CreateStatisticRecordDto } from './dto/create-statistic-record.dto';
import { UpdateStatisticRecordDto } from './dto/update-statistic-record.dto';

@Controller('statistic-records')
export class StatisticRecordsController {
  constructor(
    private readonly statisticRecordsService: StatisticRecordsService
  ) {}

  @Post()
  create(@Body() createStatisticRecordDto: CreateStatisticRecordDto) {
    return this.statisticRecordsService.create(createStatisticRecordDto);
  }

  @Get()
  findAll() {
    return this.statisticRecordsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.statisticRecordsService.findOne(id);
  }

  @Get('/by-driver/:driverId')
  async findByDriverId(
    @Param('driverId') driverId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    return this.statisticRecordsService.findByDriverId({
      driverId,
      limit: limitNum,
      offset: offsetNum
    });
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateStatisticRecordDto: UpdateStatisticRecordDto
  ) {
    return this.statisticRecordsService.update(id, updateStatisticRecordDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.statisticRecordsService.remove(id);
  }
}
