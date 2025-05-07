import { Entity, Column } from 'typeorm';

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
}
