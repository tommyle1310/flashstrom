import { CreateFoodCategoryDto } from './dto/create-food_category.dto';
import { UpdateFoodCategoryDto } from './dto/update-food_category.dto';
import { FoodCategoriesRepository } from './food_categories.repository';
import { ApiResponse } from 'src/utils/createResponse';
import { FoodCategory } from './entities/food_category.entity';
export declare class FoodCategoriesService {
    private readonly foodCategoriesRepository;
    constructor(foodCategoriesRepository: FoodCategoriesRepository);
    create(createFoodCategoryDto: CreateFoodCategoryDto): Promise<ApiResponse<FoodCategory>>;
    findAll(): Promise<ApiResponse<FoodCategory[]>>;
    findOne(id: string): Promise<ApiResponse<FoodCategory>>;
    update(id: string, updateFoodCategoryDto: UpdateFoodCategoryDto): Promise<ApiResponse<FoodCategory>>;
    remove(id: string): Promise<ApiResponse<null>>;
}
