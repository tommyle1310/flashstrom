import { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';


// Define the Vehicle Schema
const VehicleSchema = new Schema({
  license_plate: { type: String, required: true },
  model: { type: String, required: true },
  color: { type: String, required: true },
});

// Define the Contact Schema for email
const ContactEmailSchema = new Schema({
  title: { type: String, required: true },
  is_default: { type: Boolean, required: true },
  email: { type: String, required: true },
});

// Define the Contact Schema for phone
const ContactPhoneSchema = new Schema({
  number: { type: String, required: true },
  is_default: { type: Boolean, required: true },
});

// Define the Location Schema
const LocationSchema = new Schema({
  lat: { type: Number, required: true },
  lon: { type: Number, required: true },
});

// Define the Rating Schema
const RatingSchema = new Schema({
  average_rating: { type: Number, required: true },
  review_count: { type: Number, required: true },
});

// Define the Driver Schema
export const DriverSchema = new Schema({
  _id: { type: String }, // Custom _id field with the 'DRV_' prefix
  user_id: { type: String, required: true, ref: 'User' }, // Reference to User collection
  contact_email: { type: [ContactEmailSchema], required: false }, // Array of email contacts
  contact_phone: { type: [ContactPhoneSchema], required: false }, // Array of phone contacts
  first_name: { type: String, required: false }, // Driver's first name
  last_name: { type: String, required: false }, // Driver's last name
  vehicle: { type: VehicleSchema, required: false }, // Vehicle information
  current_location: { type: LocationSchema, required: false }, // Driver's current location (lat, lon)
  current_order_id: { type: [String], required: false }, // Array of order IDs (max 3 orders)
  created_at: { type: Number, required: false }, // Unix timestamp of creation
  updated_at: { type: Number, required: false }, // Unix timestamp of last update
  rating: { type: RatingSchema, required: false }, // Driver's average rating and review count
  last_login: { type: Number, required: false }, // Last login timestamp
  avatar: { type: { key: String, url: String }, required: false }, // Avatar image information
  available_for_work: { type: Boolean, required: false }, // If the driver is available for work
  is_on_delivery: { type: Boolean, required: false }, // If the driver is currently on delivery

});

// Pre-save hook to generate a custom ID with 'DRV_' prefix and a random UUID
DriverSchema.pre('save', function (next) {
  if (this.isNew) {
    // Generate a custom ID with the 'DRV_' prefix and a random UUID
    this._id = `FF_DRI_${uuidv4()}`;
    // Set timestamps if not provided
    if (!this.created_at) this.created_at = Math.floor(Date.now() / 1000); // Current Unix timestamp
    if (!this.updated_at) this.updated_at = Math.floor(Date.now() / 1000); // Current Unix timestamp
  }
  next();
});

// Define the interface for the Driver model
export interface Driver extends Document {
  id: string; // Custom driver ID
  user_id: string; // Reference to the User's ID
  contact_email: { title: string; is_default: boolean; email: string }[]; // Array of email contacts
  contact_phone: { number: string; is_default: boolean }[]; // Array of phone contacts
  first_name: string; // Driver's first name
  last_name: string; // Driver's last name
  vehicle: { license_plate: string; model: string; color: string }; // Vehicle details
  current_location: { lat: number; lon: number }; // Driver's current location (lat, lon)
  current_order_id: string[]; // Array of order IDs (max 3 orders)
  created_at: number; // Unix timestamp of creation
  updated_at: number; // Unix timestamp of last update
  rating: { average_rating: number; review_count: number }; // Driver's average rating and review count
  last_login: number; // Last login timestamp
  avatar?: { key: string; url: string }; // Avatar information
  available_for_work: boolean; // If the driver is available for work
  is_on_delivery: boolean; // If the driver is currently on delivery
  
}

