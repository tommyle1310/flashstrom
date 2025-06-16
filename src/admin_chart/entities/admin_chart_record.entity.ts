import {
  Entity,
  Column,
  PrimaryColumn,
  BeforeInsert,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity('admin_chart_records')
export class AdminChartRecord {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ type: 'varchar' })
  period_type: string; // 'daily', 'weekly', 'monthly', 'yearly'

  @Column({ type: 'bigint' })
  period_start: number; // Start timestamp of the period

  @Column({ type: 'bigint' })
  period_end: number; // End timestamp of the period

  @Column({ type: 'integer', default: 0 })
  total_users: number; // Total number of users in the system

  @Column({ type: 'integer', default: 0 })
  sold_promotions: number; // Total number of promotions sold

  @Column('jsonb', { nullable: true })
  net_income: {
    date: string;
    total_amount: number;
  }[]; // Net income data by date (from orders)

  @Column('jsonb', { nullable: true })
  gross_income: {
    date: string;
    total_amount: number;
  }[]; // Gross income data by date (from orders)

  @Column('jsonb', { nullable: true })
  order_stats: {
    date: string;
    completed: number;
    cancelled: number;
  }[]; // Order stats by date

  @Column('jsonb', { nullable: true })
  user_growth_rate: {
    date: string;
    driver: number;
    restaurant: number;
    customer: number;
    customer_care: number;
  }[]; // User growth rate by type

  @Column('jsonb', { nullable: true })
  gross_from_promotion: {
    metric: number;
    monthlyChanges: number;
    changeType: 'real' | 'percentage';
  }; // Gross revenue from promotions with monthly comparison

  @Column('jsonb', { nullable: true })
  average_customer_satisfaction: {
    metric: number;
    monthlyChanges: number;
    changeType: 'real' | 'percentage';
  }; // Average customer satisfaction rating with monthly comparison

  @Column('jsonb', { nullable: true })
  average_delivery_time: {
    metric: number;
    monthlyChanges: number;
    changeType: 'real' | 'percentage';
  }; // Average delivery time in seconds with monthly comparison

  @Column('jsonb', { nullable: true })
  order_cancellation_rate: {
    metric: number;
    monthlyChanges: number;
    changeType: 'real' | 'percentage';
  }; // Order cancellation rate with monthly comparison

  @Column('jsonb', { nullable: true })
  order_volume: {
    metric: number;
    monthlyChanges: number;
    changeType: 'real' | 'percentage';
  }; // Total order volume with monthly comparison

  @Column('jsonb', { nullable: true })
  churn_rate: {
    metric: number;
    monthlyChanges: number;
    changeType: 'real' | 'percentage';
  }; // Customer churn rate with monthly comparison

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @BeforeInsert()
  generateId() {
    this.id = `FF_ADMIN_CHART_${uuidv4()}`;
  }
}
