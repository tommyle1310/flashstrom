import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Message } from './message.entity';
import { Enum_UserType } from 'src/types/Payload';
import { Customer } from 'src/customers/entities/customer.entity';
import { Driver } from 'src/drivers/entities/driver.entity';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { CustomerCare } from 'src/customer_cares/entities/customer_care.entity';
export enum RoomType {
  SUPPORT = 'SUPPORT',
  ORDER = 'ORDER',
  ADMIN = 'ADMIN' // Thêm nếu cần
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
  }[];

  @Column({ nullable: true })
  relatedId: string;

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

  @OneToMany(() => Message, message => message.chatRoom)
  messages: Message[];
}
