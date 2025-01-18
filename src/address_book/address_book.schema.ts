import { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Define the AddressBook Schema
export const AddressBookSchema = new Schema({
  _id: { type: String }, // Custom _id field with 'FF_AB_' prefix
  street: { type: String, required: true },
  city: { type: String, required: true },
  nationality: { type: String, required: true },
  is_default: { type: Boolean, default: false },
  created_at: { type: Number, required: true }, // Unix timestamp
  updated_at: { type: Number, required: true }, // Unix timestamp
  postal_code: { type: Number, required: true },
  location: {
    lon: { type: Number, required: true }, // Longitude
    lat: { type: Number, required: true }, // Latitude
  },
  title: { type: String, required: true },
});

// Pre-save hook to generate a custom ID with 'FF_AB_' prefix and unique random part
AddressBookSchema.pre('save', function (next) {
  if (this.isNew) {
    // Generate a custom ID with the 'FF_AB_' prefix and a random UUID
    this._id = `FF_AB_${uuidv4()}`;
    // Set timestamps if not provided
    if (!this.created_at) this.created_at = Math.floor(Date.now() / 1000); // Current Unix timestamp
    if (!this.updated_at) this.updated_at = Math.floor(Date.now() / 1000); // Current Unix timestamp
  }
  next();
});

// Define the interface for the AddressBook model
export interface AddressBook extends Document {
  id: string; // Custom _id with the 'FF_AB_' prefix
  street: string;
  city: string;
  nationality: string;
  is_default: boolean;
  created_at: number; // Unix timestamp
  updated_at: number; // Unix timestamp
  postal_code: number;
  location: {
    lon: number; // Longitude
    lat: number; // Latitude
  };
  title: string;
}
