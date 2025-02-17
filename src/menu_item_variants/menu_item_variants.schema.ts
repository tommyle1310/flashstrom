import { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Define the MenuItemVariant Schema
export const MenuItemVariantSchema = new Schema({
  _id: { type: String }, // Custom _id field for menu item variant
  menu_id: { type: String, required: true, ref: 'MenuItem' }, // Reference to the related menu item (foreign key to MenuItem)
  variant: { type: String, required: true }, // Name or type of the variant (e.g., "small", "large", "extra spicy")
  description: { type: String }, // Description of the variant
  avatar: {
    key: { type: String }, // Key for the avatar image (to manage Cloud storage)
    url: { type: String } // URL for the variant's avatar image
  },
  availability: { type: Boolean, default: true }, // Availability of the variant
  default_restaurant_notes: [{ type: String }], // Default notes for the restaurant (e.g., 'extra sauce')
  price: { type: Number, required: true }, // Price of the variant
  discount_rate: { type: Number }, // Discount rate in percentage (0-100)
  created_at: { type: Number, default: Math.floor(Date.now() / 1000) }, // Unix timestamp of creation
  updated_at: { type: Number, default: Math.floor(Date.now() / 1000) } // Unix timestamp of last update
});

// Pre-save hook to generate a custom ID with 'FF_MENU_ITEM_VARIANT_' prefix and a random UUID
MenuItemVariantSchema.pre('save', function (next) {
  if (this.isNew) {
    this._id = `FF_MENU_ITEM_VARIANT_${uuidv4()}`; // Custom ID for menu item variants
    if (!this.created_at) this.created_at = Math.floor(Date.now() / 1000); // Current Unix timestamp
    if (!this.updated_at) this.updated_at = Math.floor(Date.now() / 1000); // Current Unix timestamp
  }
  next();
});

// Define the interface for the MenuItemVariant model
export interface MenuItemVariant extends Document {
  id: string; // Custom menu item variant ID (FF_MENU_ITEM_VARIANT_uuid)
  menu_id: string; // The ID of the related menu item (foreign key to MenuItem)
  variant: string; // Name or type of the variant
  description: string; // Description of the variant
  avatar: { key: string; url: string }; // Avatar image information
  availability: boolean; // Availability of the variant
  default_restaurant_notes: string[]; // Default restaurant notes for the variant
  price: number; // Price of the variant
  discount_rate: number; // Discount rate as a percentage
  created_at: number; // Unix timestamp of creation
  updated_at: number; // Unix timestamp of last update
}
