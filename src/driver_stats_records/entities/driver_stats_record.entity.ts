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

@Entity('driver_stats_records')
export class DriverStatsRecord {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column()
  driver_id: string;

  @ManyToOne(() => Driver, driver => driver.id)
  @JoinColumn({ name: 'driver_id' })
  driver: Driver;

  @Column({ type: 'varchar' })
  period_type: string; // 'daily', 'weekly', 'monthly', 'yearly'

  @Column({ type: 'bigint' })
  period_start: number; // Thời gian bắt đầu của khoảng (epoch timestamp)

  @Column({ type: 'bigint' })
  period_end: number; // Thời gian kết thúc của khoảng (epoch timestamp)

  @Column({ type: 'float', default: 0 })
  total_online_hours: number; // Tổng số giờ online trong khoảng thời gian

  @Column({ type: 'float', default: 0 })
  total_earns: number; // Tổng earnings trong khoảng thời gian

  @Column({ type: 'float', default: 0 })
  total_tips: number; // Tổng tips trong khoảng thời gian

  @Column({ type: 'integer', default: 0 })
  total_orders: number; // Total number of orders completed in the period

  @Column('jsonb', { nullable: true })
  rating_summary: {
    average_food_rating: number;
    average_delivery_rating: number;
    average_overall_rating: number; // Average of all ratings
    total_ratings: number; // Total number of ratings received
    review_count: number;
    rating_distribution: {
      '1': number;
      '2': number;
      '3': number;
      '4': number;
      '5': number;
    }; // Distribution of ratings
  }; // Tổng hợp rating/review trong khoảng thời gian

  @Column({ type: 'bigint' })
  created_at: number;

  @Column({ type: 'bigint' })
  updated_at: number;

  @BeforeInsert()
  generateId() {
    this.id = `FF_DSR_${uuidv4()}`;
    const now = Math.floor(Date.now() / 1000);
    this.created_at = now;
    this.updated_at = now;
  }
}
