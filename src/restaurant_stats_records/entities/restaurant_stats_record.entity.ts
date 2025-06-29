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
  period_type: string; // hourly, daily, weekly, monthly

  @Column('bigint')
  period_start: number;

  @Column('bigint')
  period_end: number;

  // Basic Stats
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

  // Enhanced Analytics
  @Column('float', { default: 0 })
  average_order_value: number;

  @Column('float', { default: 0 })
  order_completion_rate: number; // percentage of completed vs total orders

  @Column('float', { default: 0 })
  revenue_growth_rate: number; // percentage change from previous period

  @Column('jsonb', { default: {} })
  peak_hours_analysis: {
    busiest_hour: number; // 0-23
    peak_hours: number[]; // array of busy hours
    hourly_distribution: {
      [hour: string]: {
        orders: number;
        revenue: number;
        avg_order_value: number;
      };
    };
    peak_revenue_hour: number;
    slowest_hour: number;
  };

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
    rating_trend: number; // percentage change from previous period
  };

  @Column('jsonb', { default: {} })
  order_status_summary: {
    completed: number;
    cancelled: number;
    rejected: number;
    pending: number;
    preparing: number;
    in_progress: number;
    ready_for_pickup: number;
    dispatched: number;
    delivered: number;
  };

  @Column('jsonb', { default: {} })
  popular_items: {
    item_id: string;
    name: string;
    quantity: number;
    revenue: number;
    avg_rating?: number;
    growth_rate?: number; // percentage change from previous period
  }[];

  @Column('jsonb', { default: {} })
  revenue_insights: {
    total_revenue: number;
    previous_period_revenue: number;
    growth_amount: number;
    growth_percentage: number;
    trend: 'up' | 'down' | 'stable';
    comparison_period: string;
    best_day?: string; // for weekly/monthly stats
    worst_day?: string;
    daily_average?: number;
  };

  @Column('jsonb', { default: {} })
  performance_metrics: {
    avg_preparation_time: number; // in minutes
    avg_delivery_time: number; // in minutes
    customer_satisfaction_score: number; // 0-100
    repeat_customer_rate: number;
    peak_efficiency_score: number; // orders per hour during peak
  };

  @Column('jsonb', { default: {} })
  financial_breakdown: {
    gross_revenue: number;
    net_revenue: number; // after commissions
    delivery_fees_earned: number;
    tips_received: number;
    commission_paid: number;
    refunds_issued: number;
    avg_transaction_value: number;
  };

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
