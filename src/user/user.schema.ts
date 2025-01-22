import { MongooseModule } from '@nestjs/mongoose';
import { Schema, Document } from 'mongoose';
import { Enum_AppTheme, Enum_UserType } from 'src/types/Payload';
import { v4 as uuidv4 } from 'uuid';



// Define the User Schema
export const UserSchema = new Schema({
  _id: { type: String }, // Custom _id field with 'USR_' prefix
  first_name: { type: String, required: false },
  last_name: { type: String, required: false },
  verification_code: {type:Number, required: false},
  password: {type: String, required: true},
  email: { type: String, required: false, unique: true },
  phone: { type: String, required: false },
  user_type: { type: [String], enum: Object.values(Enum_UserType), required: true },  // Multiple roles
  address: { type: [String], required: false }, // Array of address book IDs
  created_at: { type: Number, required: false }, // Unix timestamp
  updated_at: { type: Number, required: false }, // Unix timestamp
  last_login: { type: Number, required: false }, // Unix timestamp
  temporary_wallet_balance: { type: Number, required: false },
  avatar: { type: { url: String, key: String }, required: false },
  is_verified: { type: Boolean, default: false }, // Verification status
  app_preferences: {
    theme: { type: String, enum: Object.values(Enum_AppTheme), required: false }, // User's App Theme preference
  },
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
  password: string;
  verification_code: number,
  temporary_wallet_balance: number,
  phone: string;
  user_type: Enum_UserType[];
  address: string[]; // Array of address book IDs
  created_at: number;
  updated_at: number;
  last_login: number;
  avatar: { url: string, key: string };
  is_verified: boolean;
  app_preferences?: { theme: Enum_AppTheme }; // App preferences with theme

}


export const UserModel = MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]);
