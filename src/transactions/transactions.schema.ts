import { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';


// Define the Transaction Schema
export const TransactionSchema = new Schema({
  _id: { type: String },  // Custom ID for the transaction (can use UUID as well)
  user_id: { type: String, required: true }, // Reference to users collection
  fwallet_id: { type: String, required: true }, // Reference to the FWallet
  transaction_type: {
    type: String,
    enum: ['DEPOSIT', 'WITHDRAW', 'PURCHASE', 'REFUND'],
    required: true,
  }, // Type of transaction (Deposit, Withdraw, Purchase)
  amount: { type: Number, required: true }, // The amount involved in the transaction
  balance_after: { type: Number }, // Wallet balance after the transaction
  status: {
    type: String,
    enum: ['PENDING', 'CANCELLED', 'FAILED', 'COMPLETED'],
    default: 'PENDING',  // Default status is 'PENDING'
  }, // Status of the transaction
  timestamp: { type: Number, default: Math.floor(Date.now() / 1000) }, // Unix timestamp when transaction occurred
  source: {
    type: String,
    enum: ['MOMO', 'FWALLET'],
    required: true,
  }, // Source of transaction (MOMO or FWALLET)
  destination: { type: String, required: true }, // Can be `fwallet.id`  depending on the transaction
});

// Pre-save hook to generate a custom ID with 'TXN_' prefix and a random UUID
TransactionSchema.pre('save', function (next) {
  if (this.isNew) {
    // Generate a custom ID for the transaction (you can also use UUID here)
    this._id = `TRANSACTION_${uuidv4()}`;
  }
  next();
});

// Define the interface for the Transaction model
export interface Transaction extends Document {
  id: string;  // Custom transaction ID
  user_id: string; // Reference to the User's ID (who performed the transaction)
  fwallet_id: string; // Reference to the FWallet involved
  transaction_type: 'DEPOSIT' | 'WITHDRAW' | 'PURCHASE' | 'REFUND'; // Type of transaction
  amount: number; // Amount involved in the transaction
  balance_after: number; // Wallet balance after the transaction
  status: 'PENDING' | 'CANCELLED' | 'FAILED' | 'COMPLETED'; // Transaction status
  timestamp: number; // Unix timestamp of when the transaction occurred
  source: 'MOMO' | 'FWALLET'; // Source of the transaction (MOMO or FWALLET)
  destination: string; // Can be `fwallet.id` or `users.id` depending on the transaction
}
