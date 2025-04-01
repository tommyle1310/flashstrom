import {
  Body,
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param
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
