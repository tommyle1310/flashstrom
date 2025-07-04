import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';

export enum ResponseType {
  TEXT = 'TEXT',
  OPTIONS = 'OPTIONS',
  GUIDE = 'GUIDE',
  ACTION = 'ACTION'
}

export enum ActionCode {
  FIND_ORDER_BY_ID = 'FIND_ORDER_BY_ID',
  GET_CUSTOMERS_REGISTERED_TODAY = 'GET_CUSTOMERS_REGISTERED_TODAY',
  GET_TOTAL_ORDERS_TODAY = 'GET_TOTAL_ORDERS_TODAY',
  GET_GROSS_REVENUE_TODAY = 'GET_GROSS_REVENUE_TODAY',
  GET_PENDING_ORDERS = 'GET_PENDING_ORDERS'
}

export interface ChatbotOption {
  id: number;
  text: string;
  next_id?: number;
}

@Entity('chatbot_responses')
export class ChatbotResponse {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  keyword: string;

  @Column({
    type: 'enum',
    enum: ResponseType
  })
  response_type: ResponseType;

  @Column({ type: 'text' })
  response_text: string;

  @Column({ type: 'jsonb', nullable: true })
  options: ChatbotOption[];

  @Column({ type: 'integer', nullable: true })
  parent_id: number;

  @Column({
    type: 'enum',
    enum: ActionCode,
    nullable: true
  })
  action_code: ActionCode;

  @ManyToOne(() => ChatbotResponse, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: ChatbotResponse;

  @OneToMany(() => ChatbotResponse, response => response.parent)
  children: ChatbotResponse[];

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
