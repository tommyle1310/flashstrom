import { Entity, Column, PrimaryColumn, BeforeInsert } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity('banned_accounts')
export class BannedAccount {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ type: 'varchar' })
  entity_type: 'Customer' | 'CustomerCare' | 'Driver' | 'Restaurant';

  @Column({ type: 'varchar' })
  entity_id: string;

  @Column({ type: 'varchar' })
  banned_by: string;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ type: 'bigint' })
  banned_at: number;

  @BeforeInsert()
  generateId() {
    this.id = `FF_BAN_${uuidv4()}`;
    this.banned_at = Math.floor(Date.now() / 1000);
  }
}
