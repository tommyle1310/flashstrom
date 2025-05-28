import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinanceRule } from './entities/finance_rule.entity';

@Injectable()
export class FinanceRulesRepository {
  private readonly logger = new Logger(FinanceRulesRepository.name);

  constructor(
    @InjectRepository(FinanceRule)
    private financeRuleEntityRepository: Repository<FinanceRule>
  ) {}

  async findById(id: string): Promise<FinanceRule | null> {
    try {
      return await this.financeRuleEntityRepository.findOne({
        where: { id }
      });
    } catch (error) {
      this.logger.error(
        `Error finding finance rule by id: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  async findAll(query: Record<string, any> = {}): Promise<FinanceRule[]> {
    try {
      return await this.financeRuleEntityRepository
        .createQueryBuilder('FinanceRule')
        .leftJoinAndSelect('FinanceRule.created_by', 'created_by')
        .select([
          'FinanceRule.id',
          'FinanceRule.driver_fixed_wage',
          'FinanceRule.customer_care_hourly_wage',
          'FinanceRule.app_service_fee',
          'FinanceRule.restaurant_commission',
          'FinanceRule.created_by_id',
          'FinanceRule.description',
          'FinanceRule.created_at',
          'FinanceRule.updated_at',
          'created_by.id',
          'created_by.user_id',
          'created_by.role',
          'created_by.avatar',
          'created_by.permissions',
          'created_by.last_active',
          'created_by.created_at',
          'created_by.updated_at',
          'created_by.first_name',
          'created_by.last_name',
          'created_by.status'
        ])
        .where(query)
        .orderBy('FinanceRule.created_at', 'DESC')
        .getMany();
    } catch (error) {
      throw error;
    }
  }

  async create(
    createFinanceRuleDto: Partial<FinanceRule>
  ): Promise<FinanceRule> {
    try {
      const financeRule =
        this.financeRuleEntityRepository.create(createFinanceRuleDto);
      return await this.financeRuleEntityRepository.save(financeRule);
    } catch (error) {
      this.logger.error(
        `Error creating finance rule: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  async update(
    id: string,
    updateFinanceRuleDto: Partial<FinanceRule>
  ): Promise<FinanceRule | null> {
    try {
      await this.financeRuleEntityRepository.update(id, {
        ...updateFinanceRuleDto,
        updated_at: Math.floor(Date.now() / 1000)
      });
      return await this.findById(id);
    } catch (error) {
      this.logger.error(
        `Error updating finance rule: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  async remove(id: string): Promise<FinanceRule | null> {
    try {
      const financeRule = await this.findById(id);
      if (financeRule) {
        await this.financeRuleEntityRepository.delete(id);
      }
      return financeRule;
    } catch (error) {
      this.logger.error(
        `Error removing finance rule: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  async findAllPaginated(
    skip: number,
    limit: number
  ): Promise<[FinanceRule[], number]> {
    try {
      return await this.financeRuleEntityRepository.findAndCount({
        skip,
        take: limit,
        order: { created_at: 'DESC' }
      });
    } catch (error) {
      this.logger.error(
        `Error finding paginated finance rules: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }
}
