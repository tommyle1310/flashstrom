import {
  Entity,
  Column,
  PrimaryColumn,
  BeforeInsert,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Admin } from 'src/admin/entities/admin.entity';

@Entity('finance_rules')
export class FinanceRule {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ type: 'json' })
  driver_fixed_wage: {
    '0-1km': number;
    '1-2km': number;
    '2-3km': number;
    '4-5km': number;
    '>5km': string;
  };

  @Column({ type: 'float' })
  customer_care_hourly_wage: number;

  @Column({ type: 'float' })
  app_service_fee: number;

  @Column({ type: 'float' })
  restaurant_commission: number;

  @Column({ type: 'varchar', nullable: true })
  created_by_id: string;

  @ManyToOne(() => Admin)
  @JoinColumn({ name: 'created_by_id', referencedColumnName: 'id' })
  created_by: Admin;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'bigint' })
  created_at: number;

  @Column({ type: 'bigint', nullable: true })
  updated_at: number;

  @BeforeInsert()
  generateId() {
    this.id = `FF_FIN_${uuidv4()}`;
    this.created_at = Math.floor(Date.now() / 1000);
  }
}
