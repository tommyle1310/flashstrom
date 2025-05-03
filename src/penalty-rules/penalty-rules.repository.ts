import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PenaltyRule } from './entities/penalty-rule.entity';

@Injectable()
export class PenaltyRulesRepository {
  constructor(
    @InjectRepository(PenaltyRule)
    private penaltyRuleEntityRepository: Repository<PenaltyRule>
  ) {}

  async findById(id: string): Promise<PenaltyRule> {
    return await this.penaltyRuleEntityRepository.findOne({ where: { id } });
  }

  async findByViolationType(violationType: string): Promise<PenaltyRule> {
    return await this.penaltyRuleEntityRepository.findOne({
      where: { violation_type: violationType }
    });
  }

  async create(createPenaltyRuleDto: any): Promise<any> {
    const rule = this.penaltyRuleEntityRepository.create(createPenaltyRuleDto);
    return await this.penaltyRuleEntityRepository.save(rule);
  }

  async update(id: string, updatePenaltyRuleDto: any): Promise<PenaltyRule> {
    await this.penaltyRuleEntityRepository.update(id, updatePenaltyRuleDto);
    return await this.findById(id);
  }

  async remove(id: string): Promise<PenaltyRule> {
    const rule = await this.findById(id);
    if (rule) {
      await this.penaltyRuleEntityRepository.delete(id);
    }
    return rule;
  }

  async findAllPaginated(
    skip: number,
    limit: number
  ): Promise<[PenaltyRule[], number]> {
    return this.penaltyRuleEntityRepository.findAndCount({
      skip,
      take: limit
    });
  }
}
