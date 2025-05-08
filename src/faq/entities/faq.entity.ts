import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

export enum FAQStatus {
  ACTIVE = 'ACTIVE',
  DRAFT = 'DRAFT',
  ARCHIVED = 'ARCHIVED'
}

export enum FAQType {
  GENERAL = 'GENERAL',
  ACCOUNT = 'ACCOUNT',
  PAYMENT = 'PAYMENT',
  SERVICE = 'SERVICE'
}

export enum FAQTargetUser {
  DRIVER = 'DRIVER',
  RESTAURANT = 'RESTAURANT',
  CUSTOMER = 'CUSTOMER',
  CUSTOMER_CARE = 'CUSTOMER_CARE'
}

export type FAQContentBlock =
  | { type: 'text'; value: string } // Đoạn text, có thể chứa Markdown hoặc href
  | { type: 'image'; value: { url: string; key: string } } // Một ảnh
  | {
      type: 'image_row';
      value: { url: string; key: string }[]; // Nhiều ảnh hiển thị theo flex row
    };

@Entity('faqs')
export class FAQ {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column()
  question: string; // Câu hỏi

  @Column({ type: 'jsonb' }) // Lưu trữ nội dung answer dưới dạng JSON
  answer: FAQContentBlock[]; // Mảng các block: text, image, hoặc image_row

  @Column({
    type: 'enum',
    enum: FAQType,
    default: FAQType.GENERAL // Mặc định là GENERAL
  })
  type: FAQType; // Thêm field type

  @Column({
    type: 'enum',
    enum: FAQStatus,
    default: FAQStatus.DRAFT
  })
  status: FAQStatus;

  @Column({
    type: 'enum',
    enum: FAQTargetUser,
    array: true, // Định nghĩa là mảng enum
    default: [] // Mặc định là mảng rỗng
  })
  target_user: FAQTargetUser[]; // Thêm field target_user

  @Column({ type: 'bigint' })
  created_at: number;

  @Column({ type: 'bigint', nullable: true })
  updated_at: number;

  @BeforeInsert()
  generateId() {
    this.id = `FF_FAQ_${uuidv4()}`;
    this.created_at = Math.floor(Date.now() / 1000);
  }
}
