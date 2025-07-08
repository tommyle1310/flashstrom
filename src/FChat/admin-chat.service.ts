import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like, And } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  ChatRoom,
  RoomType,
  GroupChatInviteStatus,
  PendingInvitation
} from './entities/chat-room.entity';
import {
  Message,
  MessageType,
  OrderReference,
  GroupInvitationData,
  SystemMessageData
} from './entities/message.entity';
import { Admin } from 'src/admin/entities/admin.entity';
import { Order } from 'src/orders/entities/order.entity';
import { Enum_UserType } from 'src/types/Payload';
import { AdminRole } from 'src/utils/types/admin';
import {
  CreateAdminGroupDto,
  SendGroupInvitationDto,
  RespondToInvitationDto,
  SendAdminMessageDto,
  StartDirectAdminChatDto,
  UpdateGroupSettingsDto,
  ManageGroupParticipantDto,
  SearchAdminChatsDto,
  AdminChatResponseDto,
  PendingInvitationResponseDto
} from './dto/admin-chat.dto';
import { CustomerCare } from 'src/customer_cares/entities/customer_care.entity';

@Injectable()
export class AdminChatService {
  constructor(
    @InjectRepository(ChatRoom)
    private roomRepository: Repository<ChatRoom>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(CustomerCare)
    private customerCareRepository: Repository<CustomerCare>
  ) {}

  private getUserTypeForParticipant(
    participant: Admin | CustomerCare
  ): Enum_UserType {
    if ('role' in participant && (participant as Admin).role) {
      return this.getAdminUserType((participant as Admin).role);
    }
    return Enum_UserType.CUSTOMER_CARE_REPRESENTATIVE;
  }

  // ============ GROUP CHAT MANAGEMENT ============

  async createAdminGroup(
    creatorId: string,
    createGroupDto: CreateAdminGroupDto
  ): Promise<ChatRoom> {
    const creator = await this.adminRepository.findOne({
      where: { id: creatorId },
      relations: ['user']
    });

    if (!creator) {
      throw new Error('Creator not found or not an admin');
    }

    const initialParticipantIds = createGroupDto.initialParticipants || [];
    const allParticipantIds = [
      ...new Set([creatorId, ...initialParticipantIds])
    ];

    const adminIds = allParticipantIds.filter(id => id.startsWith('FF_ADMIN'));
    const ccIds = allParticipantIds.filter(id => id.startsWith('FF_CC'));

    const [admins, ccs] = await Promise.all([
      adminIds.length > 0
        ? this.adminRepository.find({ where: { id: In(adminIds) } })
        : [],
      ccIds.length > 0
        ? this.customerCareRepository.find({ where: { id: In(ccIds) } })
        : []
    ]);

    const allValidParticipants: (Admin | CustomerCare)[] = [...admins, ...ccs];

    if (allValidParticipants.length !== allParticipantIds.length) {
      const foundIds = new Set(allValidParticipants.map(p => p.id));
      const missingIds = allParticipantIds.filter(id => !foundIds.has(id));
      throw new Error(
        `Some participants are not valid admins or customer care staff: ${missingIds.join(', ')}`
      );
    }

    const participantMap = new Map(allValidParticipants.map(p => [p.id, p]));

    const groupRoom = this.roomRepository.create({
      type: RoomType.ADMIN_GROUP,
      groupName: createGroupDto.groupName,
      groupDescription: createGroupDto.groupDescription,
      groupAvatar: createGroupDto.groupAvatar,
      createdBy: creatorId,
      maxParticipants: createGroupDto.maxParticipants || 50,
      isPublic: createGroupDto.isPublic || false,
      allowedRoles: createGroupDto.allowedRoles || [],
      category: createGroupDto.category,
      tags: createGroupDto.tags || [],
      participants: allParticipantIds.map(id => {
        const participantUser = participantMap.get(id);
        return {
          userId: id,
          userType: this.getUserTypeForParticipant(participantUser),
          role: (id === creatorId ? 'CREATOR' : 'MEMBER') as
            | 'CREATOR'
            | 'ADMIN'
            | 'MEMBER',
          joinedAt: new Date(),
          invitedBy: id === creatorId ? undefined : creatorId
        };
      }),
      createdAt: new Date(),
      lastActivity: new Date(),
      pendingInvitations: []
    });

    const savedRoom = (await this.roomRepository.save(groupRoom)) as ChatRoom;

    await this.createSystemMessage(savedRoom.id, {
      type: 'GROUP_CREATED',
      userId: creatorId,
      userName: `${creator.first_name} ${creator.last_name}`.trim(),
      additionalInfo: {
        groupName: createGroupDto.groupName,
        participantCount: allParticipantIds.length
      }
    });

    return savedRoom;
  }

