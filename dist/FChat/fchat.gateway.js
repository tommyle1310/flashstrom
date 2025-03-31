"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FchatGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const fchat_service_1 = require("./fchat.service");
const jwt_1 = require("@nestjs/jwt");
const users_service_1 = require("../users/users.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const Payload_1 = require("../types/Payload");
const chat_room_entity_1 = require("./entities/chat-room.entity");
let FchatGateway = class FchatGateway {
    constructor(fchatService, jwtService, usersService, eventEmitter) {
        this.fchatService = fchatService;
        this.jwtService = jwtService;
        this.usersService = usersService;
        this.eventEmitter = eventEmitter;
        this.userSockets = new Map();
        this.activeChats = new Map();
    }
    afterInit() {
        console.log('Chat Gateway initialized!');
    }
    async validateToken(client) {
        try {
            const authHeader = client.handshake.headers.auth;
            if (!authHeader?.startsWith('Bearer ')) {
                client.disconnect();
                return null;
            }
            const token = authHeader.slice(7);
            if (!token) {
                client.disconnect();
                return null;
            }
            const decoded = await this.jwtService.verify(token, {
                secret: process.env.JWT_SECRET
            });
            return decoded;
        }
        catch (error) {
            console.error('Token validation error:', error);
            client.disconnect();
            return null;
        }
    }
    async handleConnection(client) {
        const userData = await this.validateToken(client);
        if (!userData)
            return;
        client.data.user = userData;
        this.userSockets.set(userData.id, client);
        await client.join(`user_${userData.id}`);
    }
    async handleStartChat(client, data) {
        try {
            const recipientType = await this.getUserType(data.withUserId);
            const userData = await this.validateToken(client);
            if (!userData) {
                throw new websockets_1.WsException('Unauthorized');
            }
            let user_type;
            switch (userData.logged_in_as) {
                case Payload_1.Enum_UserType.CUSTOMER:
                    user_type = Payload_1.Enum_UserType.CUSTOMER;
                    break;
                case Payload_1.Enum_UserType.CUSTOMER_CARE_REPRESENTATIVE:
                    user_type = Payload_1.Enum_UserType.CUSTOMER_CARE_REPRESENTATIVE;
                    break;
                case Payload_1.Enum_UserType.DRIVER:
                    user_type = Payload_1.Enum_UserType.DRIVER;
                    break;
                case Payload_1.Enum_UserType.RESTAURANT_OWNER:
                    user_type = Payload_1.Enum_UserType.RESTAURANT_OWNER;
                    break;
                case Payload_1.Enum_UserType.ADMIN:
                    user_type = Payload_1.Enum_UserType.ADMIN;
                    break;
                default:
                    user_type = Payload_1.Enum_UserType.CUSTOMER;
                    break;
            }
            if (!this.isValidChatCombination(user_type, data.type, recipientType)) {
                client.emit('error', { message: 'Unauthorized chat type' });
                return;
            }
            const socketRoomId = this.getChatId(userData.id, data.withUserId, data.type);
            const dbRoom = await this.fchatService.createRoom({
                type: data.type === 'SUPPORT' ? chat_room_entity_1.RoomType.SUPPORT : chat_room_entity_1.RoomType.ORDER,
                participants: [
                    { userId: userData.id, userType: user_type },
                    { userId: data.withUserId, userType: recipientType }
                ],
                relatedId: data.orderId,
                createdAt: new Date(),
                lastActivity: new Date()
            });
            this.activeChats.set(socketRoomId, {
                participants: [userData.id, data.withUserId],
                type: data.type,
                orderId: data.orderId,
                dbRoomId: dbRoom.id
            });
            await client.join(socketRoomId);
            console.log(`Sender ${userData.id} joined room ${socketRoomId}`);
            const recipientSocket = this.userSockets.get(data.withUserId);
            if (recipientSocket) {
                await recipientSocket.join(socketRoomId);
                console.log(`Recipient ${data.withUserId} joined room ${socketRoomId}`);
                recipientSocket.emit('chatStarted', {
                    chatId: socketRoomId,
                    withUser: userData.id,
                    type: data.type,
                    dbRoomId: dbRoom.id
                });
            }
            const socketsInRoom = await this.server.in(socketRoomId).allSockets();
            console.log(`Active sockets in room ${socketRoomId}:`, Array.from(socketsInRoom));
            client.emit('chatStarted', {
                chatId: socketRoomId,
                withUser: data.withUserId,
                type: data.type,
                dbRoomId: dbRoom.id
            });
            return {
                chatId: socketRoomId,
                dbRoomId: dbRoom.id,
                type: data.type
            };
        }
        catch (error) {
            console.error('Error in startChat:', error);
            throw new websockets_1.WsException(error.message || 'Failed to start chat');
        }
    }
    async handleMessage(client, data) {
        try {
            const user = client.data.user;
            console.log('Received sendMessage data:', data);
            const dbRoom = await this.fchatService.getRoomById(data.roomId);
            if (!dbRoom) {
                console.error(`Chat room not found for roomId: ${data.roomId}`);
                throw new websockets_1.WsException('Chat room not found');
            }
            const isParticipant = dbRoom.participants.some(p => p.userId === user.id);
            if (!isParticipant) {
                console.error(`User ${user.id} is not a participant in room ${data.roomId}`);
                throw new websockets_1.WsException('Unauthorized to send message in this chat');
            }
            const dbMessage = await this.fchatService.createMessage({
                roomId: data.roomId,
                senderId: user.id,
                senderType: user.logged_in_as,
                content: data.content,
                messageType: data.type,
                readBy: [user.id],
                timestamp: new Date()
            });
            await this.fchatService.updateRoomActivity(data.roomId);
            const message = {
                from: user.id,
                content: data.content,
                type: data.type,
                timestamp: new Date(),
                roomId: data.roomId,
                messageId: dbMessage.id
            };
            const participants = dbRoom.participants.map(p => p.userId);
            for (const participantId of participants) {
                const participantSocket = this.userSockets.get(participantId);
                if (participantSocket) {
                    participantSocket.emit('newMessage', message);
                    console.log(`Emitted newMessage to ${participantId}`);
                }
                else {
                    console.log(`Participant ${participantId} is offline`);
                }
            }
            return message;
        }
        catch (error) {
            console.error('Error in sendMessage:', error);
            throw new websockets_1.WsException(error.message || 'Failed to send message');
        }
    }
    isValidChatId(chatId) {
        const chatIdRegex = /^chat_[0-9a-zA-Z_]+_[0-9a-zA-Z_]+_(SUPPORT|ORDER)$/;
        return chatIdRegex.test(chatId);
    }
    handleGetChatHistoryEvent(data) {
        console.log(`Chat history for ${data.chatId}:`, data.messages);
        return data.messages;
    }
    async handleGetChatHistory(client, data) {
        try {
            const user = client.data.user;
            if (!user) {
                throw new websockets_1.WsException('Unauthorized');
            }
            console.log('User requesting chat history:', user.id, 'for room:', data.roomId);
            const dbRoom = await this.fchatService.getRoomById(data.roomId);
            if (!dbRoom) {
                console.error(`Chat room not found for roomId: ${data.roomId}`);
                throw new websockets_1.WsException('Chat room not found');
            }
            const isParticipant = dbRoom.participants.some(p => p.userId === user.id);
            if (!isParticipant) {
                console.error(`User ${user.id} is not a participant in room ${data.roomId}`);
                throw new websockets_1.WsException('Unauthorized to access this chat history');
            }
            const messages = await this.fchatService.getRoomMessages(data.roomId);
            if (!messages || messages.length === 0) {
                console.log(`No messages found for room ${data.roomId}`);
            }
            else {
                console.log(`Retrieved ${messages.length} messages for room ${data.roomId}`);
            }
            client.emit('chatHistory', { roomId: data.roomId, messages });
            return { roomId: data.roomId, messages };
        }
        catch (error) {
            console.error('Error getting chat history:', error);
            client.emit('error', {
                message: error.message || 'Failed to get chat history'
            });
            return { roomId: data.roomId, messages: [] };
        }
    }
    isValidChatCombination(userType, chatType, recipientType) {
        if (chatType === 'SUPPORT') {
            const validSupportCombinations = {
                CUSTOMER: ['CUSTOMER_CARE_REPRESENTATIVE'],
                DRIVER: ['CUSTOMER_CARE_REPRESENTATIVE'],
                RESTAURANT_OWNER: ['CUSTOMER_CARE_REPRESENTATIVE'],
                CUSTOMER_CARE_REPRESENTATIVE: [
                    'CUSTOMER',
                    'DRIVER',
                    'RESTAURANT_OWNER'
                ],
                ADMIN: [
                    'CUSTOMER',
                    'DRIVER',
                    'RESTAURANT_OWNER',
                    'CUSTOMER_CARE_REPRESENTATIVE'
                ]
            };
            return (validSupportCombinations[userType]?.includes(recipientType) || false);
        }
        if (chatType === 'ORDER') {
            const validOrderCombinations = {
                CUSTOMER: ['DRIVER', 'RESTAURANT_OWNER'],
                DRIVER: ['CUSTOMER'],
                RESTAURANT_OWNER: ['CUSTOMER'],
                ADMIN: ['CUSTOMER', 'DRIVER', 'RESTAURANT_OWNER']
            };
            return validOrderCombinations[userType]?.includes(recipientType) || false;
        }
        return false;
    }
    getChatId(user1, user2, type) {
        return `chat_${[user1, user2].sort().join('_')}_${type}`;
    }
    getSocketRoomIdFromDbRoom(dbRoom) {
        const participants = dbRoom.participants.map(p => p.userId).sort();
        return `chat_${participants.join('_')}_${dbRoom.type}`;
    }
    handleDisconnect(client) {
        console.log('❌ Client disconnected from chat namespace:', client.id);
        this.userSockets.delete(client.data.user?.id);
        this.fchatService.removeConnection(client.id);
    }
    getUserType(userId) {
        if (!userId) {
            console.warn('No userId provided');
            return null;
        }
        if (userId.startsWith('FF_CUS')) {
            return Payload_1.Enum_UserType.CUSTOMER;
        }
        else if (userId.startsWith('FF_RES')) {
            return Payload_1.Enum_UserType.RESTAURANT_OWNER;
        }
        else if (userId.startsWith('FF_DRI')) {
            return Payload_1.Enum_UserType.DRIVER;
        }
        else if (userId.startsWith('FF_CC')) {
            return Payload_1.Enum_UserType.CUSTOMER_CARE_REPRESENTATIVE;
        }
        else if (userId.startsWith('FF_ADMIN')) {
            return Payload_1.Enum_UserType.ADMIN;
        }
        console.warn(`Unknown user type for userId: ${userId}`);
        return null;
    }
};
exports.FchatGateway = FchatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], FchatGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('connect'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], FchatGateway.prototype, "handleConnection", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('startChat'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], FchatGateway.prototype, "handleStartChat", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('sendMessage'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], FchatGateway.prototype, "handleMessage", null);
__decorate([
    (0, event_emitter_1.OnEvent)('chatHistory'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FchatGateway.prototype, "handleGetChatHistoryEvent", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('getChatHistory'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], FchatGateway.prototype, "handleGetChatHistory", null);
exports.FchatGateway = FchatGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        namespace: 'chat',
        cors: {
            origin: ['*', 'localhost:1310'],
            methods: ['GET', 'POST'],
            credentials: true
        },
        transports: ['websocket']
    }),
    __metadata("design:paramtypes", [fchat_service_1.FchatService,
        jwt_1.JwtService,
        users_service_1.UsersService,
        event_emitter_1.EventEmitter2])
], FchatGateway);
//# sourceMappingURL=fchat.gateway.js.map