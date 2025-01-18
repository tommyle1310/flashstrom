import { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Enum for UserType
export enum Enum_UserType {
  DRIVER = 'Driver',
  ADMIN = 'Admin',
  CUSTOMER = 'Customer',
  RESTAURANT_OWNER = 'Restaurant Owner',
  CUSTOMER_CARE_REPRESENTATIVE = 'Customer Care Representative',
}

// Define the User Schema
export const UserSchema = new Schema({
  _id: { type: String }, // Custom _id field with the 'USR_' prefix
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  user_type: { type: String, enum: Object.values(Enum_UserType), required: true },
  address: { type: [String], required: true }, // Array of address book IDs
  created_at: { type: Number, required: true }, // Unix timestamp
  updated_at: { type: Number, required: true }, // Unix timestamp
  last_login: { type: Number, required: true }, // Unix timestamp
  avatar: { type: { url: String, key: String }, required: false }, // Avatar with URL and key
  is_verified: { type: Boolean, default: false }, // Verification status
});

// Pre-save hook to generate a custom ID with 'USR_' prefix and unique random part
UserSchema.pre('save', function (next) {
  if (this.isNew) {
    // Generate a custom ID with the 'USR_' prefix and a random UUID
    this._id = `USR_${uuidv4()}`;
    // Set timestamps if not provided
    if (!this.created_at) this.created_at = Math.floor(Date.now() / 1000); // Current Unix timestamp
    if (!this.updated_at) this.updated_at = Math.floor(Date.now() / 1000); // Current Unix timestamp
    if (!this.last_login) this.last_login = Math.floor(Date.now() / 1000); // Current Unix timestamp
  }
  next();
});

// Define the interface for the User model
export interface User extends Document {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  user_type: Enum_UserType;
  address: string[]; // Array of address book IDs
  created_at: number; // Unix timestamp
  updated_at: number; // Unix timestamp
  last_login: number; // Unix timestamp
  avatar: { url: string, key: string }; // Avatar object with url and key
  is_verified: boolean; // Whether the user is verified
}
