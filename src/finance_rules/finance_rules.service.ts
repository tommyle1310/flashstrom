import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinanceRule } from './entities/finance_rule.entity';
import { FinanceRulesRepository } from './finance_rules.repository';
import { CreateFinanceRuleDto } from './dto/create-finance_rule.dto';
import { UpdateFinanceRuleDto } from './dto/update-finance_rule.dto';
import { createResponse, ApiResponse } from 'src/utils/createResponse';
import { AdminRepository } from 'src/admin/admin.repository';
import { TargetUser } from 'src/notifications/entities/notification.entity';
import { IMAGE_LINKS } from 'src/assets/image_urls';
import { SUPER_ADMIN_MOCK } from 'src/utils/constants';
import { NotificationsService } from 'src/notifications/notifications.service';

@Injectable()
export class FinanceRulesService {
  private readonly logger = new Logger(FinanceRulesService.name);

  constructor(
    private readonly financeRulesRepository: FinanceRulesRepository,
    private readonly adminRepository: AdminRepository,
    @InjectRepository(FinanceRule)
    private financeRuleEntityRepository: Repository<FinanceRule>,
    private readonly notificationsService: NotificationsService
  ) {}

  async create(
    createFinanceRuleDto: CreateFinanceRuleDto
  ): Promise<ApiResponse<FinanceRule>> {
    try {
      // Kiểm tra created_by_id (Admin) có tồn tại không
      const admin = await this.adminRepository.findById(
        createFinanceRuleDto.created_by_id
      );
      if (!admin) {
        return createResponse(
          'NotFound',
          null,
          `Admin with ID ${createFinanceRuleDto.created_by_id} not found`
        );
      }

      // Tạo finance rule
      const newFinanceRule =
        await this.financeRulesRepository.create(createFinanceRuleDto);

      const driverNotificationData = {
        avatar: {
          url: IMAGE_LINKS.ORDER_DELIVERED,
          key: 'finance-rule-updated'
        },
        title: 'Updated Driver earning calculation',
        desc: `Updated Driver earning calculation (01/07/2025)`,
        image: null,
        link: ``,
        target_user: [TargetUser.DRIVER],
        created_by_id: SUPER_ADMIN_MOCK.admin_id
      };
      const restaurantNotificationData = {
        avatar: {
          url: IMAGE_LINKS.ORDER_DELIVERED,
          key: 'finance-rule-updated'
        },
        title: 'Updated Restaurant earning calculation',
        desc: `Updated Restaurant earning calculation (01/07/2025)`,
        image: null,
        link: ``,
        target_user: [TargetUser.RESTAURANT],
        created_by_id: SUPER_ADMIN_MOCK.admin_id
      };

      const driverNotificationResponse = await this.notificationsService.create(
        driverNotificationData
      );
      const restaurantNotificationResponse =
        await this.notificationsService.create(restaurantNotificationData);

      if (
        restaurantNotificationResponse.EC === 0 &&
        driverNotificationResponse.EC === 0
      ) {
        console.log('Restaurant notification created successfully');
      } else {
        console.log('Failed to create restaurant notification');
      }
      return createResponse(
        'OK',
        newFinanceRule,
        'Finance rule created successfully'
      );
    } catch (error: any) {
      return this.handleError('Error creating finance rule:', error);
    }
  }

  async findAll(): Promise<ApiResponse<FinanceRule[]>> {
    try {
      const financeRules = await this.financeRulesRepository.findAll();
      return createResponse('OK', financeRules, 'Fetched all finance rules');
    } catch (error: any) {
      return this.handleError('Error fetching finance rules:', error);
    }
  }

  async findOne(id: string): Promise<ApiResponse<FinanceRule>> {
    try {
      const financeRule = await this.financeRulesRepository.findById(id);
      return this.handleFinanceRuleResponse(financeRule);
    } catch (error: any) {
      return this.handleError('Error fetching finance rule:', error);
    }
  }

  async findOneLatest(): Promise<ApiResponse<FinanceRule>> {
    try {
      const latestFinanceRule = await this.financeRuleEntityRepository
        .createQueryBuilder('financeRule')
        .orderBy('financeRule.created_at', 'DESC') // Sắp xếp theo created_at giảm dần để lấy bản ghi mới nhất
        .getOne();

      return this.handleFinanceRuleResponse(latestFinanceRule);
    } catch (error: any) {
      return this.handleError('Error fetching latest finance rule:', error);
    }
  }

  async update(
    id: string,
    updateFinanceRuleDto: UpdateFinanceRuleDto
  ): Promise<ApiResponse<FinanceRule>> {
    try {
      const financeRule = await this.financeRulesRepository.findById(id);
      if (!financeRule) {
        return createResponse('NotFound', null, 'Finance rule not found');
      }

      const updatedFinanceRule = await this.financeRulesRepository.update(
        id,
        updateFinanceRuleDto
      );
      return createResponse(
        'OK',
        updatedFinanceRule,
        'Finance rule updated successfully'
      );
    } catch (error: any) {
      return this.handleError('Error updating finance rule:', error);
    }
  }

  async remove(id: string): Promise<ApiResponse<null>> {
    try {
      const deletedFinanceRule = await this.financeRulesRepository.remove(id);
      if (!deletedFinanceRule) {
        return createResponse('NotFound', null, 'Finance rule not found');
      }
      return createResponse('OK', null, 'Finance rule deleted successfully');
    } catch (error: any) {
      return this.handleError('Error deleting finance rule:', error);
    }
  }

  async findAllPaginated(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      const [items, total] = await this.financeRulesRepository.findAllPaginated(
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
        `Error fetching paginated finance rules: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return createResponse('ServerError', null);
    }
  }

  private handleFinanceRuleResponse(
    financeRule: FinanceRule | null
  ): ApiResponse<FinanceRule> {
    if (!financeRule) {
      return createResponse('NotFound', null, 'Finance rule not found');
    }
    return createResponse(
      'OK',
      financeRule,
      'Finance rule retrieved successfully'
    );
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
