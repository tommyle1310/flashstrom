import { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Define the CartItem Schema
export const CartItemSchema = new Schema({
  _id: { type: String }, // Custom _id field for cart item
  customer_id: { type: String, required: true, ref: 'Customer' }, // Reference to Customer collection
  item_id: { type: String, required: true, ref: 'MenuItem' }, // Reference to MenuItem collection
  variant_id: { type: String, ref: 'MenuItemVariant' }, // Reference to MenuItem collection
  quantity: { type: Number, required: true, min: 1 }, // Quantity of the item added to the cart
  price_at_time_of_addition: { type: Number, required: true }, // Price when the item was added to the cart
  created_at: { type: Number, required: false }, // Unix timestamp of when the item was added
  updated_at: { type: Number, required: false }, // Unix timestamp of last update
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
  item_id: string; // Reference to the item added to the cart,
  variant_id: string;
  quantity: number; // Quantity of the item
  price_at_time_of_addition: number; // Price when the item was added
  created_at: number; // Unix timestamp of creation
  updated_at: number; // Unix timestamp of last update
}
