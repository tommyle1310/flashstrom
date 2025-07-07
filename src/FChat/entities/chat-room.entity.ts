import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Message } from './message.entity';
import { Enum_UserType } from 'src/types/Payload';
import { Customer } from 'src/customers/entities/customer.entity';
import { Driver } from 'src/drivers/entities/driver.entity';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { CustomerCare } from 'src/customer_cares/entities/customer_care.entity';
import { Admin } from 'src/admin/entities/admin.entity';

export enum RoomType {
  SUPPORT = 'SUPPORT',
  ORDER = 'ORDER',
  ADMIN = 'ADMIN', // Generic admin chat
  ADMIN_DIRECT = 'ADMIN_DIRECT', // One-on-one admin chat
  ADMIN_GROUP = 'ADMIN_GROUP', // Group chat for admins
  ADMIN_SUPPORT = 'ADMIN_SUPPORT' // Admin escalation chat
}

export enum GroupChatInviteStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED'
}

export interface GroupChatParticipant {
  userId: string;
  userType: Enum_UserType;
  role?: 'CREATOR' | 'ADMIN' | 'MEMBER';
  joinedAt: Date;
  invitedBy?: string;
}

export interface PendingInvitation {
  inviteId: string;
  invitedUserId: string;
  invitedBy: string;
  invitedAt: Date;
  status: GroupChatInviteStatus;
  expiresAt: Date;
  message?: string;
}

@Entity('chatrooms')
export class ChatRoom {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: RoomType,
    default: RoomType.SUPPORT
  })
  type: RoomType;

  @Column('jsonb')
  participants: {
    userId: string;
    userType: Enum_UserType;
    customer?: Customer;
    driver?: Driver;
    restaurant?: Restaurant;
    customerCare?: CustomerCare;
    admin?: Admin;
    role?: 'CREATOR' | 'ADMIN' | 'MEMBER'; // For group chats
    joinedAt?: Date;
    invitedBy?: string;
  }[];

  @Column({ nullable: true })
  relatedId: string;

  // Group chat specific fields
  @Column({ nullable: true })
  groupName: string;

  @Column({ nullable: true })
  groupDescription: string;

  @Column({ nullable: true })
  groupAvatar: string;

  @Column({ nullable: true })
  createdBy: string; // User ID who created the group

  @Column({ type: 'int', default: 50 })
  maxParticipants: number;

  @Column('jsonb', { nullable: true, default: [] })
  pendingInvitations: PendingInvitation[];

  // Admin chat specific settings
  @Column({ type: 'boolean', default: false })
  isPublic: boolean; // If true, any admin can join without invitation

  @Column('text', { array: true, default: [] })
  allowedRoles: string[]; // Which admin roles can participate

  @Column({ nullable: true })
  category: string; // Chat category for organization

  @Column('text', { array: true, default: [] })
  tags: string[]; // Tags for categorization

  // Order referencing
  @Column('text', { array: true, default: [] })
  referencedOrders: string[]; // Order IDs referenced in this chat

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP'
  })
  createdAt: Date;

  @Column({
    name: 'last_activity',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP'
  })
  lastActivity: Date;

  @Column({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP'
  })
  updatedAt: Date;

  @OneToMany(() => Message, message => message.chatRoom)
  messages: Message[];
}
