import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { Promotion } from './entities/promotion.entity';
import { ApiResponse } from 'src/utils/createResponse';
import { PromotionsRepository } from './promotions.repository';
import { FoodCategoriesRepository } from 'src/food_categories/food_categories.repository';
export declare class PromotionsService {
    private readonly promotionsRepository;
    private readonly foodCategoriesRepository;
    constructor(promotionsRepository: PromotionsRepository, foodCategoriesRepository: FoodCategoriesRepository);
    create(createPromotionDto: CreatePromotionDto): Promise<ApiResponse<Promotion>>;
    findAll(): Promise<ApiResponse<Promotion[]>>;
    findOne(id: string): Promise<ApiResponse<Promotion>>;
    update(id: string, updatePromotionDto: UpdatePromotionDto): Promise<ApiResponse<Promotion>>;
    remove(id: string): Promise<ApiResponse<null>>;
}
