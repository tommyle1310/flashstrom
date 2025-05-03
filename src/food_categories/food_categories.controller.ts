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
import { FoodCategoriesService } from './food_categories.service';
import { CreateFoodCategoryDto } from './dto/create-food_category.dto';
import { UpdateFoodCategoryDto } from './dto/update-food_category.dto';

@Controller('food-categories')
export class FoodCategoriesController {
  constructor(private readonly foodCategoriesService: FoodCategoriesService) {}

  // Create a new food category
  @Post()
  create(@Body() createFoodCategoryDto: CreateFoodCategoryDto) {
    return this.foodCategoriesService.create(createFoodCategoryDto);
  }

  // Get all food categories
  @Get()
  findAll() {
    return this.foodCategoriesService.findAll();
  }

  @Get('paginated')
  findAllPaginated(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ) {
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    return this.foodCategoriesService.findAllPaginated(parsedPage, parsedLimit);
  }

  // Get a food category by ID
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.foodCategoriesService.findOne(id); // Pass the ID as string directly
  }

  // Update a food category by ID
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateFoodCategoryDto: UpdateFoodCategoryDto
  ) {
    return this.foodCategoriesService.update(id, updateFoodCategoryDto); // Pass the ID as string directly
  }

  // Delete a food category by ID
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.foodCategoriesService.remove(id); // Pass the ID as string directly
  }
}
