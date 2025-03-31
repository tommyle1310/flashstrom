import { Message } from './message.entity';
export declare enum RoomType {
    SUPPORT = "SUPPORT",
    ORDER = "ORDER",
    ADMIN = "ADMIN"
}
export declare class ChatRoom {
    id: string;
    type: RoomType;
    participants: {
        userId: string;
        userType: string;
    }[];
    relatedId: string;
    createdAt: Date;
    lastActivity: Date;
    messages: Message[];
}
