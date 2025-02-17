import { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Enum for preferred app themes

// Define the Customer Schema
export const CustomerSchema = new Schema({
  _id: { type: String }, // Custom _id field with the 'CUS_' prefix
  first_name: { type: String, required: false }, // Custom _id field with the 'CUS_' prefix
  last_name: { type: String, required: false }, // Custom _id field with the 'CUS_' prefix
  address: { type: [String], ref: 'AddressBook' }, // Address of the restaurant
  user_id: { type: String, required: true, ref: 'User' }, // Reference to User collection
  avatar: { type: { url: String, key: String }, required: false }, // Avatar with URL and key
  preferred_category: { type: [String], required: false }, // Array of Food Categories IDs
  restaurant_history: {
    type: [
      {
        restaurant_id: { type: String, ref: 'Restaurant' }, // Ensure restaurant_id is a required field
        count: { type: Number, default: 0 } // Ensure count is required and has a default value of 0
      }
    ],
    required: false
  },
  favorite_restaurants: { type: [String], required: false }, // Array of Favorite Restaurant IDs
  favorite_items: { type: [String], required: false }, // Array of Favorite Menu Item IDs
  support_tickets: { type: [String], required: false }, // Array of Support Ticket IDs

  created_at: { type: Number, required: false }, // Unix timestamp
  updated_at: { type: Number, required: false } // Unix timestamp
});

// Pre-save hook to generate a custom ID with 'CUS_' prefix and a random UUID
CustomerSchema.pre('save', function (next) {
  if (this.isNew) {
    // Generate a custom ID with the 'CUS_' prefix and a random UUID
    this._id = `FF_CUS_${uuidv4()}`;
    // Set timestamps if not provided
    if (!this.created_at) this.created_at = Math.floor(Date.now() / 1000); // Current Unix timestamp
    if (!this.updated_at) this.updated_at = Math.floor(Date.now() / 1000); // Current Unix timestamp
  }
  next();
});

// Define the interface for the Customer model
export interface Customer extends Document {
  id: string;
  first_name: string;
  last_name: string;
  address: string[];
  user_id: string; // Reference to User's id (USR_* format)
  avatar: { url: string; key: string }; // Avatar object with url and key
  restaurant_history: { restaurant_id: string; count: number }[]; // Avatar object with url and key
  preferred_category?: string[]; // Array of preferred food category IDs (FC_* format)
  favorite_restaurants: string[]; // Array of favorite restaurant IDs (RES_* format)
  favorite_items: string[]; // Array of favorite menu IDs (MENU_* format)
  support_tickets?: string[]; // Array of support ticket IDs (ST_* format)
  created_at?: number; // Unix timestamp
  updated_at?: number; // Unix timestamp
}
