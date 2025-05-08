import { Repository } from 'typeorm';
import { FinanceRule } from './entities/finance_rule.entity';
export declare class FinanceRulesRepository {
    private financeRuleEntityRepository;
    constructor(financeRuleEntityRepository: Repository<FinanceRule>);
    findById(id: string): Promise<FinanceRule>;
    findAll(): Promise<FinanceRule[]>;
    create(createFinanceRuleDto: any): Promise<any>;
    update(id: string, updateFinanceRuleDto: any): Promise<FinanceRule>;
    remove(id: string): Promise<FinanceRule>;
    findAllPaginated(skip: number, limit: number): Promise<[FinanceRule[], number]>;
}
