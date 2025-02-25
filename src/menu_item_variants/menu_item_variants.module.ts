import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenuItemVariant } from './entities/menu_item_variant.entity';
import { MenuItemVariantsController } from './menu_item_variants.controller';
import { MenuItemVariantsService } from './menu_item_variants.service';
import { MenuItemVariantsRepository } from './menu_item_variants.repository';
import { MenuItem } from 'src/menu_items/entities/menu_item.entity';
import { MenuItemsRepository } from 'src/menu_items/menu_items.repository';
@Module({
  imports: [TypeOrmModule.forFeature([MenuItemVariant, MenuItem])],
  controllers: [MenuItemVariantsController],
  providers: [
    MenuItemVariantsService,
    MenuItemVariantsRepository,
    MenuItemsRepository
  ],
  exports: [MenuItemVariantsService, MenuItemVariantsRepository]
})
export class MenuItemVariantsModule {}
