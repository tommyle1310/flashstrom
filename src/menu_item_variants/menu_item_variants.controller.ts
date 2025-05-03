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
import { MenuItemVariantsService } from './menu_item_variants.service';
import { CreateMenuItemVariantDto } from './dto/create-menu_item_variant.dto';
import { UpdateMenuItemVariantDto } from './dto/update-menu_item_variant.dto';

@Controller('menu-item-variants')
export class MenuItemVariantsController {
  constructor(
    private readonly menuItemVariantsService: MenuItemVariantsService
  ) {}

  // Create a new menu item variant
  @Post()
  create(@Body() createMenuItemVariantDto: CreateMenuItemVariantDto) {
    return this.menuItemVariantsService.create(createMenuItemVariantDto);
  }

  // Get all menu item variants
  @Get()
  findAll() {
    return this.menuItemVariantsService.findAll();
  }

  @Get('paginated')
  findAllPaginated(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ) {
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    return this.menuItemVariantsService.findAllPaginated(
      parsedPage,
      parsedLimit
    );
  }

  // Get a menu item variant by ID
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.menuItemVariantsService.findOne(id); // ID passed as string
  }

  // Update a menu item variant by ID
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateMenuItemVariantDto: UpdateMenuItemVariantDto
  ) {
    return this.menuItemVariantsService.update(id, updateMenuItemVariantDto); // ID passed as string
  }

  // Delete a menu item variant by ID
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.menuItemVariantsService.remove(id); // ID passed as string
  }
}
