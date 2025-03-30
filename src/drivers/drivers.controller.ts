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
import { DriversService } from './drivers.service'; // Corrected to use DriversService
import { CreateDriverDto, UpdateVehicleDto } from './dto/create-driver.dto'; // Corrected to use CreateDriverDto
import { UpdateDriverDto } from './dto/update-driver.dto'; // Corrected to use UpdateDriverDto
import { OnlineSessionsService } from 'src/online-sessions/online-sessions.service';
import { createResponse } from 'src/utils/createResponse';

@Controller('drivers') // Updated route to 'drivers'
export class DriversController {
  constructor(
    private readonly driversService: DriversService,
    private readonly onlineSessionsService: OnlineSessionsService
  ) {} // Corrected service to DriversService

  @Post()
  create(@Body() createDriverDto: CreateDriverDto) {
    return this.driversService.create(createDriverDto); // Corrected service method to use driversService
  }

  @Get()
  findAll() {
    return this.driversService.findAll(); // Corrected service method to use driversService
  }

  @Get('/online-session/:driver')
  async findOnlineSessionByDriverId(
    @Param('driver') driverId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10; // Mặc định 10
    const offsetNum = offset ? parseInt(offset, 10) : 0; // Mặc định 0
    const response = await this.onlineSessionsService.findByDriverId({
      driverId,
      limit: limitNum,
      offset: offsetNum
    });
    const { EC, EM, data } = response;
    if (EC === 0) {
      const groupedData = data.reduce(
        (acc: any[], curr: { start_time: number; end_time: number }) => {
          // Chuyển timestamp sang định dạng ngày
          const date = new Date(parseInt(`${curr.start_time}`) * 1000)
            .toISOString()
            .split('T')[0];

          // Tính thời gian online của object hiện tại (milliseconds)
          const onlineTime =
            (parseInt(`${curr.end_time}`) - parseInt(`${curr.start_time}`)) *
            1000;

          // Tìm nhóm theo ngày
          let group = acc.find(item => item.date === date);
          if (!group) {
            group = { date: date, items: [], total_online_hours: 0 };
            acc.push(group);
          }

          // Thêm object vào nhóm và cộng dồn thời gian
          group.items.push(curr);
          group.total_online_hours += onlineTime;

          return acc;
        },
        []
      );
      const result = groupedData.map(group => ({
        date: group.date,
        items: group.items,
        total_online_hours: this.driversService.formatTime(
          group.total_online_hours
        )
      }));
      return createResponse('OK', result, null);
    }
  }

  @Get('/driver-progress-stages/:driver')
  async findAllDpsByDriverId(
    @Param('driver') driverId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    // Chuyển đổi limit và offset thành số, đặt mặc định nếu không có
    const limitNum = limit ? parseInt(limit, 10) : 5; // Mặc định lấy 5
    const offsetNum = offset ? parseInt(offset, 10) : 0; // Mặc định offset là 0

    // Gọi service để lấy danh sách DriverProgressStage
    const stages = await this.driversService.getAllDriverProgressStages({
      driverId,
      offset: offsetNum,
      limit: limitNum
    });
    return stages;
  }
  @Get(':id')
  findDriverById(@Param('id') id: string) {
    return this.driversService.findDriverById(id); // Corrected service method to use driversService
  }

  @Get(':field/:value')
  findOne(@Param('field') field: string, @Param('value') value: string) {
    return this.driversService.findOne({ [field]: value }); // Corrected service method to use driversService
  }

  @Patch('vehicle/:driverId')
  async updateDriverVehicle(
    @Body() updateVehicleDto: UpdateVehicleDto,
    @Param('driverId') driverId: string
  ) {
    return await this.driversService.updateVehicle(driverId, updateVehicleDto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDriverDto: UpdateDriverDto // Corrected DTO to UpdateDriverDto
  ) {
    return this.driversService.update(id, updateDriverDto); // Corrected service method to use driversService
  }

  @Patch(':id/availability')
  setAvailability(@Param('id') id: string) {
    return this.driversService.setAvailability(id); // Call service with the id
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.driversService.remove(id); // Corrected service method to use driversService
  }
}
