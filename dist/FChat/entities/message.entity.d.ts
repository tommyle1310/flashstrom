import { Enum_UserType } from 'src/types/Payload';
import { ChatRoom } from './chat-room.entity';
export declare enum MessageType {
    TEXT = "TEXT",
    IMAGE = "IMAGE",
    VIDEO = "VIDEO",
    ORDER_INFO = "ORDER_INFO"
}
export declare class Message {
    id: string;
    roomId: string;
    chatRoom: ChatRoom;
    senderId: string;
    senderType: Enum_UserType;
    content: string;
    messageType: MessageType;
    timestamp: Date;
    readBy: string[];
}
