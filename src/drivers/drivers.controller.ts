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

@Controller('drivers') // Updated route to 'drivers'
export class DriversController {
  constructor(private readonly driversService: DriversService) {} // Corrected service to DriversService

  @Post()
  create(@Body() createDriverDto: CreateDriverDto) {
    return this.driversService.create(createDriverDto); // Corrected service method to use driversService
  }

  @Get()
  findAll() {
    console.log('co lot vao');

    return this.driversService.findAll(); // Corrected service method to use driversService
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
