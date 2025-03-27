import { PartialType } from '@nestjs/mapped-types';
import { CreateStatisticRecordDto } from './create-statistic-record.dto';
import { IsObject, IsOptional } from 'class-validator';

export class UpdateStatisticRecordDto extends PartialType(
  CreateStatisticRecordDto
) {
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
