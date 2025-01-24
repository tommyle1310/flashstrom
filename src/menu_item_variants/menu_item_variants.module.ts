import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MenuItemVariantSchema } from './menu_item_variants.schema';
import { MenuItemSchema } from 'src/menu_items/menu_items.schema';
import { MenuItemsModule } from 'src/menu_items/menu_items.module';
import { MenuItemVariantsController } from './menu_item_variants.controller';
import { MenuItemVariantsService } from './menu_item_variants.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'MenuItemVariant', schema: MenuItemVariantSchema }, // Registering MenuItemVariant schema
    ]),
    MongooseModule.forFeature([{ name: 'MenuItem', schema: MenuItemSchema }]), // Registering MenuItem schema
    MenuItemsModule, // Importing MenuItemsModule for relation
  ],
  controllers: [MenuItemVariantsController], // Controllers for the MenuItemVariant CRUD operations
  providers: [MenuItemVariantsService], // Providers for MenuItemVariant logic
})
export class MenuItemVariantsModule {}
