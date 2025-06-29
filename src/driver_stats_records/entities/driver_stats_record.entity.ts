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

  // Basic Stats
  @Column({ type: 'float', default: 0 })
  total_online_hours: number; // Tổng số giờ online trong khoảng thời gian

  @Column({ type: 'float', default: 0 })
  total_earns: number; // Tổng earnings trong khoảng thời gian

  @Column({ type: 'float', default: 0 })
  total_tips: number; // Tổng tips trong khoảng thời gian

  @Column({ type: 'integer', default: 0 })
  total_orders: number; // Total number of orders completed in the period

  @Column({ type: 'float', default: 0 })
  total_distance: number; // Total distance traveled in km

  // Enhanced Analytics
  @Column({ type: 'float', default: 0 })
  average_earnings_per_hour: number; // Earnings per hour efficiency

  @Column({ type: 'float', default: 0 })
  average_earnings_per_order: number; // Earnings per order

  @Column({ type: 'float', default: 0 })
  average_tips_per_order: number; // Tips per order

  @Column({ type: 'float', default: 0 })
  order_completion_rate: number; // percentage of completed vs assigned orders

  @Column({ type: 'float', default: 0 })
  earnings_growth_rate: number; // percentage change from previous period

  @Column({ type: 'float', default: 0 })
  tips_growth_rate: number; // percentage change in tips from previous period

  @Column({ type: 'float', default: 0 })
  distance_efficiency: number; // earnings per km traveled

  // Peak Hours Analysis
  @Column('jsonb', { default: {} })
  peak_hours_analysis: {
    busiest_hour: number; // 0-23
    most_profitable_hour: number; // hour with highest earnings
    peak_hours: number[]; // array of busy hours
    hourly_distribution: {
      [hour: string]: {
        orders: number;
        earnings: number;
        tips: number;
        online_time: number;
        avg_earnings_per_order: number;
        distance_traveled: number;
      };
    };
    slowest_hour: number;
    peak_tips_hour: number;
  };

  // Performance Metrics
  @Column('jsonb', { default: {} })
  performance_metrics: {
    avg_pickup_time: number; // average time to reach restaurant (minutes)
    avg_delivery_time: number; // average time from pickup to delivery (minutes)
    avg_total_trip_time: number; // total time per order
    on_time_delivery_rate: number; // percentage of on-time deliveries
    customer_satisfaction_score: number; // 0-100 based on ratings
    acceptance_rate: number; // percentage of orders accepted vs offered
    completion_rate: number; // percentage of accepted orders completed
    cancellation_rate: number; // percentage of orders cancelled by driver
    avg_response_time: number; // time to accept order requests
    efficiency_score: number; // overall efficiency rating
  };

  // Financial Breakdown
  @Column('jsonb', { default: {} })
  financial_breakdown: {
    base_earnings: number; // earnings from wages
    tips_earnings: number; // earnings from tips
    bonus_earnings: number; // any bonuses received
    total_gross_earnings: number;
    estimated_fuel_cost: number; // based on distance and fuel efficiency
    estimated_net_earnings: number; // gross minus estimated costs
    avg_earnings_per_km: number;
    avg_earnings_per_minute: number;
    peak_hour_earnings: number; // earnings during peak hours
    off_peak_earnings: number; // earnings during off-peak hours
    weekend_earnings: number; // if applicable
    weekday_earnings: number; // if applicable
  };

  // Geographic Insights
  @Column('jsonb', { default: {} })
  geographic_insights: {
    most_profitable_areas: {
      area_name: string;
      total_orders: number;
      total_earnings: number;
      avg_earnings_per_order: number;
      avg_tip_per_order: number;
    }[];
    distance_analytics: {
      total_distance: number;
      avg_distance_per_order: number;
      longest_delivery: number;
      shortest_delivery: number;
      most_common_distance_range: string; // e.g., "2-5km"
    };
    route_efficiency: {
      total_trips: number;
      avg_trip_distance: number;
      estimated_optimal_distance: number;
      efficiency_percentage: number;
    };
    coverage_areas: string[]; // list of areas served
  };

  // Customer Interaction Analytics
  @Column('jsonb', { default: {} })
  customer_interaction: {
    unique_customers_served: number;
    repeat_customers: number;
    repeat_customer_rate: number;
    avg_customer_rating: number;
    customer_rating_trend: number; // change from previous period
    customer_complaints: number;
    customer_compliments: number;
    communication_rating: number; // based on customer feedback
  };

  // Order Analytics
  @Column('jsonb', { default: {} })
  order_analytics: {
    order_type_distribution: {
      food_delivery: number;
      grocery: number;
      pharmacy: number;
      other: number;
    };
    order_value_distribution: {
      under_10: number;
      '10_to_25': number;
      '25_to_50': number;
      '50_to_100': number;
      over_100: number;
    };
    peak_order_times: {
      breakfast: number; // 6-10 AM
      lunch: number; // 11 AM - 2 PM
      dinner: number; // 5-9 PM
      late_night: number; // 9 PM - 12 AM
      overnight: number; // 12 AM - 6 AM
    };
    restaurant_diversity: number; // number of different restaurants served
  };

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
    rating_trend: number; // percentage change from previous period
    service_quality_score: number; // 0-100 based on ratings and reviews
  }; // Tổng hợp rating/review trong khoảng thời gian

  // Competitive Analysis
  @Column('jsonb', { default: {} })
  competitive_insights: {
    rank_in_area: number; // ranking among drivers in the same area
    percentile_earnings: number; // earnings percentile compared to other drivers
    percentile_rating: number; // rating percentile compared to other drivers
    top_performer_metrics: {
      earnings: boolean;
      ratings: boolean;
      efficiency: boolean;
      consistency: boolean;
    };
  };

  // Time-based Insights
  @Column('jsonb', { default: {} })
  time_insights: {
    most_productive_day: string; // day of week
    least_productive_day: string;
    consistency_score: number; // how consistent earnings are day-to-day
    weekend_vs_weekday_performance: {
      weekend_earnings: number;
      weekday_earnings: number;
      weekend_orders: number;
      weekday_orders: number;
      preference_indicator: 'weekend' | 'weekday' | 'balanced';
    };
    seasonal_performance: {
      peak_season_earnings: number;
      off_season_earnings: number;
      weather_impact_score: number;
    };
  };

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
