import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';

@Entity('restaurant_stats_records')
export class RestaurantStatsRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  restaurant_id: string;

  @Column()
  period_type: string; // daily, weekly, monthly

  @Column('bigint')
  period_start: number;

  @Column('bigint')
  period_end: number;

  @Column('float', { default: 0 })
  total_orders: number;

  @Column('float', { default: 0 })
  total_revenue: number;

  @Column('float', { default: 0 })
  total_delivery_fee: number;

  @Column('float', { default: 0 })
  total_commission: number;

  @Column('float', { default: 0 })
  total_tips: number;

  @Column('float', { default: 0 })
  total_online_hours: number;

  @Column('jsonb', { default: {} })
  rating_summary: {
    average_food_rating: number;
    average_service_rating: number;
    average_overall_rating: number;
    total_ratings: number;
    review_count: number;
    rating_distribution: {
      '1': number;
      '2': number;
      '3': number;
      '4': number;
      '5': number;
    };
  };

  @Column('jsonb', { default: {} })
  order_status_summary: {
    completed: number;
    cancelled: number;
    rejected: number;
  };

  @Column('jsonb', { default: {} })
  popular_items: {
    item_id: string;
    name: string;
    quantity: number;
    revenue: number;
  }[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
