import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  IsNumber,
  IsUUID,
  IsDateString,
  ValidateNested,
  ArrayMaxSize,
  MaxLength,
  MinLength
} from 'class-validator';
import { Type } from 'class-transformer';
import { Enum_UserType } from 'src/types/Payload';
import { AdminRole } from 'src/utils/types/admin';

// DTO for file attachment
export class FileAttachmentDto {
  @IsString()
  fileName: string;

  @IsNumber()
  fileSize: number;

  @IsString()
  fileType: string;

  @IsString()
  fileUrl: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;
}
// DTO for order reference
export class OrderReferenceDto {
  @IsString()
  orderId: string;

  @IsOptional()
  @IsString()
  orderStatus?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  restaurantName?: string;

  @IsOptional()
  @IsNumber()
  totalAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  issueDescription?: string;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
}

// DTO for creating admin group chat
export class CreateAdminGroupDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  groupName: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  groupDescription?: string;

  @IsOptional()
  @IsString()
  groupAvatar?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  initialParticipants?: string[]; // Array of admin user IDs

  @IsOptional()
  @IsArray()
  @IsEnum(AdminRole, { each: true })
  allowedRoles?: AdminRole[];

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsNumber()
  maxParticipants?: number;
}

// DTO for sending group chat invitation
export class SendGroupInvitationDto {
  @IsUUID()
  groupId: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  invitedUserIds: string[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  message?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string; // Default 7 days if not provided
}

// DTO for responding to group invitation
export class RespondToInvitationDto {
  @IsUUID()
  inviteId: string;

  @IsEnum(['ACCEPT', 'DECLINE'])
  response: 'ACCEPT' | 'DECLINE';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reason?: string;
}

// DTO for sending admin message with order reference
export class SendAdminMessageDto {
  @IsUUID()
  roomId: string;

  @IsString()
  @MaxLength(4000)
  content: string;

  @IsOptional()
  @IsEnum([
    'TEXT',
    'IMAGE',
    'VIDEO',
    'FILE',
    'ORDER_REFERENCE',
    'ADMIN_NOTIFICATION'
  ])
  messageType?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => OrderReferenceDto)
  orderReference?: OrderReferenceDto;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  priority?: 'low' | 'medium' | 'high' | 'critical';

  @IsOptional()
  @IsUUID()
  replyToMessageId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => FileAttachmentDto)
  fileAttachment?: FileAttachmentDto;
}

// DTO for starting direct admin chat
export class StartDirectAdminChatDto {
  @IsString()
  withAdminId: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  priority?: 'low' | 'medium' | 'high' | 'critical';

  @IsOptional()
  @ValidateNested()
  @Type(() => OrderReferenceDto)
  initialOrderReference?: OrderReferenceDto;
}

// DTO for updating group settings
export class UpdateGroupSettingsDto {
  @IsUUID()
  groupId: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  groupName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  groupDescription?: string;

  @IsOptional()
  @IsString()
  groupAvatar?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(AdminRole, { each: true })
  allowedRoles?: AdminRole[];

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsNumber()
  maxParticipants?: number;
}

// DTO for managing group participants
export class ManageGroupParticipantDto {
  @IsUUID()
  groupId: string;

  @IsString()
  participantId: string;

  @IsEnum(['PROMOTE', 'DEMOTE', 'REMOVE'])
  action: 'PROMOTE' | 'DEMOTE' | 'REMOVE';

  @IsOptional()
  @IsEnum(['CREATOR', 'ADMIN', 'MEMBER'])
  newRole?: 'CREATOR' | 'ADMIN' | 'MEMBER';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

// DTO for searching admin chats
export class SearchAdminChatsDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(AdminRole, { each: true })
  participantRoles?: AdminRole[];

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsEnum(['ADMIN_DIRECT', 'ADMIN_GROUP'])
  roomType?: 'ADMIN_DIRECT' | 'ADMIN_GROUP';

  @IsOptional()
  @IsString()
  orderId?: string; // Search chats that reference this order

  @IsOptional()
  @IsNumber()
  limit?: number = 50;

  @IsOptional()
  @IsNumber()
  offset?: number = 0;
}

// Response DTO for admin chat list
export class AdminChatResponseDto {
  id: string;
  type: string;
  groupName?: string;
  groupDescription?: string;
  groupAvatar?: string;
  participants: {
    userId: string;
    userType: Enum_UserType;
    role?: string;
    name?: string;
    avatar?: string;
    isOnline?: boolean;
  }[];
  lastMessage?: {
    id: string;
    content: string;
    messageType: string;
    timestamp: Date;
    senderName: string;
    unreadCount: number;
  };
  createdAt: Date;
  lastActivity: Date;
  category?: string;
  tags?: string[];
  referencedOrders?: string[];
}

// Response DTO for pending invitations
export class PendingInvitationResponseDto {
  inviteId: string;
  groupId: string;
  groupName: string;
  groupDescription?: string;
  groupAvatar?: string;
  invitedBy: string;
  inviterName: string;
  inviterRole: AdminRole;
  invitedAt: Date;
  expiresAt: Date;
  message?: string;
  participantCount: number;
}

// DTO for getting room messages
export class GetRoomMessagesDto {
  @IsUUID()
  roomId: string;

  @IsOptional()
  @IsNumber()
  limit?: number = 50;

  @IsOptional()
  @IsNumber()
  offset?: number = 0;

  @IsOptional()
  @IsUUID()
  beforeMessageId?: string; // For cursor-based pagination
}

// DTO for marking messages as read
export class MarkMessagesAsReadDto {
  @IsUUID()
  roomId: string;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  messageIds?: string[]; // If not provided, marks all unread messages in room
}

// Response DTO for room messages
export class RoomMessagesResponseDto {
  roomId: string;
  messages: MessageResponseDto[];
  hasMore: boolean;
  total: number;
  pagination: {
    limit: number;
    offset: number;
    beforeMessageId?: string;
  };
}

// Response DTO for individual message
export class MessageResponseDto {
  id: string;
  roomId: string;
  senderId: string;
  senderType: Enum_UserType;
  content: string;
  messageType: string;
  orderReference?: OrderReferenceDto;
  fileAttachment?: FileAttachmentDto;
  replyToMessageId?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  readBy: string[];
  reactions?: Record<string, string[]>;
  isEdited: boolean;
  editedAt?: Date;
  systemMessageData?: any;
  groupInvitationData?: any;
  senderDetails?: {
    id: string;
    name: string;
    avatar?: string;
    role?: string;
  };
  replyToMessage?: {
    id: string;
    content: string;
    messageType: string;
    timestamp: Date;
    senderDetails?: {
      id: string;
      name: string;
    };
  };
}
