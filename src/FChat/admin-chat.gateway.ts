import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  WsException
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { AdminChatService } from './admin-chat.service';
import { UsersService } from '../users/users.service';
import { AdminRole } from 'src/utils/types/admin';
import { RoomType } from './entities/chat-room.entity';
import { MessageType } from './entities/message.entity';

@WebSocketGateway({
  namespace: 'admin-chat',
  cors: {
    origin: ['*', 'http://localhost:3000', 'http://localhost:1310'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Authorization', 'auth', 'Content-Type']
  },
  transports: ['websocket', 'polling']
})
export class AdminChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;

  private adminSockets = new Map<string, Socket>();
  private adminRooms = new Map<
    string,
    {
      participants: string[];
      type: 'ADMIN_DIRECT' | 'ADMIN_GROUP';
      metadata?: any;
    }
  >();

  constructor(
    private readonly adminChatService: AdminChatService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService
  ) {}

  afterInit() {
    console.log('🚀 Admin Chat Gateway initialized!');
  }

  private async validateAdminToken(client: Socket): Promise<any> {
    try {
      let authHeader = client.handshake.headers.auth as string;
      if (!authHeader && client.handshake.auth && client.handshake.auth.token) {
        authHeader = client.handshake.auth.token;
      }

      if (!authHeader?.startsWith('Bearer ')) {
        console.log('❌ Invalid auth header format');
        client.disconnect();
        return null;
      }

      const token = authHeader.slice(7);
      if (!token) {
        console.log('❌ No token provided');
        client.disconnect();
        return null;
      }

      const decoded = await this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET
      });

      // Verify user is admin or customer care
      const validRoles = [
        'SUPER_ADMIN',
        'FINANCE_ADMIN',
        'COMPANION_ADMIN',
        'CUSTOMER_CARE_REPRESENTATIVE',
        'ADMIN'
      ];

      if (!validRoles.includes(decoded.logged_in_as)) {
        console.log(
          '❌ User is not admin/customer care:',
          decoded.logged_in_as
        );
        client.disconnect();
        return null;
      }

      console.log('✅ Admin validated:', decoded.id, decoded.logged_in_as);
      return decoded;
    } catch (error: any) {
      console.error('❌ Token validation error:', error);
      client.disconnect();
      return null;
    }
  }

  async handleConnection(client: Socket) {
    console.log('🔌 Admin trying to connect:', client.id);
    const adminData = await this.validateAdminToken(client);
    if (!adminData) {
      console.log('❌ Admin connection rejected');
      return;
    }

    client.data.admin = adminData;
    this.adminSockets.set(adminData.id, client);

    // Join admin to their personal room for notifications
    await client.join(`admin_${adminData.id}`);

    console.log('✅ Admin connected:', adminData.id, adminData.logged_in_as);

    // Emit connection success
    client.emit('adminConnected', {
      adminId: adminData.id,
      role: adminData.logged_in_as,
      timestamp: new Date().toISOString()
    });

    // Auto-join existing rooms
    await this.rejoinExistingRooms(client, adminData.id);
  }

  handleDisconnect(client: Socket) {
    const adminId = client.data.admin?.id;
    if (adminId) {
      this.adminSockets.delete(adminId);
      console.log('❌ Admin disconnected:', adminId);
    }
  }

  private async rejoinExistingRooms(client: Socket, adminId: string) {
    try {
      const adminChats = await this.adminChatService.getAdminChats(adminId);

      for (const chat of adminChats) {
        const roomName = this.getRoomName(chat.type, chat.id);
        await client.join(roomName);
        console.log(`🔄 Admin ${adminId} rejoined room: ${roomName}`);
      }
    } catch (error) {
      console.error('Error rejoining rooms:', error);
    }
  }

  private getRoomName(type: string, roomId: string): string {
    return `${type.toLowerCase()}_${roomId}`;
  }

  private getAdminId(client: Socket): string | null {
    return client.data.admin?.id || null;
  }

  // ============ GROUP CHAT MANAGEMENT ============

  @SubscribeMessage('createAdminGroup')
  async handleCreateAdminGroup(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      groupName: string;
      groupDescription?: string;
      groupAvatar?: string;
      initialParticipants?: string[];
      allowedRoles?: AdminRole[];
      category?: string;
      tags?: string[];
      isPublic?: boolean;
      maxParticipants?: number;
    }
  ) {
    try {
      const adminId = this.getAdminId(client);
      if (!adminId) {
        throw new WsException('Unauthorized');
      }

      console.log(`👥 Creating admin group: ${data.groupName} by ${adminId}`);

      const group = await this.adminChatService.createAdminGroup(adminId, data);
      const roomName = this.getRoomName('ADMIN_GROUP', group.id);

      // Join creator to group room
      await client.join(roomName);

      // Store room metadata
      this.adminRooms.set(roomName, {
        participants: [adminId, ...(data.initialParticipants || [])],
        type: 'ADMIN_GROUP',
        metadata: { groupName: data.groupName, category: data.category }
      });

      // Join initial participants and notify them
      if (data.initialParticipants) {
        for (const participantId of data.initialParticipants) {
          const participantSocket = this.adminSockets.get(participantId);
          if (participantSocket) {
            await participantSocket.join(roomName);
            participantSocket.emit('addedToGroup', {
              groupId: group.id,
              groupName: group.groupName,
              addedBy: adminId,
              addedByName:
                `${client.data.admin.first_name || ''} ${client.data.admin.last_name || ''}`.trim(),
              timestamp: new Date().toISOString()
            });
          }
        }
      }

      // Emit to all group members
      this.server.to(roomName).emit('groupCreated', {
        group: {
          id: group.id,
          type: group.type,
          groupName: group.groupName,
          groupDescription: group.groupDescription,
          groupAvatar: group.groupAvatar,
          participants: group.participants,
          createdBy: adminId,
          createdAt: group.createdAt,
          category: group.category,
          tags: group.tags
        },
        createdBy: {
          id: adminId,
          name: `${client.data.admin.first_name || ''} ${client.data.admin.last_name || ''}`.trim(),
          role: client.data.admin.logged_in_as
        },
        timestamp: new Date().toISOString()
      });

      // Response to creator
      client.emit('groupCreated', {
        success: true,
        groupId: group.id,
        groupName: group.groupName,
        participantCount: group.participants.length,
        timestamp: new Date().toISOString()
      });

      console.log(
        `✅ Group created: ${group.id} with ${group.participants.length} participants`
      );
      return { success: true, groupId: group.id };
    } catch (error: any) {
      console.error('❌ Error creating admin group:', error);
      client.emit('groupCreationError', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw new WsException(error.message || 'Failed to create admin group');
    }
  }

  // ============ GROUP INVITATION SYSTEM ============

  @SubscribeMessage('sendGroupInvitation')
  async handleSendGroupInvitation(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      groupId: string;
      invitedUserIds: string[];
      message?: string;
      expiresAt?: string;
    }
  ) {
    try {
      const adminId = this.getAdminId(client);
      if (!adminId) {
        throw new WsException('Unauthorized');
      }

      console.log(
        `📨 Sending group invitations for group ${data.groupId} to ${data.invitedUserIds.length} users`
      );

      const result = await this.adminChatService.sendGroupInvitation(
        adminId,
        data
      );

      // Notify invited users in real-time
      for (const invitedUserId of data.invitedUserIds) {
        const invitedSocket = this.adminSockets.get(invitedUserId);
        if (invitedSocket) {
          invitedSocket.emit('groupInvitationReceived', {
            inviteIds: result.invitationIds,
            groupId: data.groupId,
            invitedBy: adminId,
            inviterName:
              `${client.data.admin.first_name || ''} ${client.data.admin.last_name || ''}`.trim(),
            inviterRole: client.data.admin.logged_in_as,
            message: data.message,
            expiresAt: data.expiresAt,
            timestamp: new Date().toISOString()
          });
        }
      }

      // Notify group members about new invitations
      const roomName = this.getRoomName('ADMIN_GROUP', data.groupId);
      this.server.to(roomName).emit('invitationsSent', {
        groupId: data.groupId,
        invitedCount: data.invitedUserIds.length,
        invitedBy: adminId,
        inviterName:
          `${client.data.admin.first_name || ''} ${client.data.admin.last_name || ''}`.trim(),
        timestamp: new Date().toISOString()
      });

      client.emit('invitationsSent', {
        success: true,
        invitationIds: result.invitationIds,
        invitedCount: data.invitedUserIds.length,
        timestamp: new Date().toISOString()
      });

      return result;
    } catch (error: any) {
      console.error('❌ Error sending group invitation:', error);
      client.emit('invitationError', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw new WsException(error.message || 'Failed to send group invitation');
    }
  }

  @SubscribeMessage('respondToInvitation')
  async handleRespondToInvitation(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      inviteId: string;
      response: 'ACCEPT' | 'DECLINE';
      reason?: string;
    }
  ) {
    try {
      const adminId = this.getAdminId(client);
      if (!adminId) {
        throw new WsException('Unauthorized');
      }

      console.log(
        `📥 Admin ${adminId} responding to invitation ${data.inviteId}: ${data.response}`
      );

      const result = await this.adminChatService.respondToInvitation(
        adminId,
        data
      );

      if (result.success && result.groupId && data.response === 'ACCEPT') {
        const roomName = this.getRoomName('ADMIN_GROUP', result.groupId);
        await client.join(roomName);

        const group = await this.adminChatService.getGroupById(result.groupId);

        const notificationPayload = {
          groupId: result.groupId,
          userId: adminId,
          userName:
            `${client.data.admin.first_name || ''} ${client.data.admin.last_name || ''}`.trim(),
          userRole: client.data.admin.logged_in_as,
          timestamp: new Date().toISOString()
        };

        if (group) {
          for (const p of group.participants) {
            const participantSocket = this.adminSockets.get(p.userId);
            if (participantSocket) {
              participantSocket.emit('userJoinedGroup', notificationPayload);
            }
          }
        }

        client.emit('joinedGroup', {
          groupId: result.groupId,
          message: 'Welcome to the group!',
          timestamp: new Date().toISOString()
        });
      } else if (data.response === 'DECLINE' && result.groupId) {
        const roomName = this.getRoomName('ADMIN_GROUP', result.groupId);
        this.server.to(roomName).emit('invitationDeclined', {
          groupId: result.groupId,
          declinedBy: adminId,
          declinedByName:
            `${client.data.admin.first_name || ''} ${client.data.admin.last_name || ''}`.trim(),
          reason: data.reason,
          timestamp: new Date().toISOString()
        });
      }

      client.emit('invitationResponse', {
        success: result.success,
        response: data.response,
        groupId: result.groupId,
        timestamp: new Date().toISOString()
      });

      return result;
    } catch (error: any) {
      console.error('❌ Error responding to invitation:', error);
      client.emit('invitationResponseError', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw new WsException(error.message || 'Failed to respond to invitation');
    }
  }

  @SubscribeMessage('getPendingInvitations')
  async handleGetPendingInvitations(@ConnectedSocket() client: Socket) {
    try {
      const adminId = this.getAdminId(client);
      if (!adminId) {
        throw new WsException('Unauthorized');
      }

      const invitations =
        await this.adminChatService.getPendingInvitations(adminId);

      client.emit('pendingInvitations', {
        invitations,
        count: invitations.length,
        timestamp: new Date().toISOString()
      });

      return { success: true, invitations };
    } catch (error: any) {
      console.error('❌ Error getting pending invitations:', error);
      client.emit('invitationsError', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw new WsException(
        error.message || 'Failed to get pending invitations'
      );
    }
  }

  // ============ DIRECT CHAT ============

  @SubscribeMessage('startDirectChat')
  async handleStartDirectChat(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      withAdminId: string;
      category?: string;
      priority?: 'low' | 'medium' | 'high' | 'critical';
      initialOrderReference?: {
        orderId: string;
        issueDescription?: string;
        urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
      };
    }
  ) {
    try {
      const adminId = this.getAdminId(client);
      if (!adminId) {
        throw new WsException('Unauthorized');
      }

      console.log(
        `💬 Starting direct chat between ${adminId} and ${data.withAdminId}`
      );

      const directChat = await this.adminChatService.startDirectAdminChat(
        adminId,
        data
      );
      const roomName = this.getRoomName('ADMIN_DIRECT', directChat.id);

      // Join both users to the chat room
      await client.join(roomName);

      // Store room metadata
      this.adminRooms.set(roomName, {
        participants: [adminId, data.withAdminId],
        type: 'ADMIN_DIRECT',
        metadata: { category: data.category, priority: data.priority }
      });

      // Join other user and notify them
      const otherUserSocket = this.adminSockets.get(data.withAdminId);
      if (otherUserSocket) {
        await otherUserSocket.join(roomName);
        otherUserSocket.emit('directChatStarted', {
          chatId: directChat.id,
          withUser: adminId,
          withUserName:
            `${client.data.admin.first_name || ''} ${client.data.admin.last_name || ''}`.trim(),
          withUserRole: client.data.admin.logged_in_as,
          category: data.category,
          priority: data.priority,
          initialOrderReference: data.initialOrderReference,
          timestamp: new Date().toISOString()
        });
      }

      // Notify initiator
      client.emit('directChatStarted', {
        chatId: directChat.id,
        withUser: data.withAdminId,
        category: data.category,
        priority: data.priority,
        success: true,
        timestamp: new Date().toISOString()
      });

      // If there's an initial order reference, send it as first message
      if (data.initialOrderReference) {
        await this.sendOrderReferenceMessage(
          client,
          directChat.id,
          data.initialOrderReference,
          `Order ${data.initialOrderReference.orderId} - ${data.initialOrderReference.issueDescription || 'Reference'}`
        );
      }

      console.log(`✅ Direct chat created: ${directChat.id}`);
      return { success: true, chatId: directChat.id };
    } catch (error: any) {
      console.error('❌ Error starting direct chat:', error);
      client.emit('directChatError', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw new WsException(error.message || 'Failed to start direct chat');
    }
  }

  // ============ MESSAGING SYSTEM ============

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      roomId: string;
      content: string;
      messageType?:
        | 'TEXT'
        | 'IMAGE'
        | 'VIDEO'
        | 'FILE'
        | 'ORDER_REFERENCE'
        | 'ADMIN_NOTIFICATION';
      orderReference?: {
        orderId: string;
        orderStatus?: string;
        customerName?: string;
        restaurantName?: string;
        totalAmount?: number;
        issueDescription?: string;
        urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
      };
      priority?: 'low' | 'medium' | 'high' | 'critical';
      replyToMessageId?: string;
      fileAttachment?: {
        fileName: string;
        fileSize: number;
        fileType: string;
        fileUrl: string;
        thumbnailUrl?: string;
      };
      taggedUsers?: string[]; // For tagging participants
    }
  ) {
    try {
      const adminId = this.getAdminId(client);
      if (!adminId) {
        throw new WsException('Unauthorized');
      }

      console.log(`📤 Admin ${adminId} sending message to room ${data.roomId}`);

      const message = await this.adminChatService.sendAdminMessage(
        adminId,
        data
      );

      // Determine room type and name
      const chatRoom = await this.adminChatService.getAdminChats(adminId);
      const currentRoom = chatRoom.find(r => r.id === data.roomId);
      if (!currentRoom) {
        throw new WsException('Room not found or access denied');
      }

      const roomName = this.getRoomName(currentRoom.type, data.roomId);

      // Format message for real-time emission
      const formattedMessage = {
        id: message.id,
        roomId: message.roomId,
        senderId: message.senderId,
        senderType: message.senderType,
        content: message.content,
        messageType: message.messageType,
        orderReference: message.orderReference,
        fileAttachment: message.fileAttachment,
        replyToMessageId: message.replyToMessageId,
        priority: message.priority,
        timestamp: message.timestamp.toISOString(),
        readBy: message.readBy,
        taggedUsers: data.taggedUsers || [],
        senderDetails: {
          id: adminId,
          name: `${client.data.admin.first_name || ''} ${client.data.admin.last_name || ''}`.trim(),
          avatar: client.data.admin.avatar,
          role: client.data.admin.logged_in_as
        }
      };

      // Emit to all participants in the room
      this.server.to(roomName).emit('newMessage', formattedMessage);

      // Special handling for order references
      if (data.orderReference) {
        this.server.to(roomName).emit('orderReferenced', {
          roomId: data.roomId,
          orderId: data.orderReference.orderId,
          messageId: message.id,
          urgencyLevel: data.orderReference.urgencyLevel,
          referencedBy: {
            id: adminId,
            name: `${client.data.admin.first_name || ''} ${client.data.admin.last_name || ''}`.trim(),
            role: client.data.admin.logged_in_as
          },
          timestamp: new Date().toISOString()
        });
      }

      // Handle user tagging notifications
      if (data.taggedUsers && data.taggedUsers.length > 0) {
        for (const taggedUserId of data.taggedUsers) {
          const taggedSocket = this.adminSockets.get(taggedUserId);
          console.log('taggedSocket', taggedSocket);
          if (taggedSocket) {
            taggedSocket.emit('userTagged', {
              roomId: data.roomId,
              messageId: message.id,
              taggedBy: adminId,
              taggedByName:
                `${client.data.admin.first_name || ''} ${client.data.admin.last_name || ''}`.trim(),
              content: data.content,
              roomType: currentRoom.type,
              roomName: currentRoom.groupName || 'Direct Chat',
              timestamp: new Date().toISOString()
            });
          }
        }
      }

      client.emit('messageSent', {
        success: true,
        messageId: message.id,
        timestamp: new Date().toISOString()
      });

      return { success: true, messageId: message.id };
    } catch (error: any) {
      console.error('❌ Error sending message:', error);
      client.emit('messageError', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw new WsException(error.message || 'Failed to send message');
    }
  }

  private async sendOrderReferenceMessage(
    client: Socket,
    roomId: string,
    orderReference: any,
    content: string
  ) {
    const data = {
      roomId,
      content,
      messageType: 'ORDER_REFERENCE' as const,
      orderReference,
      priority: orderReference.urgencyLevel || 'medium'
    };

    return this.handleSendMessage(client, data);
  }

  // ============ ROOM MANAGEMENT ============

  @SubscribeMessage('getAdminChats')
  async handleGetAdminChats(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data?: {
      query?: string;
      category?: string;
      tags?: string[];
      roomType?: 'ADMIN_DIRECT' | 'ADMIN_GROUP';
      orderId?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    try {
      const adminId = this.getAdminId(client);
      if (!adminId) {
        throw new WsException('Unauthorized');
      }

      const chats = await this.adminChatService.getAdminChats(adminId, data);

      client.emit('adminChatsList', {
        chats,
        total: chats.length,
        filters: data,
        timestamp: new Date().toISOString()
      });

      return { success: true, chats };
    } catch (error: any) {
      console.error('❌ Error getting admin chats:', error);
      client.emit('chatsListError', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw new WsException(error.message || 'Failed to get admin chats');
    }
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { roomId: string; roomType: 'ADMIN_DIRECT' | 'ADMIN_GROUP' }
  ) {
    try {
      const adminId = this.getAdminId(client);
      if (!adminId) {
        throw new WsException('Unauthorized');
      }

      // Verify user has access to this room
      const adminChats = await this.adminChatService.getAdminChats(adminId);
      const hasAccess = adminChats.some(chat => chat.id === data.roomId);

      if (!hasAccess) {
        throw new WsException('Access denied to this room');
      }

      const roomName = this.getRoomName(data.roomType, data.roomId);
      await client.join(roomName);

      client.emit('roomJoined', {
        roomId: data.roomId,
        roomType: data.roomType,
        roomName,
        timestamp: new Date().toISOString()
      });

      console.log(`✅ Admin ${adminId} joined room: ${roomName}`);
      return { success: true };
    } catch (error: any) {
      console.error('❌ Error joining room:', error);
      client.emit('joinRoomError', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw new WsException(error.message || 'Failed to join room');
    }
  }

  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { roomId: string; roomType: 'ADMIN_DIRECT' | 'ADMIN_GROUP' }
  ) {
    try {
      const adminId = this.getAdminId(client);
      if (!adminId) {
        throw new WsException('Unauthorized');
      }

      const roomName = this.getRoomName(data.roomType, data.roomId);
      await client.leave(roomName);

      client.emit('roomLeft', {
        roomId: data.roomId,
        roomType: data.roomType,
        timestamp: new Date().toISOString()
      });

      console.log(`👋 Admin ${adminId} left room: ${roomName}`);
      return { success: true };
    } catch (error: any) {
      console.error('❌ Error leaving room:', error);
      client.emit('leaveRoomError', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw new WsException(error.message || 'Failed to leave room');
    }
  }

  // ============ GROUP MANAGEMENT ============

  @SubscribeMessage('updateGroupSettings')
  async handleUpdateGroupSettings(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      groupId: string;
      groupName?: string;
      groupDescription?: string;
      groupAvatar?: string;
      allowedRoles?: AdminRole[];
      category?: string;
      tags?: string[];
      isPublic?: boolean;
      maxParticipants?: number;
    }
  ) {
    try {
      const adminId = this.getAdminId(client);
      if (!adminId) {
        throw new WsException('Unauthorized');
      }

      const updatedGroup = await this.adminChatService.updateGroupSettings(
        adminId,
        data
      );
      const roomName = this.getRoomName('ADMIN_GROUP', data.groupId);

      // Notify all group members about settings update
      this.server.to(roomName).emit('groupSettingsUpdated', {
        groupId: data.groupId,
        updatedBy: adminId,
        updatedByName:
          `${client.data.admin.first_name || ''} ${client.data.admin.last_name || ''}`.trim(),
        changes: data,
        newSettings: {
          groupName: updatedGroup.groupName,
          groupDescription: updatedGroup.groupDescription,
          groupAvatar: updatedGroup.groupAvatar,
          allowedRoles: updatedGroup.allowedRoles,
          category: updatedGroup.category,
          tags: updatedGroup.tags,
          isPublic: updatedGroup.isPublic,
          maxParticipants: updatedGroup.maxParticipants
        },
        timestamp: new Date().toISOString()
      });

      return { success: true };
    } catch (error: any) {
      console.error('❌ Error updating group settings:', error);
      client.emit('groupSettingsError', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw new WsException(error.message || 'Failed to update group settings');
    }
  }

  @SubscribeMessage('manageGroupParticipant')
  async handleManageGroupParticipant(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      groupId: string;
      participantId: string;
      action: 'PROMOTE' | 'DEMOTE' | 'REMOVE';
      newRole?: 'CREATOR' | 'ADMIN' | 'MEMBER';
      reason?: string;
    }
  ) {
    try {
      const adminId = this.getAdminId(client);
      if (!adminId) {
        throw new WsException('Unauthorized');
      }

      const result = await this.adminChatService.manageGroupParticipant(
        adminId,
        data
      );
      const roomName = this.getRoomName('ADMIN_GROUP', data.groupId);

      // Notify all group members about the action
      this.server.to(roomName).emit('participantManaged', {
        groupId: data.groupId,
        participantId: data.participantId,
        action: data.action,
        newRole: data.newRole,
        managedBy: adminId,
        managerName:
          `${client.data.admin.first_name || ''} ${client.data.admin.last_name || ''}`.trim(),
        reason: data.reason,
        timestamp: new Date().toISOString()
      });

      // Special handling for removing participants
      if (data.action === 'REMOVE') {
        const participantSocket = this.adminSockets.get(data.participantId);
        if (participantSocket) {
          participantSocket.leave(roomName);
          participantSocket.emit('removedFromGroup', {
            groupId: data.groupId,
            reason: data.reason,
            removedBy: adminId,
            removedByName:
              `${client.data.admin.first_name || ''} ${client.data.admin.last_name || ''}`.trim(),
            timestamp: new Date().toISOString()
          });
        }
      }

      return result;
    } catch (error: any) {
      console.error('❌ Error managing group participant:', error);
      client.emit('participantManageError', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw new WsException(error.message || 'Failed to manage participant');
    }
  }

  // ============ ORDER INTEGRATION ============

  @SubscribeMessage('getOrderDetails')
  async handleGetOrderDetails(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string }
  ) {
    try {
      const adminId = this.getAdminId(client);
      if (!adminId) {
        throw new WsException('Unauthorized');
      }

      const orderDetails = await this.adminChatService.getOrderDetails(
        data.orderId
      );

      if (!orderDetails) {
        throw new WsException('Order not found');
      }

      client.emit('orderDetails', {
        orderId: data.orderId,
        details: orderDetails,
        timestamp: new Date().toISOString()
      });

      return { success: true, orderDetails };
    } catch (error: any) {
      console.error('❌ Error getting order details:', error);
      client.emit('orderDetailsError', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw new WsException(error.message || 'Failed to get order details');
    }
  }

  @SubscribeMessage('getChatsByOrderId')
  async handleGetChatsByOrderId(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string }
  ) {
    try {
      const adminId = this.getAdminId(client);
      if (!adminId) {
        throw new WsException('Unauthorized');
      }

      const chats = await this.adminChatService.getChatsByOrderId(data.orderId);

      client.emit('orderRelatedChats', {
        orderId: data.orderId,
        chats,
        count: chats.length,
        timestamp: new Date().toISOString()
      });

      return { success: true, chats };
    } catch (error: any) {
      console.error('❌ Error getting chats by order ID:', error);
      client.emit('orderChatsError', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw new WsException(
        error.message || 'Failed to get order-related chats'
      );
    }
  }

  // ============ TYPING INDICATORS ============

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { roomId: string; roomType: 'ADMIN_DIRECT' | 'ADMIN_GROUP' }
  ) {
    const adminId = this.getAdminId(client);
    if (!adminId) return;

    const roomName = this.getRoomName(data.roomType, data.roomId);
    client.to(roomName).emit('userTyping', {
      roomId: data.roomId,
      userId: adminId,
      userName:
        `${client.data.admin.first_name || ''} ${client.data.admin.last_name || ''}`.trim(),
      timestamp: new Date().toISOString()
    });
  }

  @SubscribeMessage('stopTyping')
  async handleStopTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { roomId: string; roomType: 'ADMIN_DIRECT' | 'ADMIN_GROUP' }
  ) {
    const adminId = this.getAdminId(client);
    if (!adminId) return;

    const roomName = this.getRoomName(data.roomType, data.roomId);
    client.to(roomName).emit('userStoppedTyping', {
      roomId: data.roomId,
      userId: adminId,
      timestamp: new Date().toISOString()
    });
  }

  // ============ UTILITY METHODS ============

  @SubscribeMessage('markMessageAsRead')
  async handleMarkMessageAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; roomId: string }
  ) {
    try {
      const adminId = this.getAdminId(client);
      if (!adminId) {
        throw new WsException('Unauthorized');
      }

      // Update message read status (implement in service if needed)
      // For now, just emit the read receipt
      const roomName =
        this.getRoomName('ADMIN_GROUP', data.roomId) ||
        this.getRoomName('ADMIN_DIRECT', data.roomId);

      client.to(roomName).emit('messageRead', {
        messageId: data.messageId,
        readBy: adminId,
        readByName:
          `${client.data.admin.first_name || ''} ${client.data.admin.last_name || ''}`.trim(),
        timestamp: new Date().toISOString()
      });

      return { success: true };
    } catch (error: any) {
      console.error('❌ Error marking message as read:', error);
      throw new WsException(error.message || 'Failed to mark message as read');
    }
  }

  @SubscribeMessage('ping')
  async handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', {
      timestamp: new Date().toISOString(),
      adminId: this.getAdminId(client)
    });
  }
}
