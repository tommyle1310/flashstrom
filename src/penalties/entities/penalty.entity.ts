import {
  Entity,
  Column,
  PrimaryColumn,
  BeforeInsert,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Driver } from 'src/drivers/entities/driver.entity';
import { CustomerCare } from 'src/customer_cares/entities/customer_care.entity';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { Admin } from 'src/admin/entities/admin.entity';
import { PenaltyRule } from '../../penalty-rules/entities/penalty-rule.entity';

@Entity('penalties')
export class Penalty {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ nullable: true })
  driver_id: string;

  @ManyToOne(() => Driver, driver => driver.id, { nullable: true })
  @JoinColumn({ name: 'driver_id' })
  driver: Driver;

  @Column({ nullable: true })
  customer_care_id: string;

  @ManyToOne(() => CustomerCare, cc => cc.id, { nullable: true })
  @JoinColumn({ name: 'customer_care_id' })
  customer_care: CustomerCare;

  @Column({ nullable: true })
  restaurant_id: string;

  @ManyToOne(() => Restaurant, restaurant => restaurant.id, { nullable: true })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @Column({ type: 'varchar' })
  penaltied_by_id: string;

  @ManyToOne(() => Admin, admin => admin.id, { nullable: false })
  @JoinColumn({ name: 'penaltied_by_id' })
  penaltied_by: Admin;

  @Column({ type: 'varchar' })
  rule_id: string; // Tham chiếu đến PenaltyRule

  @ManyToOne(() => PenaltyRule, rule => rule.id, { nullable: false })
  @JoinColumn({ name: 'rule_id' })
  rule: PenaltyRule;

  @Column({ type: 'text' })
  description: string; // Mô tả cụ thể của trường hợp này

  @Column({ type: 'int' })
  penalty_points: number; // Điểm phạt thực tế (có thể khác default)

  @Column({ type: 'varchar' })
  status: string; // 'pending', 'resolved', 'appealed'

  @Column({ type: 'bigint' })
  issued_at: number;

  @Column({ type: 'bigint', nullable: true })
  expires_at: number;

  @Column({ type: 'bigint' })
  created_at: number;

  @BeforeInsert()
  generateId() {
    this.id = `FF_PEN_${uuidv4()}`;
    this.created_at = Math.floor(Date.now() / 1000);
    this.issued_at = Math.floor(Date.now() / 1000);
  }
}
