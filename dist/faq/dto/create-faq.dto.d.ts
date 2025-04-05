import { FAQStatus, FAQType, FAQContentBlock } from '../entities/faq.entity';
export declare class CreateFAQDto {
    question: string;
    answer: FAQContentBlock[];
    type?: FAQType;
    status?: FAQStatus;
}
