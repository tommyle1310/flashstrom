import { PartialType } from '@nestjs/mapped-types';
import { CreateDriverStatsRecordDto } from './create-driver_stats_record.dto';

export class UpdateDriverStatsRecordDto extends PartialType(CreateDriverStatsRecordDto) {}
