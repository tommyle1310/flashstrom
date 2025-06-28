import { Entity, Column, BeforeInsert, BeforeUpdate } from 'typeorm';

export enum VoucherStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  PENDING = 'PENDING',
  CANCELLED = 'CANCELLED',
  EXHAUSTED = 'EXHAUSTED'
}

export enum VoucherType {
  FIXED = 'FIXED',
  PERCENTAGE = 'PERCENTAGE',
  FREESHIP = 'FREESHIP'
}

export enum VoucherScope {
  ALL_CUSTOMERS = 'ALL_CUSTOMERS',
  NEW_CUSTOMERS = 'NEW_CUSTOMERS',
  RETURNING_CUSTOMERS = 'RETURNING_CUSTOMERS',
  SPECIFIC_CUSTOMERS = 'SPECIFIC_CUSTOMERS'
}

@Entity('vouchers')
export class Voucher {
  @Column({ primary: true })
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'bigint' })
  start_date: number;

  @Column({ type: 'bigint' })
  end_date: number;

  @Column({
    type: 'enum',
    enum: VoucherType
  })
  voucher_type: VoucherType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  discount_value: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maximum_discount_amount: number; // For percentage type, max discount cap

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minimum_order_value: number;

  @Column({ type: 'jsonb', nullable: true })
  avatar: { url: string; key: string };

  @Column({
    type: 'enum',
    enum: VoucherStatus,
    default: VoucherStatus.PENDING
  })
  status: VoucherStatus;

  @Column({
    type: 'enum',
    enum: VoucherScope,
    default: VoucherScope.ALL_CUSTOMERS
  })
  scope: VoucherScope;

  // Usage tracking
  @Column({ type: 'int', default: 0 })
  current_usage: number;

  @Column({ type: 'int', nullable: true })
  maximum_usage: number; // null means unlimited

  @Column({ type: 'int', default: 1 })
  usage_limit_per_customer: number; // How many times one customer can use this voucher

  // Constraints
  @Column({ type: 'jsonb', nullable: true })
  applicable_days: number[]; // Array of weekdays [0-6] where 0 = Sunday

  @Column({ type: 'jsonb', nullable: true })
  applicable_time_ranges: {
    start_time: string; // Format: "HH:MM"
    end_time: string; // Format: "HH:MM"
  }[];

  @Column('text', { array: true, default: [] })
  applicable_food_category_ids: string[];

  @Column('text', { array: true, default: [] })
  applicable_restaurant_ids: string[];

  @Column('text', { array: true, default: [] })
  excluded_food_category_ids: string[];

  @Column('text', { array: true, default: [] })
  excluded_restaurant_ids: string[];

  // Customer targeting
  @Column('text', { array: true, default: [] })
  specific_customer_ids: string[]; // Used when scope is SPECIFIC_CUSTOMERS

  @Column({ type: 'int', nullable: true })
  minimum_orders_required: number; // Customer must have at least X orders

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minimum_total_spent: number; // Customer must have spent at least X amount

  @Column({ type: 'bigint' })
  created_at: number;

  @Column({ type: 'bigint' })
  updated_at: number;

  @BeforeInsert()
  setTimestamps() {
    const timestamp = Math.floor(Date.now() / 1000);
    this.created_at = timestamp;
    this.updated_at = timestamp;
  }

  @BeforeUpdate()
  updateTimestamp() {
    this.updated_at = Math.floor(Date.now() / 1000);
  }

  // Helper methods
  isExpired(): boolean {
    const now = Math.floor(Date.now() / 1000);
    return now > this.end_date;
  }

  isActive(): boolean {
    const now = Math.floor(Date.now() / 1000);
    return (
      this.status === VoucherStatus.ACTIVE &&
      now >= this.start_date &&
      now <= this.end_date &&
      (this.maximum_usage === null || this.current_usage < this.maximum_usage)
    );
  }

  canBeUsedToday(): boolean {
    if (!this.applicable_days || this.applicable_days.length === 0) {
      return true;
    }
    const today = new Date().getDay();
    console.log(
      `[DEBUG] Voucher ${this.code} - Today is ${today}, applicable_days:`,
      this.applicable_days
    );
    const canUse = this.applicable_days.includes(today);
    console.log(`[DEBUG] Voucher ${this.code} - Can be used today: ${canUse}`);
    return canUse;
  }

  canBeUsedNow(): boolean {
    if (
      !this.applicable_time_ranges ||
      this.applicable_time_ranges.length === 0
    ) {
      return true;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    console.log(
      `[DEBUG] Voucher ${this.code} - Current time: ${currentTime}, applicable_time_ranges:`,
      this.applicable_time_ranges
    );

    const canUse = this.applicable_time_ranges.some(range => {
      const result =
        currentTime >= range.start_time && currentTime <= range.end_time;
      console.log(
        `[DEBUG] Voucher ${this.code} - Checking range ${range.start_time}-${range.end_time}: ${result}`
      );
      return result;
    });

    console.log(`[DEBUG] Voucher ${this.code} - Can be used now: ${canUse}`);
    return canUse;
  }
}
