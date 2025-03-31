import { FoodCategory } from 'src/food_categories/entities/food_category.entity';
import { DiscountType, PromotionStatus } from '../entities/promotion.entity';
interface BogoDetails {
    buy_quantity: number;
    get_quantity: number;
    max_redemptions?: number;
}
export declare class CreatePromotionDto {
    name: string;
    description: string;
    start_date: number;
    end_date: number;
    discount_type: DiscountType;
    discount_value: number;
    promotion_cost_price: number;
    minimum_order_value: number;
    avatar?: {
        url: string;
        key: string;
    };
    status: PromotionStatus;
    food_categories?: FoodCategory[];
    bogo_details?: BogoDetails;
}
export {};
