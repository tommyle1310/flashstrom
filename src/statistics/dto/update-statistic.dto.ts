import { PartialType } from '@nestjs/mapped-types';
import { CreateStatisticsDto } from './create-statistic.dto';
import { IsObject, IsOptional, IsArray, IsString } from 'class-validator';

export class UpdateStatisticsDto extends PartialType(CreateStatisticsDto) {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  records?: string[];

  @IsObject()
  @IsOptional()
  data?: {
    online_hours?: number;
    total_orders?: number;
    tickets_resolved?: number;
    earnings?: number;
    [key: string]: any;
  };
}
