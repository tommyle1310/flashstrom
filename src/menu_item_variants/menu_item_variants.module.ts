import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MenuItemVariantSchema } from './menu_item_variants.schema';
import { MenuItemSchema } from 'src/menu_items/menu_items.schema';
import { MenuItemVariantsController } from './menu_item_variants.controller';
import { MenuItemVariantsService } from './menu_item_variants.service';
import { MenuItemsModule } from 'src/menu_items/menu_items.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'MenuItemVariant', schema: MenuItemVariantSchema },
      { name: 'MenuItem', schema: MenuItemSchema }
    ]),
    forwardRef(() => MenuItemsModule)
  ],
  controllers: [MenuItemVariantsController],
  providers: [MenuItemVariantsService],
  exports: [MenuItemVariantsService]
})
export class MenuItemVariantsModule {}
