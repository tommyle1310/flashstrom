import {
  Entity,
  Column,
  ManyToMany,
  BeforeInsert,
  PrimaryColumn
} from 'typeorm';
import { Promotion } from 'src/promotions/entities/promotion.entity';
import { v4 as uuidv4 } from 'uuid';

@Entity('food_categories')
export class FoodCategory {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  avatar: { url: string; key: string };

  @Column({ type: 'bigint' })
  created_at: number;

  @Column({ type: 'bigint' })
  updated_at: number;

  @ManyToMany(() => Promotion, promotion => promotion.food_categories)
  promotions: Promotion[];

  @BeforeInsert()
  generateId() {
    this.id = `FF_FC_${uuidv4()}`;
    const now = Math.floor(Date.now() / 1000);
    this.created_at = now;
    this.updated_at = now;
  }
}
