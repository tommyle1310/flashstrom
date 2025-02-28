import { Enum_UserType } from 'src/types/Payload';

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  ORDER_INFO = 'ORDER_INFO'
}

export class Message {
  id: string;
  roomId: string;
  senderId: string;
  senderType: Enum_UserType;
  content: string;
  messageType: MessageType;
  timestamp: Date;
  readBy: string[]; // IDs of users who've read the message
}
