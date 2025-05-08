import {
  Body,
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Query
} from '@nestjs/common';
import { FinanceRulesService } from './finance_rules.service';
import { CreateFinanceRuleDto } from './dto/create-finance_rule.dto';
import { UpdateFinanceRuleDto } from './dto/update-finance_rule.dto';

@Controller('finance-rules')
export class FinanceRulesController {
  constructor(private readonly financeRulesService: FinanceRulesService) {}

  @Post()
  create(@Body() createFinanceRuleDto: CreateFinanceRuleDto) {
    return this.financeRulesService.create(createFinanceRuleDto);
  }

  @Get()
  findAll() {
    return this.financeRulesService.findAll();
  }

  @Get('paginated')
  findAllPaginated(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ) {
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    return this.financeRulesService.findAllPaginated(parsedPage, parsedLimit);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.financeRulesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateFinanceRuleDto: UpdateFinanceRuleDto
  ) {
    return this.financeRulesService.update(id, updateFinanceRuleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.financeRulesService.remove(id);
  }
}
