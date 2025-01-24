import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { MenuItemsService } from './menu_items.service';
import { CreateMenuItemDto } from './dto/create-menu_item.dto';
import { UpdateMenuItemDto } from './dto/update-menu_item.dto';

@Controller('menu-items')
export class MenuItemsController {
  constructor(private readonly menuItemsService: MenuItemsService) {}

  // Create a new menu item
  @Post()
  create(@Body() createMenuItemDto: CreateMenuItemDto) {
    return this.menuItemsService.create(createMenuItemDto);
  }

  // Get all menu items
  @Get()
  findAll() {
    return this.menuItemsService.findAll();
  }

  // Get a menu item by ID
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.menuItemsService.findOne(id); // ID passed as string
  }

  // Update a menu item by ID
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateMenuItemDto: UpdateMenuItemDto,
  ) {
    return this.menuItemsService.update(id, updateMenuItemDto); // ID passed as string
  }

  // Delete a menu item by ID
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.menuItemsService.remove(id); // ID passed as string
  }
}