  async sendGroupInvitation(
    inviterId: string,
    sendInvitationDto: SendGroupInvitationDto
  ): Promise<{ success: boolean; invitationIds: string[] }> {
    // Verify group exists and inviter has permission
    const group = await this.roomRepository.findOne({
      where: { id: sendInvitationDto.groupId }
    });

    if (!group) {
      throw new Error('Group not found');
    }

    // Check if inviter is in the group and has permission
    const inviterParticipant = group.participants.find(
      p => p.userId === inviterId
    );
    if (
      !inviterParticipant ||
      (inviterParticipant.role !== 'CREATOR' &&
        inviterParticipant.role !== 'ADMIN')
    ) {
      throw new Error('Insufficient permissions to send invitations');
    }

    // Validate invited users are admins and not already in group
    const invitedAdmins = await this.adminRepository.find({
      where: { id: In(sendInvitationDto.invitedUserIds) },
      relations: ['user']
    });

    if (invitedAdmins.length !== sendInvitationDto.invitedUserIds.length) {
      throw new Error('Some invited users are not valid admins');
    }

    // Filter out users already in group
    const currentParticipantIds = group.participants.map(p => p.userId);
    const newInvitees = invitedAdmins.filter(
      admin => !currentParticipantIds.includes(admin.id)
    );

    if (newInvitees.length === 0) {
      throw new Error('All invited users are already in the group');
    }

    // Check group capacity
    if (
      group.participants.length + newInvitees.length >
      group.maxParticipants
    ) {
      throw new Error('Group capacity exceeded');
    }

    // Create invitations
    const inviter = await this.adminRepository.findOne({
      where: { id: inviterId },
      relations: ['user']
    });

    const expiresAt = sendInvitationDto.expiresAt
      ? new Date(sendInvitationDto.expiresAt)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days default

    const newInvitations: PendingInvitation[] = newInvitees.map(admin => ({
      inviteId: uuidv4(),
      invitedUserId: admin.id,
      invitedBy: inviterId,
      invitedAt: new Date(),
      status: GroupChatInviteStatus.PENDING,
      expiresAt,
      message: sendInvitationDto.message
    }));

    // Update group with new invitations
    group.pendingInvitations = [
      ...(group.pendingInvitations || []),
      ...newInvitations
    ];
    await this.roomRepository.save(group);

    // Send invitation messages to each invitee
    for (const invitation of newInvitations) {
      const invitationData: GroupInvitationData = {
        inviteId: invitation.inviteId,
        groupId: group.id,
        groupName: group.groupName,
        invitedBy: inviterId,
        inviterName: `${inviter.first_name} ${inviter.last_name}`.trim(),
        expiresAt: invitation.expiresAt,
        message: invitation.message
      };

      await this.createInvitationMessage(
        invitation.invitedUserId,
        invitationData
      );
    }

    return {
      success: true,
      invitationIds: newInvitations.map(inv => inv.inviteId)
    };
  }

  async respondToInvitation(
    userId: string,
    responseDto: RespondToInvitationDto
  ): Promise<{ success: boolean; groupId?: string }> {
    // Find the group with this invitation
    const groups = await this.roomRepository.find({
      where: {
        type: RoomType.ADMIN_GROUP
      }
    });

    let targetGroup: ChatRoom | null = null;
    let invitation: PendingInvitation | null = null;

    for (const group of groups) {
      const foundInvitation = group.pendingInvitations?.find(
        inv =>
          inv.inviteId === responseDto.inviteId && inv.invitedUserId === userId
      );
      if (foundInvitation) {
        targetGroup = group;
        invitation = foundInvitation;
        break;
      }
    }

    if (!targetGroup || !invitation) {
      throw new Error('Invitation not found');
    }

    // Check if invitation is still valid
    if (invitation.status !== GroupChatInviteStatus.PENDING) {
      throw new Error('Invitation already responded to');
    }

    if (new Date() > invitation.expiresAt) {
      throw new Error('Invitation has expired');
    }

    // Update invitation status
    invitation.status =
      responseDto.response === 'ACCEPT'
        ? GroupChatInviteStatus.ACCEPTED
        : GroupChatInviteStatus.DECLINED;

    if (responseDto.response === 'ACCEPT') {
      // Add user to group participants
      const admin = await this.adminRepository.findOne({
        where: { id: userId },
        relations: ['user']
      });

      targetGroup.participants.push({
        userId,
        userType: this.getUserTypeForParticipant(admin),
        role: 'MEMBER',
        joinedAt: new Date(),
        invitedBy: invitation.invitedBy
      });

      // Create system message for user joining
      await this.createSystemMessage(targetGroup.id, {
        type: 'USER_JOINED',
        userId,
        userName: `${admin.first_name} ${admin.last_name}`.trim()
      });
    }

    await this.roomRepository.save(targetGroup);

    return {
      success: true,
      groupId: responseDto.response === 'ACCEPT' ? targetGroup.id : undefined
    };
  }

