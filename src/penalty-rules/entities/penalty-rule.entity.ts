import { Entity, Column, PrimaryColumn, BeforeInsert } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity('penalty_rules')
export class PenaltyRule {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ type: 'varchar', unique: true })
  violation_type: string; // Loại vi phạm (ví dụ: 'late_delivery', 'unprofessional')

  @Column({ type: 'text' })
  description: string; // Mô tả quy tắc

  @Column({ type: 'int' })
  default_penalty_points: number; // Điểm phạt mặc định

  @Column({ type: 'bigint' })
  created_at: number;

  @Column({ type: 'bigint' })
  updated_at: number;

  @BeforeInsert()
  generateId() {
    this.id = `FF_PRULE_${uuidv4()}`;
    this.created_at = Math.floor(Date.now() / 1000);
    this.updated_at = Math.floor(Date.now() / 1000);
  }
}
