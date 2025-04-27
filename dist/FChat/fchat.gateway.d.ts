import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { FchatService } from './fchat.service';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Enum_UserType } from 'src/types/Payload';
import { RoomType } from './entities/chat-room.entity';
import { MessageType } from './entities/message.entity';
export declare class FchatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
    private readonly fchatService;
    private readonly jwtService;
    private readonly usersService;
    private eventEmitter;
    server: Server;
    private userSockets;
    private activeChats;
    constructor(fchatService: FchatService, jwtService: JwtService, usersService: UsersService, eventEmitter: EventEmitter2);
    afterInit(): void;
    private validateToken;
    handleConnection(client: Socket): Promise<void>;
    handleStartChat(client: Socket, data: {
        withUserId: string;
        type: 'SUPPORT' | 'ORDER';
        orderId?: string;
    }): Promise<{
        chatId: string;
        dbRoomId: string;
        type: "SUPPORT" | "ORDER";
    }>;
    handleMessage(client: Socket, data: {
        roomId: string;
        content: string;
        type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'ORDER_INFO';
    }): Promise<{
        id: string;
        roomId: string;
        senderId: string;
        senderType: Enum_UserType;
        content: string;
        messageType: MessageType;
        timestamp: string;
        readBy: string[];
        senderDetails: any;
    }>;
    private isValidChatId;
    handleGetChatHistoryEvent(data: {
        chatId: string;
        messages: any[];
    }): any[];
    handleGetChatHistory(client: Socket, data: {
        roomId: string;
    }): Promise<{
        roomId: string;
        messages: import("./entities/message.entity").Message[];
    }>;
    handleGetAllChats(client: Socket): Promise<{
        ongoing: {
            roomId: string;
            type: RoomType;
            otherParticipant: any;
            lastMessage: {
                id: string;
                roomId: string;
                senderId: string;
                senderType: Enum_UserType;
                content: string;
                messageType: MessageType;
                timestamp: string;
                readBy: string[];
                sender: any;
            };
            lastActivity: string;
            relatedId: string;
        }[];
        awaiting: {
            roomId: string;
            type: RoomType;
            otherParticipant: any;
            lastMessage: {
                id: string;
                roomId: string;
                senderId: string;
                senderType: Enum_UserType;
                content: string;
                messageType: MessageType;
                timestamp: string;
                readBy: string[];
                sender: any;
            };
            lastActivity: string;
            relatedId: string;
        }[];
    }>;
    private formatContact;
    private formatPhone;
    private isValidChatCombination;
    private getChatId;
    private getSocketRoomIdFromDbRoom;
    handleDisconnect(client: Socket): void;
    private getUserType;
}
