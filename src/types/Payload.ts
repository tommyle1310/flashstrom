// Enum for UserType
export enum Enum_UserType {
  DRIVER = 'DRIVER',
  ADMIN = 'ADMIN',
  CUSTOMER = 'CUSTOMER',
  RESTAURANT_OWNER = 'RESTAURANT_OWNER',
  CUSTOMER_CARE_REPRESENTATIVE = 'CUSTOMER_CARE_REPRESENTATIVE'
}

export enum Enum_AppTheme {
  LIGHT = 'light',
  DARK = 'dark',
}

export type BasePayload = {
  userId: string;
  email: string;
  user_type: Enum_UserType[];
  first_name: string;
  last_name: string;
  app_preferences: { theme: Enum_AppTheme };
};

export type DriverPayload = BasePayload & {
  contact_email: string;
  contact_phone: string;
  vehicle: string;
  current_location: string;
  avatar: string;
  available_for_work: boolean;
};

export type CustomerPayload = BasePayload & {
  preferred_category: string;
  favorite_restaurants: string[];
  favorite_items: string[];
  support_tickets: string[];
};

// The final payload type can be a union of both driver and customer payload types.
export type Payload = DriverPayload | CustomerPayload;
