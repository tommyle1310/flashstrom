import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { ChatbotResponse } from './chatbot_response.entity';

@Entity('chatbot_guides')
export class ChatbotGuide {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  response_id: number;

  @ManyToOne(() => ChatbotResponse)
  @JoinColumn({ name: 'response_id' })
  response: ChatbotResponse;

  @Column({ type: 'integer' })
  step_number: number;

  @Column({ type: 'text' })
  step_text: string;

  @Column({ type: 'integer', nullable: true })
  next_step_id: number;

  @ManyToOne(() => ChatbotGuide, { nullable: true })
  @JoinColumn({ name: 'next_step_id' })
  next_step: ChatbotGuide;
}
