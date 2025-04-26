import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { ChatRoom, RoomType } from './entities/chat-room.entity';
import { User } from 'src/users/entities/user.entity';
import { Enum_UserType } from 'src/types/Payload';
import { Customer } from 'src/customers/entities/customer.entity';
import { Driver } from 'src/drivers/entities/driver.entity';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { CustomerCare } from 'src/customer_cares/entities/customer_care.entity';

@Injectable()
export class FchatService {
  private connections = new Map<string, User>(); // socketId -> User

  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(ChatRoom)
    private roomRepository: Repository<ChatRoom>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(Driver)
    private driverRepository: Repository<Driver>,
    @InjectRepository(Restaurant)
    private restaurantRepository: Repository<Restaurant>,
    @InjectRepository(CustomerCare)
    private customerCareRepository: Repository<CustomerCare>
  ) {}

  async addConnection(socketId: string, user: User) {
    this.connections.set(socketId, user);
  }

  async removeConnection(socketId: string) {
    this.connections.delete(socketId);
  }

  async getRoomById(roomId: string): Promise<ChatRoom | null> {
    return this.roomRepository.findOne({ where: { id: roomId } });
  }

  async getRoomByParticipantsAndType(
    participantIds: string[],
    type: RoomType
  ): Promise<ChatRoom | null> {
    try {
      const room = await this.roomRepository
        .createQueryBuilder('chatRoom')
        .where('chatRoom.type = :type', { type })
        .andWhere('chatRoom.participants @> :participants', {
          participants: participantIds.map(id => ({ userId: id }))
        })
        .getOne();
      return room || null;
    } catch (error: any) {
      console.error('Error finding room by participants and type:', error);
      return null;
    }
  }

  async createMessage(messageData: Partial<Message>): Promise<Message> {
    // Get sender details based on senderType
    let senderDetails;
    switch (messageData.senderType) {
      case Enum_UserType.CUSTOMER:
        senderDetails = await this.customerRepository.findOne({
          where: { id: messageData.senderId }
        });
        break;
      case Enum_UserType.DRIVER:
        senderDetails = await this.driverRepository.findOne({
          where: { id: messageData.senderId }
        });
        break;
      case Enum_UserType.RESTAURANT_OWNER:
        senderDetails = await this.restaurantRepository.findOne({
          where: { id: messageData.senderId }
        });
        break;
      case Enum_UserType.CUSTOMER_CARE_REPRESENTATIVE:
        senderDetails = await this.customerCareRepository.findOne({
          where: { id: messageData.senderId }
        });
        break;
    }

    const message = this.messageRepository.create({
      ...messageData,
      [messageData.senderType.toLowerCase() + 'Sender']: senderDetails
    });

    return this.messageRepository.save(message);
  }

  async createRoom(roomData: Partial<ChatRoom>): Promise<ChatRoom> {
    console.log('check room created', roomData);
    const room = this.roomRepository.create(roomData);
    return this.roomRepository.save(room);
  }
  async getRoomMessages(roomId: string): Promise<Message[]> {
    return this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.customerSender', 'customerSender')
      .leftJoinAndSelect('message.driverSender', 'driverSender')
      .leftJoinAndSelect('message.restaurantSender', 'restaurantSender')
      .leftJoinAndSelect('message.customerCareSender', 'customerCareSender')
      .where('message.roomId = :roomId', { roomId })
      .orderBy('message.timestamp', 'ASC')
      .getMany();
  }

  async canUserJoinRoom(userId: string, roomId: string): Promise<boolean> {
    try {
      const room = await this.roomRepository.findOne({
        where: { id: roomId },
        relations: ['participants']
      });

      if (!room) {
        return false;
      }

      // Check if user is a participant in the room
      return room.participants.some(
        participant => participant.userId === userId
      );
    } catch (error: any) {
      console.error('Error checking room access:', error);
      return false;
    }
  }

  async updateRoomActivity(roomId: string): Promise<void> {
    try {
      await this.roomRepository.update(
        { id: roomId },
        { lastActivity: new Date() }
      );
    } catch (error: any) {
      console.error('Error updating room activity:', error);
      throw error;
    }
  }

  async getActiveChats(userId: string): Promise<ChatRoom[]> {
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

  async markMessagesAsRead(roomId: string, userId: string): Promise<void> {
    try {
      await this.messageRepository
        .createQueryBuilder()
        .update(Message)
        .set({
          readBy: () => `array_append("readBy", '${userId}')`
        })
        .where('roomId = :roomId', { roomId })
        .andWhere('NOT (:userId = ANY(readBy))', { userId })
        .execute();
    } catch (error: any) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }

  async getRoomsByUserId(userId: string): Promise<ChatRoom[]> {
    return this.roomRepository
      .createQueryBuilder('room')
      .where(`room.participants @> :participant`, {
        participant: JSON.stringify([{ userId }])
      })
      .orderBy('room.lastActivity', 'DESC')
      .getMany();
  }

  async getLastMessageForRoom(roomId: string): Promise<Message | null> {
    return this.messageRepository
      .createQueryBuilder('message')
      .where('message.roomId = :roomId', { roomId })
      .orderBy('message.timestamp', 'DESC')
      .limit(1)
      .getOne();
  }

  async getRoomsByUserIdWithLastMessage(userId: string): Promise<
    {
      room: ChatRoom;
      lastMessage: Message | null;
    }[]
  > {
    // Get rooms with all necessary relations
    const rooms = await this.roomRepository
      .createQueryBuilder('room')
      .leftJoinAndSelect('room.messages', 'messages')
      .leftJoinAndSelect('messages.customerSender', 'customerSender')
      .leftJoinAndSelect('messages.driverSender', 'driverSender')
      .leftJoinAndSelect('messages.restaurantSender', 'restaurantSender')
      .leftJoinAndSelect('messages.customerCareSender', 'customerCareSender')
      .where(`room.participants @> :participant`, {
        participant: JSON.stringify([{ userId }])
      })
      .orderBy('room.lastActivity', 'DESC')
      .getMany();

    // Get last message for each room with all relations
    const lastMessages = await this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.customerSender', 'customerSender')
      .leftJoinAndSelect('message.driverSender', 'driverSender')
      .leftJoinAndSelect('message.restaurantSender', 'restaurantSender')
      .leftJoinAndSelect('message.customerCareSender', 'customerCareSender')
      .where('message.roomId IN (:...roomIds)', {
        roomIds: rooms.map(room => room.id)
      })
      .orderBy('message.timestamp', 'DESC')
      .getMany();

    // Group messages by roomId and get the latest one
    const lastMessageByRoom = new Map<string, Message>();
    lastMessages.forEach(message => {
      if (!lastMessageByRoom.has(message.roomId)) {
        lastMessageByRoom.set(message.roomId, message);
      }
    });

    // Combine rooms with their last messages
    return rooms.map(room => ({
      room,
      lastMessage: lastMessageByRoom.get(room.id) || null
    }));
  }
}
