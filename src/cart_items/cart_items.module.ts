import { Module } from '@nestjs/common';
import { CartItemsService } from './cart_items.service';
import { CartItemsController } from './cart_items.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomerSchema } from 'src/customers/customer.schema';
import { CartItemSchema } from './cart_items.schema'; // Assuming you have the CartItem schema
import { MenuItemSchema } from 'src/menu_items/menu_items.schema';
import { MenuItemVariantSchema } from 'src/menu_item_variants/menu_item_variants.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Customer', schema: CustomerSchema }, // Injecting Customer schema
      { name: 'MenuItem', schema: MenuItemSchema }, // Injecting Customer schema
      { name: 'MenuItemVariant', schema: MenuItemVariantSchema }, // Injecting Customer schema
      { name: 'CartItem', schema: CartItemSchema }, // Injecting CartItem schema
    ]),
  ],
  controllers: [CartItemsController],
  providers: [CartItemsService],
  exports: [CartItemsService],
})
export class CartItemsModule {}
