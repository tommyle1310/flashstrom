import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  // Create a new promotion
  @Post()
  create(@Body() createPromotionDto: CreatePromotionDto) {
    return this.promotionsService.create(createPromotionDto);
  }

  // Get all promotions
  @Get()
  findAll() {
    return this.promotionsService.findAll();
  }

  // Get a promotion by ID
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.promotionsService.findOne(id); // ID passed as string
  }

  // Update a promotion by ID
  @Patch(':id')
  update(
    @Param('id') id: string, 
    @Body() updatePromotionDto: UpdatePromotionDto
  ) {
    return this.promotionsService.update(id, updatePromotionDto); // ID passed as string
  }

  // Delete a promotion by ID
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.promotionsService.remove(id); // ID passed as string
  }
}
