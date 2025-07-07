import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { Enum_UserType } from 'src/types/Payload';
import { ChatRoom } from './chat-room.entity'; // Import ChatRoom
import { Customer } from 'src/customers/entities/customer.entity';
import { Driver } from 'src/drivers/entities/driver.entity';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { CustomerCare } from 'src/customer_cares/entities/customer_care.entity';
import { Admin } from 'src/admin/entities/admin.entity';

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  ORDER_INFO = 'ORDER_INFO',
  ORDER_REFERENCE = 'ORDER_REFERENCE', // For referencing/tagging orders
  GROUP_INVITATION = 'GROUP_INVITATION', // For group chat invitations
  SYSTEM_MESSAGE = 'SYSTEM_MESSAGE', // System notifications (user joined, left, etc.)
  ADMIN_NOTIFICATION = 'ADMIN_NOTIFICATION', // Admin-specific notifications
  FILE = 'FILE', // File attachments
  VOICE = 'VOICE', // Voice messages
  LOCATION = 'LOCATION', // Location sharing
  CONTACT = 'CONTACT' // Contact sharing
}

export interface OrderReference {
  orderId: string;
  orderStatus?: string;
  customerName?: string;
  restaurantName?: string;
  totalAmount?: number;
  issueDescription?: string;
  urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export interface GroupInvitationData {
  inviteId: string;
  groupId: string;
  groupName: string;
  invitedBy: string;
  inviterName: string;
  expiresAt: Date;
  message?: string;
}

export interface SystemMessageData {
  type:
    | 'USER_JOINED'
    | 'USER_LEFT'
    | 'USER_PROMOTED'
    | 'USER_DEMOTED'
    | 'GROUP_CREATED'
    | 'GROUP_RENAMED'
    | 'ORDER_ESCALATED';
  userId?: string;
  userName?: string;
  additionalInfo?: Record<string, any>;
}

export interface FileAttachment {
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  thumbnailUrl?: string;
}

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'room_id' })
  roomId: string;

  @ManyToOne(() => ChatRoom, chatRoom => chatRoom.messages) // Quan hệ với ChatRoom
  @JoinColumn({ name: 'room_id' }) // Trỏ tới cột roomId
  chatRoom: ChatRoom;

  @Column({ name: 'sender_id' })
  senderId: string;

  @Column({
    name: 'sender_type',
    type: 'enum',
    enum: Enum_UserType
  })
  senderType: Enum_UserType; // Dùng để xác định sender thuộc loại nào

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'sender_id' })
  customerSender: Customer;

  @ManyToOne(() => Driver, { nullable: true })
  @JoinColumn({ name: 'sender_id' })
  driverSender: Driver;

  @ManyToOne(() => Restaurant, { nullable: true })
  @JoinColumn({ name: 'sender_id' })
  restaurantSender: Restaurant;

  @ManyToOne(() => CustomerCare, { nullable: true })
  @JoinColumn({ name: 'sender_id' })
  customerCareSender: CustomerCare;

  // Add support for admin senders
  @ManyToOne(() => Admin, { nullable: true })
  @JoinColumn({ name: 'sender_id' })
  adminSender: Admin;

  @Column()
  content: string;

  @Column({
    name: 'message_type',
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT
  })
  messageType: MessageType;

  // Order reference metadata
  @Column('jsonb', { nullable: true })
  orderReference: OrderReference;

  // Group invitation metadata
  @Column('jsonb', { nullable: true })
  groupInvitationData: GroupInvitationData;

  // System message metadata
  @Column('jsonb', { nullable: true })
  systemMessageData: SystemMessageData;

  // File attachment metadata
  @Column('jsonb', { nullable: true })
  fileAttachment: FileAttachment;

  // Reply to message functionality
  @Column({ nullable: true })
  replyToMessageId: string;

  @ManyToOne(() => Message, { nullable: true })
  @JoinColumn({ name: 'replyToMessageId' })
  replyToMessage: Message;

  // Message reactions (like, dislike, etc.)
  @Column('jsonb', { nullable: true, default: {} })
  reactions: Record<string, string[]>; // { "👍": ["userId1", "userId2"], "👎": ["userId3"] }

  // Message editing
  @Column({ type: 'boolean', default: false })
  isEdited: boolean;

  @Column({ nullable: true })
  editedAt: Date;

  // Message priority for admin messages
  @Column({
    type: 'enum',
    enum: ['low', 'medium', 'high', 'critical'],
    nullable: true
  })
  priority: 'low' | 'medium' | 'high' | 'critical';

  @CreateDateColumn()
  timestamp: Date;

  @Column('text', { name: 'read_by', array: true, default: [] })
  readBy: string[]; // Mảng ID của các user đã đọc, dùng senderType để xác định loại

  // Không thêm quan hệ cứng cho senderId/readBy, xử lý trong service
}
