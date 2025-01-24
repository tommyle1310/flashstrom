import { Module } from '@nestjs/common';
import { FoodCategoriesService } from './food_categories.service';
import { FoodCategoriesController } from './food_categories.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { FoodCategorySchema } from './food_categories.schema';

@Module({
     imports: [
        MongooseModule.forFeature([{ name: 'FoodCategory', schema:  FoodCategorySchema}]),
      ],
  controllers: [FoodCategoriesController],
  providers: [FoodCategoriesService],
})
export class FoodCategoriesModule {}
