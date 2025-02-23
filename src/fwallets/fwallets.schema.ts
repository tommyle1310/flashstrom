import { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Define the FWallet Schema
export const FWalletSchema = new Schema({
  _id: { type: String }, // Custom _id field with the 'F_WALLET_' prefix
  user_id: { type: String }, // Reference to User collection
  balance: { type: Number, required: true, default: 0 }, // Wallet balance
  first_name: { type: String }, // User's first name
  last_name: { type: String }, // User's last name
  is_verified: { type: Boolean, default: false }, // Verification status
  created_at: {
    type: Number,
    required: false,
    default: Math.floor(Date.now() / 1000)
  }, // Unix timestamp of creation
  updated_at: {
    type: Number,
    required: false,
    default: Math.floor(Date.now() / 1000)
  } // Unix timestamp of last update
});

// Pre-save hook to generate a custom ID with 'F_WALLET_' prefix and a random UUID
FWalletSchema.pre('save', function (next) {
  if (this.isNew) {
    // Generate a custom ID with the 'F_WALLET_' prefix and a random UUID
    this._id = `F_WALLET_${uuidv4()}`;
    // Set timestamps if not provided
    if (!this.created_at) this.created_at = Math.floor(Date.now() / 1000); // Current Unix timestamp
    if (!this.updated_at) this.updated_at = Math.floor(Date.now() / 1000); // Current Unix timestamp
  }
  next();
});

// Define the interface for the FWallet model
export interface FWallet extends Document {
  id: string; // Custom wallet ID
  user_id: string; // Reference to the User's ID
  balance: number; // Wallet balance
  first_name: string; // User's first name
  is_verified: boolean;
  last_name: string; // User's last name
  created_at: number; // Unix timestamp of creation
  updated_at: number; // Unix timestamp of last update
}
