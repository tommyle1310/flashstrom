import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MenuItemVariantSchema } from './menu_item_variants.schema';
import { MenuItemSchema } from 'src/menu_items/menu_items.schema';
import { MenuItemVariantsController } from './menu_item_variants.controller';
import { MenuItemVariantsService } from './menu_item_variants.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'MenuItemVariant', schema: MenuItemVariantSchema },
    ]),
    MongooseModule.forFeature([{ name: 'MenuItem', schema: MenuItemSchema }]),
    // Removed direct import of MenuItemsModule
  ],
  controllers: [MenuItemVariantsController],
  providers: [MenuItemVariantsService],
  exports: [MenuItemVariantsService],
})
export class MenuItemVariantsModule {}
