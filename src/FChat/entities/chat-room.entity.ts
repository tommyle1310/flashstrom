import { Enum_UserType } from 'src/types/Payload';

export enum RoomType {
  ORDER = 'ORDER',
  SUPPORT = 'SUPPORT',
  GENERAL = 'GENERAL'
}

export class ChatRoom {
  id: string;
  type: RoomType;
  relatedId?: string; // Order ID, support ticket ID, etc.
  participants: {
    userId: string;
    userType: Enum_UserType;
  }[];
  createdAt: Date;
  lastActivity: Date;
}
