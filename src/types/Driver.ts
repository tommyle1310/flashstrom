import { Location } from './Order';

export type Type_Delivery_Order = {
  customer_id: string | null;
  restaurant_id: string;
  customer_location: Location; // Assuming it's a string  ID from an address
  restaurant_location: Location; // Assuming it's the restaurant's address
  status:
    | 'PENDING'
    | 'RESTAURANT_ACCEPTED'
    | 'IN_PROGRESS'
    | 'DELIVERED'
    | 'CANCELLED';
  payment_method: 'COD' | 'FWallet';
  total_amount: number;
  order_items: Type_Delivery_OrderItem[];
  tracking_info:
    | 'ORDER_PLACED'
    | 'PREPARING'
    | 'OUT_FOR_DELIVERY'
    | 'DELIVERED';
  customer_note: string;
  restaurant_note: string;
  order_time: number; // Unix timestamp
};

export type Type_Delivery_OrderItem = {
  item_id: string | null;
  name: string | null;
  quantity: number | null;
  price_at_time_of_order: number | null;
  variant_id: string | null;
  item: {
    _id: string;
    name: string;
    avatar: { url: string; key: string };
  };
};
