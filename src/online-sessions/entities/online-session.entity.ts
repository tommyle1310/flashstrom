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

@Entity('online_sessions')
export class OnlineSession {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ nullable: true }) // Liên kết với Driver nếu là Driver
  driver_id: string;

  @ManyToOne(() => Driver, driver => driver.id, { nullable: true })
  @JoinColumn({ name: 'driver_id' })
  driver: Driver;

  @Column({ nullable: true }) // Liên kết với CustomerCare nếu là CustomerCare
  customer_care_id: string;

  @ManyToOne(() => CustomerCare, cc => cc.id, { nullable: true })
  @JoinColumn({ name: 'customer_care_id' })
  customer_care: CustomerCare;

  @Column({ type: 'bigint' }) // Thời gian bắt đầu phiên online (epoch)
  start_time: number;

  @Column({ type: 'bigint', nullable: true }) // Thời gian kết thúc phiên (epoch)
  end_time: number;

  @Column({ type: 'boolean', default: false }) // Phiên có đang hoạt động không
  is_active: boolean;

  @BeforeInsert()
  generateId() {
    this.id = `FF_ONS_${uuidv4()}`;
    this.start_time = Math.floor(Date.now() / 1000);
  }
}
