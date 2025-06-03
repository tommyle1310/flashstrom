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
    // Get sender details based on senderType with only necessary fields
    let senderDetails;
    switch (messageData.senderType) {
      case Enum_UserType.CUSTOMER:
        senderDetails = await this.customerRepository
          .createQueryBuilder('customer')
          .select([
            'customer.id',
            'customer.first_name',
            'customer.last_name',
            'customer.avatar',
            'customer.phone'
          ])
          .where('customer.id = :id', { id: messageData.senderId })
          .getOne();
        if (senderDetails) {
          senderDetails.first_name = senderDetails.first_name || '';
          senderDetails.last_name = senderDetails.last_name || '';
          senderDetails.avatar = senderDetails.avatar || null;
          senderDetails.phone = senderDetails.phone || '';
        }
        break;
      case Enum_UserType.DRIVER:
        senderDetails = await this.driverRepository
          .createQueryBuilder('driver')
          .select([
            'driver.id',
            'driver.first_name',
            'driver.last_name',
            'driver.avatar',
            'driver.contact_email',
            'driver.contact_phone'
          ])
          .where('driver.id = :id', { id: messageData.senderId })
          .getOne();
        if (senderDetails) {
          senderDetails.first_name = senderDetails.first_name || '';
          senderDetails.last_name = senderDetails.last_name || '';
          senderDetails.avatar = senderDetails.avatar || null;
          senderDetails.contact_email = senderDetails.contact_email || [];
          senderDetails.contact_phone = senderDetails.contact_phone || [];
        }
        break;
      case Enum_UserType.RESTAURANT_OWNER:
        senderDetails = await this.restaurantRepository
          .createQueryBuilder('restaurant')
          .select([
            'restaurant.id',
            'restaurant.restaurant_name',
            'restaurant.avatar',
            'restaurant.contact_email',
            'restaurant.contact_phone'
          ])
          .where('restaurant.id = :id', { id: messageData.senderId })
          .getOne();
        if (senderDetails) {
          senderDetails.restaurant_name = senderDetails.restaurant_name || '';
          senderDetails.avatar = senderDetails.avatar || null;
          senderDetails.contact_email = senderDetails.contact_email || [];
          senderDetails.contact_phone = senderDetails.contact_phone || [];
        }
        break;
      case Enum_UserType.CUSTOMER_CARE_REPRESENTATIVE:
        senderDetails = await this.customerCareRepository
          .createQueryBuilder('customerCare')
          .select([
            'customerCare.id',
            'customerCare.first_name',
            'customerCare.last_name',
            'customerCare.avatar',
            'customerCare.contact_phone'
          ])
          .where('customerCare.id = :id', { id: messageData.senderId })
          .getOne();
        if (senderDetails) {
          senderDetails.first_name = senderDetails.first_name || '';
          senderDetails.last_name = senderDetails.last_name || '';
          senderDetails.avatar = senderDetails.avatar || null;
          senderDetails.contact_phone = senderDetails.contact_phone || [];
        }
        break;
      default:
        throw new Error(`Invalid senderType: ${messageData.senderType}`);
    }

    if (!senderDetails) {
      throw new Error(`Sender not found for ID: ${messageData.senderId}`);
    }

    // Create the message entity
    const message = this.messageRepository.create({
      ...messageData,
      [messageData.senderType.toLowerCase() + 'Sender']: senderDetails
    });

    // Save the message
    const savedMessage = await this.messageRepository.save(message);

    // Log the generated SQL for debugging
    const query = this.messageRepository
      .createQueryBuilder('message')
      .select([
        'message.id',
        'message.roomId',
        'message.senderId',
        'message.senderType',
        'message.content',
        'message.messageType',
        'message.timestamp',
        'message.readBy'
      ])
      .leftJoin(
        'message.customerSender',
        'customerSender',
        'message.senderType = :customerType',
        { customerType: Enum_UserType.CUSTOMER }
      )
      .leftJoin(
        'message.driverSender',
        'driverSender',
        'message.senderType = :driverType',
        { driverType: Enum_UserType.DRIVER }
      )
      .leftJoin(
        'message.restaurantSender',
        'restaurantSender',
        'message.senderType = :restaurantType',
        { restaurantType: Enum_UserType.RESTAURANT_OWNER }
      )
      .leftJoin(
        'message.customerCareSender',
        'customerCareSender',
        'message.senderType = :customerCareType',
        { customerCareType: Enum_UserType.CUSTOMER_CARE_REPRESENTATIVE }
      )
      .addSelect([
        'customerSender.id',
        'customerSender.first_name',
        'customerSender.last_name',
        'customerSender.avatar',
        'customerSender.phone'
      ])
      .addSelect([
        'driverSender.id',
        'driverSender.first_name',
        'driverSender.last_name',
        'driverSender.avatar',
        'driverSender.contact_email',
        'driverSender.contact_phone'
      ])
      .addSelect([
        'restaurantSender.id',
        'restaurantSender.restaurant_name',
        'restaurantSender.avatar',
        'restaurantSender.contact_email',
        'restaurantSender.contact_phone'
      ])
      .addSelect([
        'customerCareSender.id',
        'customerCareSender.first_name',
        'customerCareSender.last_name',
        'customerCareSender.avatar',
        'customerCareSender.contact_phone'
      ])
      .where('message.id = :id', { id: savedMessage.id });
    console.log('Generated SQL:', await query.getSql());

    // Fetch the saved message with only necessary sender fields
    const messageWithRelations = await query.getOne();

    if (!messageWithRelations) {
      throw new Error('Failed to fetch message with relations');
    }

    // Apply fallbacks to sender fields
    if (messageWithRelations.customerSender) {
      messageWithRelations.customerSender.first_name =
        messageWithRelations.customerSender.first_name || '';
      messageWithRelations.customerSender.last_name =
        messageWithRelations.customerSender.last_name || '';
      messageWithRelations.customerSender.avatar =
        messageWithRelations.customerSender.avatar || null;
      messageWithRelations.customerSender.phone =
        messageWithRelations.customerSender.phone || '';
    }
    if (messageWithRelations.driverSender) {
      messageWithRelations.driverSender.first_name =
        messageWithRelations.driverSender.first_name || '';
      messageWithRelations.driverSender.last_name =
        messageWithRelations.driverSender.last_name || '';
      messageWithRelations.driverSender.avatar =
        messageWithRelations.driverSender.avatar || null;
      messageWithRelations.driverSender.contact_email =
        messageWithRelations.driverSender.contact_email || [];
      messageWithRelations.driverSender.contact_phone =
        messageWithRelations.driverSender.contact_phone || [];
    }
    if (messageWithRelations.restaurantSender) {
      messageWithRelations.restaurantSender.restaurant_name =
        messageWithRelations.restaurantSender.restaurant_name || '';
      messageWithRelations.restaurantSender.avatar =
        messageWithRelations.restaurantSender.avatar || null;
      messageWithRelations.restaurantSender.contact_email =
        messageWithRelations.restaurantSender.contact_email || [];
      messageWithRelations.restaurantSender.contact_phone =
        messageWithRelations.restaurantSender.contact_phone || [];
    }
    if (messageWithRelations.customerCareSender) {
      messageWithRelations.customerCareSender.first_name =
        messageWithRelations.customerCareSender.first_name || '';
      messageWithRelations.customerCareSender.last_name =
        messageWithRelations.customerCareSender.last_name || '';
      messageWithRelations.customerCareSender.avatar =
        messageWithRelations.customerCareSender.avatar || null;
      messageWithRelations.customerCareSender.contact_phone =
        messageWithRelations.customerCareSender.contact_phone || [];
    }

    return messageWithRelations;
  }

  async createRoom(roomData: Partial<ChatRoom>): Promise<ChatRoom> {
    console.log('check room created', roomData);
    const room = this.roomRepository.create(roomData);
    return this.roomRepository.save(room);
  }

  async getRoomMessages(roomId: string): Promise<Message[]> {
    const messages = await this.messageRepository
      .createQueryBuilder('message')
      .select([
        'message.id',
        'message.roomId',
        'message.senderId',
        'message.senderType',
        'message.content',
        'message.messageType',
        'message.timestamp',
        'message.readBy'
      ])
      .leftJoin(
        'message.customerSender',
        'customerSender',
        'message.senderType = :customerType',
        {
          customerType: Enum_UserType.CUSTOMER
        }
      )
      .leftJoin(
        'message.driverSender',
        'driverSender',
        'message.senderType = :driverType',
        {
          driverType: Enum_UserType.DRIVER
        }
      )
      .leftJoin(
        'message.restaurantSender',
        'restaurantSender',
        'message.senderType = :restaurantType',
        {
          restaurantType: Enum_UserType.RESTAURANT_OWNER
        }
      )
      .leftJoin(
        'message.customerCareSender',
        'customerCareSender',
        'message.senderType = :customerCareType',
        {
          customerCareType: Enum_UserType.CUSTOMER_CARE_REPRESENTATIVE
        }
      )
      .addSelect([
        'customerSender.id',
        'customerSender.first_name',
        'customerSender.last_name',
        'customerSender.avatar',
        'customerSender.phone'
      ])
      .addSelect([
        'driverSender.id',
        'driverSender.first_name',
        'driverSender.last_name',
        'driverSender.avatar',
        'driverSender.contact_email',
        'driverSender.contact_phone'
      ])
      .addSelect([
        'restaurantSender.id',
        'restaurantSender.restaurant_name',
        'restaurantSender.avatar',
        'restaurantSender.contact_email',
        'restaurantSender.contact_phone'
      ])
      .addSelect([
        'customerCareSender.id',
        'customerCareSender.first_name',
        'customerCareSender.last_name',
        'customerCareSender.avatar',
        'customerCareSender.contact_phone'
      ])
      .where('message.roomId = :roomId', { roomId })
      .orderBy('message.timestamp', 'ASC')
      .getMany();

    // Apply fallbacks to sender fields for all messages
    return messages.map(message => {
      if (message.customerSender) {
        message.customerSender.first_name =
          message.customerSender.first_name || '';
        message.customerSender.last_name =
          message.customerSender.last_name || '';
        message.customerSender.avatar = message.customerSender.avatar || null;
        message.customerSender.phone = message.customerSender.phone || '';
      }
      if (message.driverSender) {
        message.driverSender.first_name = message.driverSender.first_name || '';
        message.driverSender.last_name = message.driverSender.last_name || '';
        message.driverSender.avatar = message.driverSender.avatar || null;
        message.driverSender.contact_email =
          message.driverSender.contact_email || [];
        message.driverSender.contact_phone =
          message.driverSender.contact_phone || [];
      }
      if (message.restaurantSender) {
        message.restaurantSender.restaurant_name =
          message.restaurantSender.restaurant_name || '';
        message.restaurantSender.avatar =
          message.restaurantSender.avatar || null;
        message.restaurantSender.contact_email =
          message.restaurantSender.contact_email || [];
        message.restaurantSender.contact_phone =
          message.restaurantSender.contact_phone || [];
      }
      if (message.customerCareSender) {
        message.customerCareSender.first_name =
          message.customerCareSender.first_name || '';
        message.customerCareSender.last_name =
          message.customerCareSender.last_name || '';
        message.customerCareSender.avatar =
          message.customerCareSender.avatar || null;
        message.customerCareSender.contact_phone =
          message.customerCareSender.contact_phone || [];
      }
      return message;
    });
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
    const message = await this.messageRepository
      .createQueryBuilder('message')
      .select([
        'message.id',
        'message.roomId',
        'message.senderId',
        'message.senderType',
        'message.content',
        'message.messageType',
        'message.timestamp',
        'message.readBy'
      ])
      .leftJoin(
        'message.customerSender',
        'customerSender',
        'message.senderType = :customerType',
        {
          customerType: Enum_UserType.CUSTOMER
        }
      )
      .leftJoin(
        'message.driverSender',
        'driverSender',
        'message.senderType = :driverType',
        {
          driverType: Enum_UserType.DRIVER
        }
      )
      .leftJoin(
        'message.restaurantSender',
        'restaurantSender',
        'message.senderType = :restaurantType',
        {
          restaurantType: Enum_UserType.RESTAURANT_OWNER
        }
      )
      .leftJoin(
        'message.customerCareSender',
        'customerCareSender',
        'message.senderType = :customerCareType',
        {
          customerCareType: Enum_UserType.CUSTOMER_CARE_REPRESENTATIVE
        }
      )
      .addSelect([
        'customerSender.id',
        'customerSender.first_name',
        'customerSender.last_name',
        'customerSender.avatar',
        'customerSender.phone'
      ])
      .addSelect([
        'driverSender.id',
        'driverSender.first_name',
        'driverSender.last_name',
        'driverSender.avatar',
        'driverSender.contact_email',
        'driverSender.contact_phone'
      ])
      .addSelect([
        'restaurantSender.id',
        'restaurantSender.restaurant_name',
        'restaurantSender.avatar',
        'restaurantSender.contact_email',
        'restaurantSender.contact_phone'
      ])
      .addSelect([
        'customerCareSender.id',
        'customerCareSender.first_name',
        'customerCareSender.last_name',
        'customerCareSender.avatar',
        'customerCareSender.contact_phone'
      ])
      .where('message.roomId = :roomId', { roomId })
      .orderBy('message.timestamp', 'DESC')
      .limit(1)
      .getOne();

    if (!message) {
      return null;
    }

    // Apply fallbacks to sender fields
    if (message.customerSender) {
      message.customerSender.first_name =
        message.customerSender.first_name || '';
      message.customerSender.last_name = message.customerSender.last_name || '';
      message.customerSender.avatar = message.customerSender.avatar || null;
      message.customerSender.phone = message.customerSender.phone || '';
    }
    if (message.driverSender) {
      message.driverSender.first_name = message.driverSender.first_name || '';
      message.driverSender.last_name = message.driverSender.last_name || '';
      message.driverSender.avatar = message.driverSender.avatar || null;
      message.driverSender.contact_email =
        message.driverSender.contact_email || [];
      message.driverSender.contact_phone =
        message.driverSender.contact_phone || [];
    }
    if (message.restaurantSender) {
      message.restaurantSender.restaurant_name =
        message.restaurantSender.restaurant_name || '';
      message.restaurantSender.avatar = message.restaurantSender.avatar || null;
      message.restaurantSender.contact_email =
        message.restaurantSender.contact_email || [];
      message.restaurantSender.contact_phone =
        message.restaurantSender.contact_phone || [];
    }
    if (message.customerCareSender) {
      message.customerCareSender.first_name =
        message.customerCareSender.first_name || '';
      message.customerCareSender.last_name =
        message.customerCareSender.last_name || '';
      message.customerCareSender.avatar =
        message.customerCareSender.avatar || null;
      message.customerCareSender.contact_phone =
        message.customerCareSender.contact_phone || [];
    }

    return message;
  }

  async getRoomsByUserIdWithLastMessage(userId: string): Promise<
    {
      room: ChatRoom;
      lastMessage: Message | null;
      otherParticipantDetails: any | null;
      userMessageCount: number;
    }[]
  > {
    // Fetch rooms
    const rooms = await this.roomRepository
      .createQueryBuilder('room')
      .where(`room.participants @> :participant`, {
        participant: JSON.stringify([{ userId }])
      })
      .orderBy('room.lastActivity', 'DESC')
      .getMany();

    // If no rooms found, return empty array
    if (rooms.length === 0) {
      return [];
    }

    // Fetch last messages
    const lastMessages = await this.messageRepository
      .createQueryBuilder('message')
      .select([
        'message.id',
        'message.roomId',
        'message.senderId',
        'message.senderType',
        'message.content',
        'message.messageType',
        'message.timestamp',
        'message.readBy'
      ])
      .leftJoin(
        'message.customerSender',
        'customerSender',
        'message.senderType = :customerType',
        { customerType: Enum_UserType.CUSTOMER }
      )
      .leftJoin(
        'message.driverSender',
        'driverSender',
        'message.senderType = :driverType',
        { driverType: Enum_UserType.DRIVER }
      )
      .leftJoin(
        'message.restaurantSender',
        'restaurantSender',
        'message.senderType = :restaurantType',
        { restaurantType: Enum_UserType.RESTAURANT_OWNER }
      )
      .leftJoin(
        'message.customerCareSender',
        'customerCareSender',
        'message.senderType = :customerCareType',
        { customerCareType: Enum_UserType.CUSTOMER_CARE_REPRESENTATIVE }
      )
      .addSelect([
        'customerSender.id',
        'customerSender.first_name',
        'customerSender.last_name',
        'customerSender.avatar',
        'customerSender.phone'
      ])
      .addSelect([
        'driverSender.id',
        'driverSender.first_name',
        'driverSender.last_name',
        'driverSender.avatar',
        'driverSender.contact_email',
        'driverSender.contact_phone'
      ])
      .addSelect([
        'restaurantSender.id',
        'restaurantSender.restaurant_name',
        'restaurantSender.avatar',
        'restaurantSender.contact_email',
        'restaurantSender.contact_phone'
      ])
      .addSelect([
        'customerCareSender.id',
        'customerCareSender.first_name',
        'customerCareSender.last_name',
        'customerCareSender.avatar',
        'customerCareSender.contact_phone'
      ])
      .where('message.roomId IN (:...roomIds)', {
        roomIds: rooms.map(room => room.id)
      })
      .orderBy('message.timestamp', 'DESC')
      .getMany();

    // Fetch message counts for the user in each room
    const messageCounts = await this.messageRepository
      .createQueryBuilder('message')
      .select('message.roomId', 'roomId')
      .addSelect('COUNT(*)', 'count')
      .where('message.senderId = :userId', { userId })
      .andWhere('message.roomId IN (:...roomIds)', {
        roomIds: rooms.map(room => room.id)
      })
      .groupBy('message.roomId')
      .getRawMany();

    // Map message counts by room
    const messageCountByRoom = new Map<string, number>();
    messageCounts.forEach(({ roomId, count }) => {
      messageCountByRoom.set(roomId, parseInt(count, 10));
    });

    // Map last messages by room
    const lastMessageByRoom = new Map<string, Message>();
    lastMessages.forEach(message => {
      if (!lastMessageByRoom.has(message.roomId)) {
        // Apply fallbacks to sender fields
        if (message.customerSender) {
          message.customerSender.first_name =
            message.customerSender.first_name || '';
          message.customerSender.last_name =
            message.customerSender.last_name || '';
          message.customerSender.avatar = message.customerSender.avatar || null;
          message.customerSender.phone = message.customerSender.phone || '';
        }
        if (message.driverSender) {
          message.driverSender.first_name =
            message.driverSender.first_name || '';
          message.driverSender.last_name = message.driverSender.last_name || '';
          message.driverSender.avatar = message.driverSender.avatar || null;
          message.driverSender.contact_email =
            message.driverSender.contact_email || [];
          message.driverSender.contact_phone =
            message.driverSender.contact_phone || [];
        }
        if (message.restaurantSender) {
          message.restaurantSender.restaurant_name =
            message.restaurantSender.restaurant_name || '';
          message.restaurantSender.avatar =
            message.restaurantSender.avatar || null;
          message.restaurantSender.contact_email =
            message.restaurantSender.contact_email || [];
          message.restaurantSender.contact_phone =
            message.restaurantSender.contact_phone || [];
        }
        if (message.customerCareSender) {
          message.customerCareSender.first_name =
            message.customerCareSender.first_name || '';
          message.customerCareSender.last_name =
            message.customerCareSender.last_name || '';
          message.customerCareSender.avatar =
            message.customerCareSender.avatar || null;
          message.customerCareSender.contact_phone =
            message.customerCareSender.contact_phone || [];
        }
        lastMessageByRoom.set(message.roomId, message);
      }
    });

    // Fetch other participant details
    const otherParticipants = await Promise.all(
      rooms.map(async room => {
        const otherParticipant = room.participants.find(
          p => p.userId !== userId
        );
        if (!otherParticipant) return null;

        let participantDetails = null;
        switch (otherParticipant.userType) {
          case Enum_UserType.CUSTOMER:
            participantDetails = await this.customerRepository
              .createQueryBuilder('customer')
              .select([
                'customer.id',
                'customer.first_name',
                'customer.last_name',
                'customer.avatar',
                'customer.phone'
              ])
              .where('customer.id = :id', { id: otherParticipant.userId })
              .getOne();
            break;
          case Enum_UserType.DRIVER:
            participantDetails = await this.driverRepository
              .createQueryBuilder('driver')
              .select([
                'driver.id',
                'driver.first_name',
                'driver.last_name',
                'driver.avatar',
                'driver.contact_email',
                'driver.contact_phone'
              ])
              .where('driver.id = :id', { id: otherParticipant.userId })
              .getOne();
            break;
          case Enum_UserType.RESTAURANT_OWNER:
            participantDetails = await this.restaurantRepository
              .createQueryBuilder('restaurant')
              .select([
                'restaurant.id',
                'restaurant.restaurant_name',
                'restaurant.avatar',
                'restaurant.contact_email',
                'restaurant.contact_phone'
              ])
              .where('restaurant.id = :id', { id: otherParticipant.userId })
              .getOne();
            break;
          case Enum_UserType.CUSTOMER_CARE_REPRESENTATIVE:
            participantDetails = await this.customerCareRepository
              .createQueryBuilder('customerCare')
              .select([
                'customerCare.id',
                'customerCare.first_name',
                'customerCare.last_name',
                'customerCare.avatar',
                'customerCare.contact_phone'
              ])
              .where('customerCare.id = :id', { id: otherParticipant.userId })
              .getOne();
            break;
        }

        // Apply fallbacks to participant details
        if (participantDetails) {
          if (otherParticipant.userType === Enum_UserType.CUSTOMER) {
            participantDetails.first_name = participantDetails.first_name || '';
            participantDetails.last_name = participantDetails.last_name || '';
            participantDetails.avatar = participantDetails.avatar || null;
            participantDetails.phone = participantDetails.phone || '';
          } else if (otherParticipant.userType === Enum_UserType.DRIVER) {
            participantDetails.first_name = participantDetails.first_name || '';
            participantDetails.last_name = participantDetails.last_name || '';
            participantDetails.avatar = participantDetails.avatar || null;
            participantDetails.contact_email =
              participantDetails.contact_email || [];
            participantDetails.contact_phone =
              participantDetails.contact_phone || [];
          } else if (
            otherParticipant.userType === Enum_UserType.RESTAURANT_OWNER
          ) {
            participantDetails.restaurant_name =
              participantDetails.restaurant_name || '';
            participantDetails.avatar = participantDetails.avatar || null;
            participantDetails.contact_email =
              participantDetails.contact_email || [];
            participantDetails.contact_phone =
              participantDetails.contact_phone || [];
          } else if (
            otherParticipant.userType ===
            Enum_UserType.CUSTOMER_CARE_REPRESENTATIVE
          ) {
            participantDetails.first_name = participantDetails.first_name || '';
            participantDetails.last_name = participantDetails.last_name || '';
            participantDetails.avatar = participantDetails.avatar || null;
            participantDetails.contact_phone =
              participantDetails.contact_phone || [];
          }
        }

        return { roomId: room.id, participantDetails };
      })
    );

    const participantDetailsByRoom = new Map<string, any>();
    otherParticipants.forEach(participant => {
      if (participant) {
        participantDetailsByRoom.set(
          participant.roomId,
          participant.participantDetails
        );
      }
    });

    return rooms.map(room => ({
      room,
      lastMessage: lastMessageByRoom.get(room.id) || null,
      otherParticipantDetails: participantDetailsByRoom.get(room.id) || null,
      userMessageCount: messageCountByRoom.get(room.id) || 0
    }));
  }
}
