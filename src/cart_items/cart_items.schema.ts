import { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Define the CartItem Schema
export const CartItemSchema = new Schema({
  _id: { type: String }, // Custom _id field for cart item
  customer_id: { type: String, required: true, ref: 'Customer' }, // Reference to Customer collection
  item_id: { type: String, required: true, ref: 'MenuItem' }, // Reference to MenuItem collection
  restaurant_id: { type: String, ref: 'Restaurant' }, // Reference to Restaurant collection
  variants: [
    {
      variant_id: { type: String, ref: 'MenuItemVariant' }, // Reference to MenuItemVariant
      variant_name: { type: String }, // Name of the variant (e.g., "Size M", "Size L")
      variant_price_at_time_of_addition: { type: Number }, // Price for this variant at time of addition
      quantity: { type: Number, min: 1 } // Quantity of this specific variant
    }
  ], // Array to store different variants and their quantities
  created_at: { type: Number, required: false }, // Unix timestamp of when the item was added
  updated_at: { type: Number, required: false } // Unix timestamp of last update
});

// Pre-save hook to generate a custom ID with 'FF_CART_ITEM_' prefix and a random UUID
CartItemSchema.pre('save', function (next) {
  if (this.isNew) {
    // Generate a custom ID with the 'FF_CART_ITEM_' prefix and a random UUID
    this._id = `FF_CART_ITEM_${uuidv4()}`;
    // Set timestamps if not provided
    if (!this.created_at) this.created_at = Math.floor(Date.now() / 1000); // Current Unix timestamp
    if (!this.updated_at) this.updated_at = Math.floor(Date.now() / 1000); // Current Unix timestamp
  } else {
    // Update the `updated_at` timestamp whenever the document is modified
    this.updated_at = Math.floor(Date.now() / 1000);
  }
  next();
});

// Define the interface for the CartItem model
export interface CartItem extends Document {
  id: string; // Custom cart item ID (FF_CART_ITEM_uuid)
  customer_id: string; // Reference to the customer
  restaurant_id: string;
  item_id: string; // Reference to the item added to the cart
  variants: {
    variant_id: string; // Reference to the variant (e.g., "size M", "size L")
    variant_name: string; // Variant name (e.g., "Size M", "Size L")
    variant_price_at_time_of_addition: number; // Price of this variant
    quantity: number; // Quantity of this variant
  }[]; // Array of variants with their quantities and prices
  created_at: number; // Unix timestamp of creation
  updated_at: number; // Unix timestamp of last update
}
