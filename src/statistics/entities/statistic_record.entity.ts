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

@Entity('statistic_records')
export class StatisticRecord {
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
  period_type: string; // 'daily', 'weekly', 'monthly', 'yearly'

  @Column({ type: 'bigint' })
  period_start: number; // Thời gian bắt đầu của record

  @Column({ type: 'bigint' })
  period_end: number; // Thời gian kết thúc của record

  @Column('jsonb')
  data: {
    online_hours?: number;
    total_orders?: number;
    tickets_resolved?: number;
    earnings?: number;
    [key: string]: any;
  }; // Dữ liệu chi tiết của record

  @Column({ type: 'bigint' })
  created_at: number;

  @BeforeInsert()
  generateId() {
    this.id = `FF_SREC_${uuidv4()}`;
    this.created_at = Math.floor(Date.now() / 1000);
  }
}
