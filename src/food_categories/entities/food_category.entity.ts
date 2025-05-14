import { Entity, Column, ManyToMany } from 'typeorm';
import { Promotion } from 'src/promotions/entities/promotion.entity';

@Entity('food_categories')
export class FoodCategory {
  @Column({ primary: true })
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  avatar: { url: string; key: string };

  @Column()
  created_at: number;

  @Column()
  updated_at: number;

  @ManyToMany(() => Promotion, promotion => promotion.food_categories)
  promotions: Promotion[];
}
