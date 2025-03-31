import { CreateStatisticsDto } from './create-statistic.dto';
declare const UpdateStatisticsDto_base: import("@nestjs/mapped-types").MappedType<Partial<CreateStatisticsDto>>;
export declare class UpdateStatisticsDto extends UpdateStatisticsDto_base {
    records?: string[];
    data?: {
        online_hours?: number;
        total_orders?: number;
        tickets_resolved?: number;
        earnings?: number;
        [key: string]: any;
    };
}
export {};