  // ============ DIRECT ADMIN CHAT ============

  async startDirectAdminChat(
    initiatorId: string,
    directChatDto: StartDirectAdminChatDto
  ): Promise<ChatRoom> {
    // Verify both users are admins
    const [initiator, target] = await Promise.all([
      this.adminRepository.findOne({
        where: { id: initiatorId },
        relations: ['user']
      }),
      this.adminRepository.findOne({
        where: { id: directChatDto.withAdminId },
        relations: ['user']
      })
    ]);

    if (!initiator || !target) {
      throw new Error('One or both users are not valid admins');
    }

    // Check if direct chat already exists
    const existingChat = await this.roomRepository
      .createQueryBuilder('room')
      .where('room.type = :type', { type: RoomType.ADMIN_DIRECT })
      .andWhere(
        `room.participants @> :initiator AND room.participants @> :target`,
        {
          initiator: JSON.stringify([{ userId: initiatorId }]),
          target: JSON.stringify([{ userId: directChatDto.withAdminId }])
        }
      )
      .getOne();

    if (existingChat) {
      return existingChat;
    }

    // Create new direct chat room
    const directRoom = this.roomRepository.create({
      type: RoomType.ADMIN_DIRECT,
      participants: [
        {
          userId: initiatorId,
          userType: this.getUserTypeForParticipant(initiator),
          role: 'MEMBER',
          joinedAt: new Date()
        },
        {
          userId: directChatDto.withAdminId,
          userType: this.getUserTypeForParticipant(target),
          role: 'MEMBER',
          joinedAt: new Date()
        }
      ],
      category: directChatDto.category,
      createdAt: new Date(),
      lastActivity: new Date()
    });

    const savedRoom = await this.roomRepository.save(directRoom);

    // If there's an initial order reference, create that message
    if (directChatDto.initialOrderReference) {
      await this.sendAdminMessage(initiatorId, {
        roomId: savedRoom.id,
        content: `Order reference: ${directChatDto.initialOrderReference.orderId}`,
        messageType: 'ORDER_REFERENCE',
        orderReference: directChatDto.initialOrderReference,
        priority: directChatDto.priority
      });
    }

    return savedRoom;
  }

  // ============ MESSAGE HANDLING ============

