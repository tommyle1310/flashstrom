import { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Define the MenuItem Schema
export const MenuItemSchema = new Schema({
  _id: { type: String }, // Custom _id field for menu item
  restaurant_id: { type: String, required: true, ref: 'Restaurant' }, // Reference to the related restaurant (foreign key to Restaurant)
  name: { type: String, required: true }, // Name of the menu item
  description: { type: String }, // Description of the menu item
  category: [{ type: String, ref: 'FoodCategory' }], // Array of references to food categories
  avatar: {
    key: { type: String }, // Key for the avatar image (to manage Cloud storage)
    url: { type: String }, // URL for the menu item's avatar image
  },
  availability: { type: Boolean, default: false }, // Availability of the menu item
  suggest_notes: [{ type: String }], // Suggested notes (e.g., 'no spicy', 'more carrots')
  variants: [{ type: String, ref: 'MenuItemVariant' }], // Array of menu item variant references
  price: { type: Number, default: 0 },
  created_at: { type: Number, default: Math.floor(Date.now() / 1000) }, // Unix timestamp of creation
  updated_at: { type: Number, default: Math.floor(Date.now() / 1000) }, // Unix timestamp of last update
  purchase_count: { type: Number, default: 0 }, // Purchase count for this menu item
});

// Pre-save hook to generate a custom ID with 'FF_MENU_ITEM_' prefix and a random UUID
MenuItemSchema.pre('save', function (next) {
  if (this.isNew) {
    this._id = `FF_MENU_ITEM_${uuidv4()}`; // Custom ID for menu items
    if (!this.created_at) this.created_at = Math.floor(Date.now() / 1000); // Current Unix timestamp
    if (!this.updated_at) this.updated_at = Math.floor(Date.now() / 1000); // Current Unix timestamp
  }
  next();
});

// Define the interface for the MenuItem model
export interface MenuItem extends Document {
  id: string; // Custom menu item ID (FF_MENU_ITEM_uuid)
  restaurant_id: string; // The ID of the related restaurant (foreign key to Restaurant)
  name: string; // Name of the menu item
  description: string; // Description of the menu item
  category: string[]; // Array of food category IDs
  avatar: { key: string; url: string }; // Avatar image information
  availability: boolean; // Availability of the menu item
  suggest_notes: string[]; // Suggested notes for the menu item
  variants: string[]; // Array of menu item variant IDs
  created_at: number; // Unix timestamp of creation
  price: number; // Unix timestamp of creation
  updated_at: number; // Unix timestamp of last update
  purchase_count: number; // Purchase count of the menu item
}
