import {
  Body,
  Controller,
  Param,
  Post,
  Get,
  Patch,
  Delete
} from '@nestjs/common';
import { DriverProgressStagesService } from './driver_progress_stages.service';
import { CreateDriverProgressStageDto } from './dto/create-driver-progress-stage.dto';
import { UpdateDriverProgressStageDto } from './dto/update-driver-progress-stage.dto';
// import { createResponse } from 'src/utils/createResponse';

@Controller('driver-progress-stages')
export class DriverProgressStagesController {
  constructor(
    private readonly driverProgressStagesService: DriverProgressStagesService
  ) {}

  @Post()
  create(@Body() createDto: CreateDriverProgressStageDto) {
    return this.driverProgressStagesService.create(createDto);
  }

  @Get()
  findAll() {
    return this.driverProgressStagesService.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.driverProgressStagesService.findById(id);
  }

  @Get('driver/:driverId')
  getActiveStageByDriver(@Param('driverId') driverId: string) {
    return this.driverProgressStagesService.getActiveStageByDriver(driverId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateDriverProgressStageDto
  ) {
    return this.driverProgressStagesService.updateStage(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.driverProgressStagesService.remove(id);
  }
}
