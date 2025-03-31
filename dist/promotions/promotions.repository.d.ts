import { Repository } from 'typeorm';
import { Promotion } from './entities/promotion.entity';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
export declare class PromotionsRepository {
    private promotionRepository;
    constructor(promotionRepository: Repository<Promotion>);
    create(promotionData: Partial<Promotion>): Promise<Promotion>;
    findAll(): Promise<Promotion[]>;
    findById(id: string): Promise<Promotion | null>;
    findByName(name: string): Promise<Promotion | null>;
    update(id: string, updateData: UpdatePromotionDto): Promise<void>;
    delete(id: string): Promise<{
        affected?: number;
    }>;
    findByIds(ids: string[]): Promise<Promotion[]>;
}
