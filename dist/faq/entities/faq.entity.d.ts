export declare enum FAQStatus {
    ACTIVE = "ACTIVE",
    DRAFT = "DRAFT",
    ARCHIVED = "ARCHIVED"
}
export declare enum FAQType {
    GENERAL = "GENERAL",
    ACCOUNT = "ACCOUNT",
    PAYMENT = "PAYMENT",
    SERVICE = "SERVICE"
}
export type FAQContentBlock = {
    type: 'text';
    value: string;
} | {
    type: 'image';
    value: {
        url: string;
        key: string;
    };
} | {
    type: 'image_row';
    value: {
        url: string;
        key: string;
    }[];
};
export declare class FAQ {
    id: string;
    question: string;
    answer: FAQContentBlock[];
    type: FAQType;
    status: FAQStatus;
    created_at: number;
    updated_at: number;
    generateId(): void;
}
