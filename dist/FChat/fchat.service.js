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
exports.FchatService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const message_entity_1 = require("./entities/message.entity");
const chat_room_entity_1 = require("./entities/chat-room.entity");
let FchatService = class FchatService {
    constructor(messageRepository, roomRepository) {
        this.messageRepository = messageRepository;
        this.roomRepository = roomRepository;
        this.connections = new Map();
    }
    async addConnection(socketId, user) {
        this.connections.set(socketId, user);
    }
    async removeConnection(socketId) {
        this.connections.delete(socketId);
    }
    async getRoomById(roomId) {
        return this.roomRepository.findOne({ where: { id: roomId } });
    }
    async getRoomByParticipantsAndType(participantIds, type) {
        try {
            const room = await this.roomRepository
                .createQueryBuilder('chatRoom')
                .where('chatRoom.type = :type', { type })
                .andWhere('chatRoom.participants @> :participants', {
                participants: participantIds.map(id => ({ userId: id }))
            })
                .getOne();
            return room || null;
        }
        catch (error) {
            console.error('Error finding room by participants and type:', error);
            return null;
        }
    }
    async createMessage(messageData) {
        const message = this.messageRepository.create(messageData);
        return this.messageRepository.save(message);
    }
    async createRoom(roomData) {
        console.log('check room created', roomData);
        const room = this.roomRepository.create(roomData);
        return this.roomRepository.save(room);
    }
    async getRoomMessages(roomId) {
        try {
            const messages = await this.messageRepository.find({
                where: { roomId },
                order: { timestamp: 'ASC' }
            });
            return messages;
        }
        catch (error) {
            console.error(`Error fetching messages for room ${roomId}:`, error);
            return [];
        }
    }
    async canUserJoinRoom(userId, roomId) {
        try {
            const room = await this.roomRepository.findOne({
                where: { id: roomId },
                relations: ['participants']
            });
            if (!room) {
                return false;
            }
            return room.participants.some(participant => participant.userId === userId);
        }
        catch (error) {
            console.error('Error checking room access:', error);
            return false;
        }
    }
    async updateRoomActivity(roomId) {
        try {
            await this.roomRepository.update({ id: roomId }, { lastActivity: new Date() });
        }
        catch (error) {
            console.error('Error updating room activity:', error);
            throw error;
        }
    }
    async getActiveChats(userId) {
        return this.roomRepository.find({
            where: {
                participants: {
                    userId: userId
                }
            },
            relations: ['participants'],
            order: {
                lastActivity: 'DESC'
            }
        });
    }
    async markMessagesAsRead(roomId, userId) {
        try {
            await this.messageRepository
                .createQueryBuilder()
                .update(message_entity_1.Message)
                .set({
                readBy: () => `array_append("readBy", '${userId}')`
            })
                .where('roomId = :roomId', { roomId })
                .andWhere('NOT (:userId = ANY(readBy))', { userId })
                .execute();
        }
        catch (error) {
            console.error('Error marking messages as read:', error);
            throw error;
        }
    }
    async getRoomsByUserId(userId) {
        return this.roomRepository
            .createQueryBuilder('room')
            .where(`room.participants @> :participant`, {
            participant: JSON.stringify([{ userId }])
        })
            .orderBy('room.lastActivity', 'DESC')
            .getMany();
    }
    async getLastMessageForRoom(roomId) {
        return this.messageRepository
            .createQueryBuilder('message')
            .where('message.roomId = :roomId', { roomId })
            .orderBy('message.timestamp', 'DESC')
            .limit(1)
            .getOne();
    }
    async getRoomsByUserIdWithLastMessage(userId) {
        const rooms = await this.roomRepository
            .createQueryBuilder('room')
            .leftJoinAndSelect('room.messages', 'messages')
            .where(`room.participants @> :participant`, {
            participant: JSON.stringify([{ userId }])
        })
            .orderBy('room.lastActivity', 'DESC')
            .getMany();
        const lastMessages = await this.messageRepository
            .createQueryBuilder('message')
            .where('message.roomId IN (:...roomIds)', {
            roomIds: rooms.map(room => room.id)
        })
            .orderBy('message.timestamp', 'DESC')
            .getMany();
        const lastMessageByRoom = new Map();
        lastMessages.forEach(message => {
            if (!lastMessageByRoom.has(message.roomId)) {
                lastMessageByRoom.set(message.roomId, message);
            }
        });
        return rooms.map(room => ({
            room,
            lastMessage: lastMessageByRoom.get(room.id) || null
        }));
    }
};
exports.FchatService = FchatService;
exports.FchatService = FchatService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(message_entity_1.Message)),
    __param(1, (0, typeorm_1.InjectRepository)(chat_room_entity_1.ChatRoom)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], FchatService);
//# sourceMappingURL=fchat.service.js.map