import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PenaltyRule } from './entities/penalty-rule.entity';
import { PenaltyRulesRepository } from './penalty-rules.repository';
import { CreatePenaltyRuleDto } from './dto/create-penalty-rule.dto';
import { UpdatePenaltyRuleDto } from './dto/update-penalty-rule.dto';
import { createResponse, ApiResponse } from 'src/utils/createResponse';

@Injectable()
export class PenaltyRulesService {
  private readonly logger = new Logger(PenaltyRulesService.name);

  constructor(
    private readonly penaltyRulesRepository: PenaltyRulesRepository,
    @InjectRepository(PenaltyRule)
    private penaltyRuleEntityRepository: Repository<PenaltyRule>
  ) {}

  async create(
    createPenaltyRuleDto: CreatePenaltyRuleDto
  ): Promise<ApiResponse<PenaltyRule>> {
    try {
      const existingRule =
        await this.penaltyRulesRepository.findByViolationType(
          createPenaltyRuleDto.violation_type
        );
      if (existingRule) {
        return createResponse(
          'DuplicatedRecord',
          null,
          'Penalty rule with this violation type already exists'
        );
      }

      const newRule =
        await this.penaltyRulesRepository.create(createPenaltyRuleDto);
      return createResponse('OK', newRule, 'Penalty rule created successfully');
    } catch (error: any) {
      return this.handleError('Error creating penalty rule:', error);
    }
  }

  async findAll(): Promise<ApiResponse<PenaltyRule[]>> {
    try {
      const rules = await this.penaltyRuleEntityRepository.find();
      return createResponse('OK', rules, 'Fetched all penalty rules');
    } catch (error: any) {
      return this.handleError('Error fetching penalty rules:', error);
    }
  }

  async findOne(id: string): Promise<ApiResponse<PenaltyRule>> {
    try {
      const rule = await this.penaltyRulesRepository.findById(id);
      return this.handleRuleResponse(rule);
    } catch (error: any) {
      return this.handleError('Error fetching penalty rule:', error);
    }
  }

  async update(
    id: string,
    updatePenaltyRuleDto: UpdatePenaltyRuleDto
  ): Promise<ApiResponse<PenaltyRule>> {
    try {
      const rule = await this.penaltyRulesRepository.findById(id);
      if (!rule) {
        return createResponse('NotFound', null, 'Penalty rule not found');
      }

      const updatedRule = await this.penaltyRulesRepository.update(
        id,
        updatePenaltyRuleDto
      );
      return createResponse(
        'OK',
        updatedRule,
        'Penalty rule updated successfully'
      );
    } catch (error: any) {
      return this.handleError('Error updating penalty rule:', error);
    }
  }

  async remove(id: string): Promise<ApiResponse<null>> {
    try {
      const deletedRule = await this.penaltyRulesRepository.remove(id);
      if (!deletedRule) {
        return createResponse('NotFound', null, 'Penalty rule not found');
      }
      return createResponse('OK', null, 'Penalty rule deleted successfully');
    } catch (error: any) {
      return this.handleError('Error deleting penalty rule:', error);
    }
  }

  async findAllPaginated(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      const [items, total] = await this.penaltyRulesRepository.findAllPaginated(
        skip,
        limit
      );
      const totalPages = Math.ceil(total / limit);

      return createResponse('OK', {
        totalPages,
        currentPage: page,
        totalItems: total,
        items
      });
    } catch (error) {
      this.logger.error(
        `Error fetching paginated penalty rules: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return createResponse('ServerError', null);
    }
  }

  private handleRuleResponse(
    rule: PenaltyRule | null
  ): ApiResponse<PenaltyRule> {
    if (!rule) {
      return createResponse('NotFound', null, 'Penalty rule not found');
    }
    return createResponse('OK', rule, 'Penalty rule retrieved successfully');
  }

  private handleError(message: string, error: any): ApiResponse<null> {
    console.error(message, error);
    return createResponse(
      'ServerError',
      null,
      'An error occurred while processing your request'
    );
  }
}
