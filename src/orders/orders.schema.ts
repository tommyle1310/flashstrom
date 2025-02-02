import { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Define the Order Schema
export const OrderSchema = new Schema({
  _id: { type: String }, // Custom _id for orders, e.g., FF_ORDER_{uuid}
  customer_id: { type: String, required: true, ref: 'Customer' }, // Reference to the customer
  restaurant_id: { type: String, required: true, ref: 'Restaurant' }, // Reference to the restaurant
  status: {
    type: String,
    enum: ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED'], // Enum for order status
    required: true,
    default: 'PENDING',
  },
  total_amount: { type: Number, required: true }, // Total amount for the order
  delivery_fee: { type: Number, required: true }, // Total amount for the order
  service_fee: { type: Number, required: true }, // Total amount for the order
  payment_status: {
    type: String,
    enum: ['PENDING', 'PAID', 'FAILED'], // Enum for payment status
    required: true,
    default: 'PENDING',
  },
  payment_method: {
    type: String,
    enum: ['COD', 'FWallet'], // Enum for order status
    required: true,
    default: 'FWallet',
  }, // Reference to the payment method
  customer_location: { type: String, required: true, ref: 'AddressBook' }, // Reference to customer's address
  restaurant_location: { type: String, required: true, ref: 'AddressBook' }, // Reference to restaurant's address
  order_items: [
    {
      item_id: { type: String, required: true, ref: 'MenuItem' }, // Reference to menu item
      variant_id: { type: String, required: true, ref: 'MenuItemVariant' }, // Reference to menu item
      name: { type: String, required: true }, // Name of the menu item
      quantity: { type: Number, required: true, min: 1 }, // Quantity ordered
      price_at_time_of_order: { type: Number, required: true }, // Price at the time of the order
    },
  ], // List of items in the order
  customer_note: { type: String, default: '' }, // Any note from the customer (e.g., special requests)
  restaurant_note: { type: String, default: '' }, // Any note from the restaurant (e.g., preparation instructions)
  order_time: { type: Number, required: true }, // Timestamp for when the order was placed
  delivery_time: { type: Number, required: true }, // Timestamp for when the order is expected to be DELIVERED
  tracking_info: {
    type: String,
    enum: ['ORDER_PLACED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'], // Enum for tracking status
    default: 'ORDER_PLACED',
  }, // Tracking information for the order
  created_at: { type: Number, default: Math.floor(Date.now() / 1000) }, // Timestamp for when the order was created
  updated_at: { type: Number, default: Math.floor(Date.now() / 1000) }, // Timestamp for the last update of the order
});

// Pre-save hook to generate a custom ID for order with 'FF_ORDER_' prefix
OrderSchema.pre('save', function (next) {
  if (this.isNew) {
    this._id = `FF_ORDER_${uuidv4()}`; // Custom ID for the order
    if (!this.created_at) this.created_at = Math.floor(Date.now() / 1000); // Current Unix timestamp
    if (!this.updated_at) this.updated_at = Math.floor(Date.now() / 1000); // Current Unix timestamp
  }
  next();
});

// Define the interface for the Order model
export interface Order extends Document {
  id: string; // Custom order ID (FF_ORDER_uuid)
  customer_id: string; // The ID of the customer who placed the order
  restaurant_id: string; // The ID of the restaurant where the order is placed
  status: 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'DELIVERED' | 'CANCELLED'; // The current status of the order
  total_amount: number; // Total amount of the order
  delivery_fee: number; // Total amount of the order
  service_fee: number; // Total amount of the order
  payment_status: 'PENDING' | 'PAID' | 'FAILED'; // Payment status
  payment_method: string; // Payment method ID (could be reference to PaymentMethod schema)
  customer_location: string; // The customer's address (reference to AddressBook schema)
  restaurant_location: string; // The restaurant's address (reference to AddressBook schema)
  order_items: Array<{
    item_id: string; // The ID of the menu item
    variant_id: string; // The ID of the menu item
    name: string; // Name of the menu item
    quantity: number; // Quantity of the item in the order
    price_at_time_of_order: number; // Price of the item at the time of the order
  }>; // List of items in the order
  customer_note: string; // Customer's notes on the order
  restaurant_note: string; // Restaurant's notes on the order
  order_time: number; // Unix timestamp when the order was placed
  delivery_time: number; // Unix timestamp when the order is expected to be delivered
  tracking_info:
    | 'ORDER_PLACED'
    | 'PREPARING'
    | 'OUT_FOR_DELIVERY'
    | 'Delivered'; // Tracking info status
  created_at: number; // Timestamp for order creation
  updated_at: number; // Timestamp for the last update of the order
}
