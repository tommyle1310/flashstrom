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

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  ORDER_INFO = 'ORDER_INFO'
}

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  roomId: string;

  @ManyToOne(() => ChatRoom, chatRoom => chatRoom.messages) // Quan hệ với ChatRoom
  @JoinColumn({ name: 'roomId' }) // Trỏ tới cột roomId
  chatRoom: ChatRoom;

  @Column()
  senderId: string;

  @Column({
    type: 'enum',
    enum: Enum_UserType
  })
  senderType: Enum_UserType; // Dùng để xác định sender thuộc loại nào

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'senderId' })
  customerSender: Customer;

  @ManyToOne(() => Driver, { nullable: true })
  @JoinColumn({ name: 'senderId' })
  driverSender: Driver;

  @ManyToOne(() => Restaurant, { nullable: true })
  @JoinColumn({ name: 'senderId' })
  restaurantSender: Restaurant;

  @ManyToOne(() => CustomerCare, { nullable: true })
  @JoinColumn({ name: 'senderId' })
  customerCareSender: CustomerCare;

  @Column()
  content: string;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT
  })
  messageType: MessageType;

  @CreateDateColumn()
  timestamp: Date;

  @Column('text', { array: true, default: [] })
  readBy: string[]; // Mảng ID của các user đã đọc, dùng senderType để xác định loại

  // Không thêm quan hệ cứng cho senderId/readBy, xử lý trong service
}
