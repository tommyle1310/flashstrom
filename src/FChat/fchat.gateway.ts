import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { FchatService } from './fchat.service';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { User } from 'src/users/entities/user.entity';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { RoomType } from './entities/chat-room.entity';
import { CreateRoomDto } from './dto/create-room.dto';

@WebSocketGateway({
  namespace: 'chat',
  cors: {
    origin: ['*', 'localhost:1310'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket']
})
export class FchatGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;

  // Track active connections and rooms
  private activeConnections = new Map<string, Socket>();
  private userRooms = new Map<string, Set<string>>();

  constructor(
    private readonly fchatService: FchatService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private eventEmitter: EventEmitter2
  ) {}

  afterInit() {
    console.log('Chat Gateway initialized!');
  }

  async handleConnection(client: Socket) {
    console.log('⚡️ Client connected to chat namespace:', client.id);
    const user = await this.validateToken(client);
    if (!user) {
      client.disconnect();
      return;
    }

    this.activeConnections.set(client.id, client);
    client.data.user = user;
    await this.fchatService.addConnection(client.id, user);
  }

  handleDisconnect(client: Socket) {
    console.log('❌ Client disconnected from chat namespace:', client.id);
    this.activeConnections.delete(client.id);
    this.fchatService.removeConnection(client.id);
  }

  @SubscribeMessage('createRoom')
  async handleCreateRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: CreateRoomDto
  ) {
    try {
      // Create the room
      const room = await this.fchatService.createRoom({
        type: data.type,
        participants: data.participants,
        createdAt: new Date(),
        lastActivity: new Date()
      });

      // Join the creator to the room
      await client.join(`chat_${room.id}`);
      console.log('check room', `chat_${room.id}`);
      // Track room membership
      const userId = client.data.user.id;
      if (!this.userRooms.has(userId)) {
        this.userRooms.set(userId, new Set());
      }
      this.userRooms.get(userId).add(room.id);

      // Notify all participants
      for (const participant of data.participants) {
        this.server.to(`user_${participant.userId}`).emit('roomCreated', room);
      }

      return {
        event: 'roomCreated',
        data: room
      };
    } catch (error) {
      console.error('Error creating room:', error);
      return {
        event: 'error',
        data: 'Failed to create room'
      };
    }
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(client: Socket, data: any) {
    const roomId = typeof data === 'string' ? data : data?.roomId;
    const userId = client.data.user?.id;

    try {
      // Validate if user can join the room
      const canJoin = await this.fchatService.canUserJoinRoom(userId, roomId);
      if (!canJoin) {
        throw new Error('Not authorized to join this room');
      }

      // Track room membership
      if (!this.userRooms.has(userId)) {
        this.userRooms.set(userId, new Set());
      }
      this.userRooms.get(userId).add(roomId);

      await client.join(`chat_${roomId}`);
      console.log(`✅ User ${userId} joined chat room ${roomId}`);

      // Get room history
      const messages = await this.fchatService.getRoomMessages(roomId);

      return {
        event: 'joinRoom',
        data: {
          roomId: roomId,
          messages: messages
        }
      };
    } catch (error) {
      console.error('❌ Error joining room:', error);
      return {
        event: 'error',
        data: 'Failed to join room'
      };
    }
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: CreateMessageDto
  ) {
    try {
      const message = await this.fchatService.createMessage({
        ...data,
        senderId: client.data.user.id,
        timestamp: new Date(),
        readBy: [client.data.user.id]
      });

      // Emit to room
      this.server.to(`chat_${data.roomId}`).emit('newMessage', message);

      // Update room activity
      await this.fchatService.updateRoomActivity(data.roomId);

      return {
        event: 'messageSent',
        data: message
      };
    } catch (error) {
      console.error('Error sending message:', error);
      return {
        event: 'error',
        data: 'Failed to send message'
      };
    }
  }

  @OnEvent('support.requestCreated')
  async handleSupportRequest(supportData: any) {
    try {
      const room = await this.fchatService.createRoom({
        type: RoomType.SUPPORT,
        participants: [supportData.userId, supportData.assignedTo],
        relatedId: supportData.requestId
      });

      // Notify participants
      this.server
        .to(`user_${supportData.userId}`)
        .emit('supportRoomCreated', room);
      this.server
        .to(`user_${supportData.assignedTo}`)
        .emit('supportRoomCreated', room);
    } catch (error) {
      console.error('Error handling support request:', error);
    }
  }

  private async validateToken(client: Socket): Promise<User | null> {
    const authHeader = client.handshake.headers.auth as string;

    if (!authHeader?.startsWith('Bearer ')) return null;

    const token = authHeader.slice(7); // Remove 'Bearer ' prefix
    if (!token) return null;

    try {
      const decoded = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET
      });
      const response = await this.usersService.findById(decoded.id);
      return response.EC === 0 ? response.data : null;
    } catch (error) {
      console.error('Token validation error:', error);
      return null;
    }
  }

  async emitToUser(userId: string, event: string, data: any) {
    try {
      this.server.to(`user_${userId}`).emit(event, data);
      console.log(`✅ Emitted ${event} to user ${userId}`);
    } catch (error) {
      console.error(`❌ Error emitting ${event} to user ${userId}:`, error);
    }
  }
}