  async sendAdminMessage(
    senderId: string,
    messageDto: SendAdminMessageDto
  ): Promise<Message> {
    // Verify sender is admin
    const senderAdmin = await this.adminRepository.findOne({
      where: { id: senderId },
      relations: ['user']
    });
    const senderCc = await this.customerCareRepository.findOne({
      where: { id: senderId },
      relations: ['user']
    });

    if (!senderAdmin && !senderCc) {
      throw new Error('Sender is not a valid admin or customer care');
    }

    // Verify room exists and sender is participant
    const room = await this.roomRepository.findOne({
      where: { id: messageDto.roomId }
    });

    if (!room) {
      throw new Error('Chat room not found');
    }

    const isParticipant = room.participants.some(p => p.userId === senderId);
    if (!isParticipant) {
      throw new Error('User is not a participant in this chat');
    }

    // If order reference, validate order exists
    if (messageDto.orderReference) {
      const order = await this.orderRepository.findOne({
        where: { id: messageDto.orderReference.orderId },
        relations: ['customer', 'restaurant']
      });

      if (!order) {
        throw new Error('Referenced order not found');
      }

      // Enhance order reference with actual data
      messageDto.orderReference.orderStatus =
        messageDto.orderReference.orderStatus || order.status;
      messageDto.orderReference.customerName =
        messageDto.orderReference.customerName ||
        `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim();
      messageDto.orderReference.restaurantName =
        messageDto.orderReference.restaurantName ||
        order.restaurant?.restaurant_name;
      messageDto.orderReference.totalAmount =
        messageDto.orderReference.totalAmount || Number(order.total_amount);

      // Add order to room's referenced orders
      if (!room.referencedOrders.includes(order.id)) {
        room.referencedOrders.push(order.id);
        await this.roomRepository.save(room);
      }
    }

    // Create message
    const message = this.messageRepository.create({
      roomId: messageDto.roomId,
      senderId,
      senderType: this.getUserTypeForParticipant(senderAdmin || senderCc),
      content: messageDto.content,
      messageType: (messageDto.messageType as MessageType) || MessageType.TEXT,
      orderReference: messageDto.orderReference,
      fileAttachment: messageDto.fileAttachment,
      replyToMessageId: messageDto.replyToMessageId,
      priority: messageDto.priority,
      readBy: [senderId],
      adminSender: senderAdmin ? senderAdmin : undefined,
      customerCareSender: senderCc ? senderCc : undefined
    });

    const savedMessage = await this.messageRepository.save(message);

    // Update room activity
    room.lastActivity = new Date();
    await this.roomRepository.save(room);

    return savedMessage;
  }

  // ============ GROUP MANAGEMENT ============

  async updateGroupSettings(
    userId: string,
    updateDto: UpdateGroupSettingsDto
  ): Promise<ChatRoom> {
    const group = await this.roomRepository.findOne({
      where: { id: updateDto.groupId }
    });

    if (!group) {
      throw new Error('Group not found');
    }

    // Check permissions
    const userParticipant = group.participants.find(p => p.userId === userId);
    if (
      !userParticipant ||
      (userParticipant.role !== 'CREATOR' && userParticipant.role !== 'ADMIN')
    ) {
      throw new Error('Insufficient permissions to update group settings');
    }

    // Update fields
    if (updateDto.groupName !== undefined)
      group.groupName = updateDto.groupName;
    if (updateDto.groupDescription !== undefined)
      group.groupDescription = updateDto.groupDescription;
    if (updateDto.groupAvatar !== undefined)
      group.groupAvatar = updateDto.groupAvatar;
    if (updateDto.allowedRoles !== undefined)
      group.allowedRoles = updateDto.allowedRoles;
    if (updateDto.category !== undefined) group.category = updateDto.category;
    if (updateDto.tags !== undefined) group.tags = updateDto.tags;
    if (updateDto.isPublic !== undefined) group.isPublic = updateDto.isPublic;
    if (updateDto.maxParticipants !== undefined)
      group.maxParticipants = updateDto.maxParticipants;

    group.updatedAt = new Date();

    return await this.roomRepository.save(group);
  }

  async manageGroupParticipant(
    managerId: string,
    manageDto: ManageGroupParticipantDto
  ): Promise<{ success: boolean }> {
    const group = await this.roomRepository.findOne({
      where: { id: manageDto.groupId }
    });

    if (!group) {
      throw new Error('Group not found');
    }

    // Check manager permissions
    const managerParticipant = group.participants.find(
      p => p.userId === managerId
    );
    if (
      !managerParticipant ||
      (managerParticipant.role !== 'CREATOR' &&
        managerParticipant.role !== 'ADMIN')
    ) {
      throw new Error('Insufficient permissions to manage participants');
    }

    // Find target participant
    const targetIndex = group.participants.findIndex(
      p => p.userId === manageDto.participantId
    );
    if (targetIndex === -1) {
      throw new Error('Participant not found in group');
    }

    const targetParticipant = group.participants[targetIndex];

    // Prevent actions on group creator
    if (
      targetParticipant.role === 'CREATOR' &&
      manageDto.action !== 'PROMOTE'
    ) {
      throw new Error('Cannot remove or demote group creator');
    }

    // Get participant details for system message
    const participant = await this.adminRepository.findOne({
      where: { id: manageDto.participantId }
    });

    switch (manageDto.action) {
      case 'PROMOTE':
        if (
          managerParticipant.role !== 'CREATOR' &&
          managerParticipant.role !== 'ADMIN'
        ) {
          throw new Error('Only group creators or admins can promote members.');
        }
        if (
          manageDto.newRole === 'CREATOR' &&
          managerParticipant.role !== 'CREATOR'
        ) {
          throw new Error('Only the group creator can assign a new creator.');
        }
        group.participants[targetIndex].role = manageDto.newRole || 'ADMIN';
        await this.createSystemMessage(group.id, {
          type: 'USER_PROMOTED',
          userId: manageDto.participantId,
          userName: `${participant.first_name} ${participant.last_name}`.trim(),
          additionalInfo: {
            newRole: manageDto.newRole,
            reason: manageDto.reason
          }
        });
        break;

      case 'DEMOTE':
        if (
          managerParticipant.role !== 'CREATOR' &&
          managerParticipant.role !== 'ADMIN'
        ) {
          throw new Error('Only group creators or admins can demote members.');
        }
        group.participants[targetIndex].role = 'MEMBER';
        await this.createSystemMessage(group.id, {
          type: 'USER_DEMOTED',
          userId: manageDto.participantId,
          userName: `${participant.first_name} ${participant.last_name}`.trim(),
          additionalInfo: { reason: manageDto.reason }
        });
        break;

      case 'REMOVE':
        group.participants.splice(targetIndex, 1);
        await this.createSystemMessage(group.id, {
          type: 'USER_LEFT',
          userId: manageDto.participantId,
          userName: `${participant.first_name} ${participant.last_name}`.trim(),
          additionalInfo: { reason: manageDto.reason, removedBy: managerId }
        });
        break;
    }

    await this.roomRepository.save(group);
    return { success: true };
  }

  // ============ SEARCH AND RETRIEVAL ============

  async getAdminChats(
    userId: string,
    searchDto?: SearchAdminChatsDto
  ): Promise<AdminChatResponseDto[]> {
    const queryBuilder = this.roomRepository
      .createQueryBuilder('room')
      .where('room.type IN (:...types)', {
        types: ['ADMIN_DIRECT', 'ADMIN_GROUP', 'ADMIN_SUPPORT']
      })
      .andWhere('room.participants @> :participant', {
        participant: JSON.stringify([{ userId }])
      });

    if (searchDto?.query) {
      queryBuilder.andWhere(
        '(room.groupName ILIKE :query OR room.groupDescription ILIKE :query)',
        { query: `%${searchDto.query}%` }
      );
    }

    if (searchDto?.category) {
      queryBuilder.andWhere('room.category = :category', {
        category: searchDto.category
      });
    }

    if (searchDto?.roomType) {
      queryBuilder.andWhere('room.type = :roomType', {
        roomType: searchDto.roomType
      });
    }

    if (searchDto?.orderId) {
      queryBuilder.andWhere('room.referencedOrders @> :orderId', {
        orderId: JSON.stringify([searchDto.orderId])
      });
    }

    if (searchDto?.tags && searchDto.tags.length > 0) {
      queryBuilder.andWhere('room.tags && :tags', { tags: searchDto.tags });
    }

    queryBuilder
      .orderBy('room.lastActivity', 'DESC')
      .limit(searchDto?.limit || 50)
      .offset(searchDto?.offset || 0);

    const rooms = await queryBuilder.getMany();

    // Convert to response DTOs
    const chatResponses: AdminChatResponseDto[] = [];

    for (const room of rooms) {
      // Get last message
      const lastMessage = await this.messageRepository.findOne({
        where: { roomId: room.id },
        order: { timestamp: 'DESC' },
        relations: ['adminSender']
      });

      // Get participant details
      const participantDetails = await Promise.all(
        room.participants.map(async p => {
          const admin = await this.adminRepository.findOne({
            where: { id: p.userId }
          });
          return {
            userId: p.userId,
            userType: p.userType,
            role: p.role,
            name: admin
              ? `${admin.first_name} ${admin.last_name}`.trim()
              : 'Unknown',
            avatar: admin?.avatar?.url,
            isOnline: false // Would need to implement online status tracking
          };
        })
      );

      const unreadCount = await this.messageRepository
        .createQueryBuilder('message')
        .where('message.roomId = :roomId', { roomId: room.id })
        .andWhere('NOT(:userId = ANY(message.readBy))', { userId })
        .getCount();

      chatResponses.push({
        id: room.id,
        type: room.type,
        groupName: room.groupName,
        groupDescription: room.groupDescription,
        groupAvatar: room.groupAvatar,
        participants: participantDetails,
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              content: lastMessage.content,
              messageType: lastMessage.messageType,
              timestamp: lastMessage.timestamp,
              senderName: lastMessage.adminSender
                ? `${lastMessage.adminSender.first_name} ${lastMessage.adminSender.last_name}`.trim()
                : 'Unknown',
              unreadCount: unreadCount
            }
          : undefined,
        createdAt: room.createdAt,
        lastActivity: room.lastActivity,
        category: room.category,
        tags: room.tags,
        referencedOrders: room.referencedOrders
      });
    }

    return chatResponses;
  }

  async getPendingInvitations(
    userId: string
  ): Promise<PendingInvitationResponseDto[]> {
    const groups = await this.roomRepository.find({
      where: {
        type: RoomType.ADMIN_GROUP
      }
    });

    const pendingInvitations: PendingInvitationResponseDto[] = [];

    for (const group of groups) {
      const userInvitations =
        group.pendingInvitations?.filter(
          inv =>
            inv.invitedUserId === userId &&
            inv.status === GroupChatInviteStatus.PENDING
          // new Date() <= inv.expiresAt
        ) || [];
      console.log('check userInvitations', userInvitations);
      for (const invitation of userInvitations) {
        const inviter = await this.adminRepository.findOne({
          where: { id: invitation.invitedBy }
        });

        pendingInvitations.push({
          inviteId: invitation.inviteId,
          groupId: group.id,
          groupName: group.groupName,
          groupDescription: group.groupDescription,
          groupAvatar: group.groupAvatar,
          invitedBy: invitation.invitedBy,
          inviterName: inviter
            ? `${inviter.first_name} ${inviter.last_name}`.trim()
            : 'Unknown',
          inviterRole: inviter?.role || AdminRole.COMPANION_ADMIN,
          invitedAt: invitation.invitedAt,
          expiresAt: invitation.expiresAt,
          message: invitation.message,
          participantCount: group.participants.length
        });
      }
    }

    return pendingInvitations.sort(
      (a, b) => b.invitedAt.getTime() - a.invitedAt.getTime()
    );
  }

  // ============ UTILITY METHODS ============

  private async createSystemMessage(
    roomId: string,
    systemData: SystemMessageData
  ): Promise<Message> {
    const message = this.messageRepository.create({
      roomId,
      senderId: 'SYSTEM',
      senderType: Enum_UserType.ADMIN,
      content: this.formatSystemMessage(systemData),
      messageType: MessageType.SYSTEM_MESSAGE,
      systemMessageData: systemData,
      readBy: []
    });

    return await this.messageRepository.save(message);
  }

  private async createInvitationMessage(
    userId: string,
    invitationData: GroupInvitationData
  ): Promise<void> {
    // This would typically be handled by a notification service
    // For now, we'll just log it
    console.log(`Invitation sent to ${userId}:`, invitationData);
  }

  private formatSystemMessage(data: SystemMessageData): string {
    switch (data.type) {
      case 'GROUP_CREATED':
        return `${data.userName} created the group "${data.additionalInfo?.groupName}"`;
      case 'USER_JOINED':
        return `${data.userName} joined the group`;
      case 'USER_LEFT':
        return `${data.userName} left the group`;
      case 'USER_PROMOTED':
        return `${data.userName} was promoted to ${data.additionalInfo?.newRole}`;
      case 'USER_DEMOTED':
        return `${data.userName} was demoted to member`;
      case 'GROUP_RENAMED':
        return `Group was renamed to "${data.additionalInfo?.newName}"`;
      case 'ORDER_ESCALATED':
        return `Order ${data.additionalInfo?.orderId} was escalated`;
      default:
        return `System message: ${data.type}`;
    }
  }

  private getAdminUserType(role: AdminRole): Enum_UserType {
    switch (role) {
      case AdminRole.SUPER_ADMIN:
        return Enum_UserType.SUPER_ADMIN;
      case AdminRole.FINANCE_ADMIN:
        return Enum_UserType.FINANCE_ADMIN;
      case AdminRole.COMPANION_ADMIN:
        return Enum_UserType.COMPANION_ADMIN;
      default:
        return Enum_UserType.ADMIN;
    }
  }

  // ============ ORDER INTEGRATION ============

  async getOrderDetails(orderId: string): Promise<OrderReference | null> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['customer', 'restaurant']
    });

    if (!order) {
      return null;
    }

    return {
      orderId: order.id,
      orderStatus: order.status,
      customerName:
        `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim(),
      restaurantName: order.restaurant?.restaurant_name,
      totalAmount: Number(order.total_amount)
    };
  }

  async getChatsByOrderId(orderId: string): Promise<AdminChatResponseDto[]> {
    return this.getAdminChats('', { orderId });
  }

  async getGroupById(groupId: string): Promise<ChatRoom> {
    return this.roomRepository.findOne({ where: { id: groupId } });
  }
}
