import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { ChatRoom, RoomType } from './entities/chat-room.entity';
import { User } from 'src/users/entities/user.entity';
export declare class FchatService {
    private messageRepository;
    private roomRepository;
    private connections;
    constructor(messageRepository: Repository<Message>, roomRepository: Repository<ChatRoom>);
    addConnection(socketId: string, user: User): Promise<void>;
    removeConnection(socketId: string): Promise<void>;
    getRoomById(roomId: string): Promise<ChatRoom | null>;
    getRoomByParticipantsAndType(participantIds: string[], type: RoomType): Promise<ChatRoom | null>;
    createMessage(messageData: Partial<Message>): Promise<Message>;
    createRoom(roomData: Partial<ChatRoom>): Promise<ChatRoom>;
    getRoomMessages(roomId: string): Promise<Message[]>;
    canUserJoinRoom(userId: string, roomId: string): Promise<boolean>;
    updateRoomActivity(roomId: string): Promise<void>;
    getActiveChats(userId: string): Promise<ChatRoom[]>;
    markMessagesAsRead(roomId: string, userId: string): Promise<void>;
    getRoomsByUserId(userId: string): Promise<ChatRoom[]>;
    getLastMessageForRoom(roomId: string): Promise<Message | null>;
    getRoomsByUserIdWithLastMessage(userId: string): Promise<{
        room: ChatRoom;
        lastMessage: Message | null;
    }[]>;
}
