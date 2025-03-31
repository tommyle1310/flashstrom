import { CreateStatisticRecordDto } from './create-statistic-record.dto';
declare const UpdateStatisticRecordDto_base: import("@nestjs/mapped-types").MappedType<Partial<CreateStatisticRecordDto>>;
export declare class UpdateStatisticRecordDto extends UpdateStatisticRecordDto_base {
    data?: {
        online_hours?: number;
        total_orders?: number;
        tickets_resolved?: number;
        earnings?: number;
        [key: string]: any;
    };
}
export {};
