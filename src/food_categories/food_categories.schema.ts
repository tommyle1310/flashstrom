import { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Define the FoodCategory Schema
export const FoodCategorySchema = new Schema({
  _id: { type: String }, // Custom _id field for food category
  name: { type: String, required: true }, // Name of the food category
  description: { type: String, required: true }, // Description of the food category
  avatar: { 
    url: { type: String, required: false }, // URL for the category's avatar image
    key: { type: String, required: false }, // Key for the avatar image
  },
  created_at: { type: Number, required: false }, // Unix timestamp of creation
  updated_at: { type: Number, required: false }, // Unix timestamp of last update
});

// Pre-save hook to generate a custom ID with 'FF_FC_' prefix and a random UUID
FoodCategorySchema.pre('save', function (next) {
  if (this.isNew) {
    // Generate a custom ID with the 'FF_FC_' prefix and a random UUID
    this._id = `FF_FC_${uuidv4()}`;
    // Set timestamps if not provided
    if (!this.created_at) this.created_at = Math.floor(Date.now() / 1000); // Current Unix timestamp
    if (!this.updated_at) this.updated_at = Math.floor(Date.now() / 1000); // Current Unix timestamp
  }
  next();
});

// Define the interface for the FoodCategory model
export interface FoodCategory extends Document {
  id: string; // Custom category ID (FF_FC_uuid)
  name: string; // Name of the food category
  description: string; // Description of the food category
  avatar?: { url: string; key: string }; // Avatar image information
  created_at: number; // Unix timestamp of creation
  updated_at: number; // Unix timestamp of last update
}
