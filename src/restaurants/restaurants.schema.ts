import { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Define the Restaurant Schema
export const RestaurantSchema = new Schema({
  _id: { type: String }, // Custom restaurant ID
  owner_id: { type: String }, // User ID of the owner
  owner_name: { type: String }, // Owner's name
  address: { type: String }, // Address of the restaurant
  restaurant_name: { type: String }, // Restaurant name
  contact_email: [
    {
      title: { type: String },
      is_default: { type: Boolean },
      email: { type: String },
    },
  ], // Contact email(s)
  contact_phone: [
    {
      title: { type: String },
      number: { type: String },
      is_default: { type: Boolean },
    },
  ], // Contact phone(s)
  created_at: { type: Number }, // Unix timestamp for creation
  updated_at: { type: Number }, // Unix timestamp for last update
  avatar: {
    url: { type: String },
    key: { type: String },
  }, // Avatar for the restaurant
  images_gallery: { type: [String] }, // Array of image URLs for the gallery
  status: {
    is_open: { type: Boolean },
    is_active: { type: Boolean },
    is_accepted_orders: { type: Boolean },
  }, // Status of the restaurant (open, active, accepting orders)
  promotions: [{ type: [String], ref: 'Promotion' }], // References to promotion IDs
  ratings: {
    average_rating: { type: Number,  },
    review_count: { type: Number,  },
  }, // Ratings for the restaurant
  specialize_in: [{ type: String, ref: 'FoodCategory' }], // References to food categories
  opening_hours: {
    mon: { from: { type: Number }, to: { type: Number } },
    tue: { from: { type: Number }, to: { type: Number } },
    wed: { from: { type: Number }, to: { type: Number } },
    thu: { from: { type: Number }, to: { type: Number } },
    fri: { from: { type: Number }, to: { type: Number } },
    sat: { from: { type: Number }, to: { type: Number } },
    sun: { from: { type: Number }, to: { type: Number } },
  }, // Opening hours for each day of the week
});

// Pre-save hook to generate a custom ID with 'RES_' prefix and a random UUID
RestaurantSchema.pre('save', function (next) {
  if (this.isNew) {
    this._id = `FF_RES_${uuidv4()}`; // Custom ID format for restaurants
    if (!this.created_at) this.created_at = Math.floor(Date.now() / 1000); // Current Unix timestamp
    if (!this.updated_at) this.updated_at = Math.floor(Date.now() / 1000); // Current Unix timestamp
  }
  next();
});

// Define the interface for the Restaurant model
export interface Restaurant extends Document {
  id: string;
  owner_id: string;
  owner_name: string;
  address: string;
  restaurant_name: string;
  contact_email: { title: string; is_default: boolean; email: string }[];
  contact_phone: { number: string; is_default: boolean, title: string }[];
  created_at: number;
  updated_at: number;
  avatar: { url: string; key: string };
  images_gallery: string[];
  status: { is_open: boolean; is_active: boolean; is_accepted_orders: boolean };
  promotions: string[];
  ratings: { average_rating: number; review_count: number };
  specialize_in: string[];
  opening_hours: {
    mon: { from: number; to: number };
    tue: { from: number; to: number };
    wed: { from: number; to: number };
    thu: { from: number; to: number };
    fri: { from: number; to: number };
    sat: { from: number; to: number };
    sun: { from: number; to: number };
  };
}
