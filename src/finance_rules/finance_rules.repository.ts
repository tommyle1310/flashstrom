import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinanceRule } from './entities/finance_rule.entity';

@Injectable()
export class FinanceRulesRepository {
  constructor(
    @InjectRepository(FinanceRule)
    private financeRuleEntityRepository: Repository<FinanceRule>
  ) {}

  async findById(id: string): Promise<FinanceRule> {
    return await this.financeRuleEntityRepository.findOne({
      where: { id },
      relations: ['created_by']
    });
  }

  async findAll(): Promise<FinanceRule[]> {
    return await this.financeRuleEntityRepository.find({
      order: { created_at: 'DESC' },
      relations: ['created_by']
    });
  }

  async create(createFinanceRuleDto: any): Promise<any> {
    const financeRule =
      this.financeRuleEntityRepository.create(createFinanceRuleDto);
    return await this.financeRuleEntityRepository.save(financeRule);
  }

  async update(id: string, updateFinanceRuleDto: any): Promise<FinanceRule> {
    await this.financeRuleEntityRepository.update(id, updateFinanceRuleDto);
    return await this.findById(id);
  }

  async remove(id: string): Promise<FinanceRule> {
    const financeRule = await this.findById(id);
    if (financeRule) {
      await this.financeRuleEntityRepository.delete(id);
    }
    return financeRule;
  }
}
