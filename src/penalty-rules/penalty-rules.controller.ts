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
import { PenaltyRulesService } from './penalty-rules.service';
import { CreatePenaltyRuleDto } from './dto/create-penalty-rule.dto';
import { UpdatePenaltyRuleDto } from './dto/update-penalty-rule.dto';

@Controller('penalty-rules')
export class PenaltyRulesController {
  constructor(private readonly penaltyRulesService: PenaltyRulesService) {}

  @Post()
  create(@Body() createPenaltyRuleDto: CreatePenaltyRuleDto) {
    return this.penaltyRulesService.create(createPenaltyRuleDto);
  }

  @Get()
  findAll() {
    return this.penaltyRulesService.findAll();
  }

  @Get('paginated')
  findAllPaginated(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ) {
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    return this.penaltyRulesService.findAllPaginated(parsedPage, parsedLimit);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.penaltyRulesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePenaltyRuleDto: UpdatePenaltyRuleDto
  ) {
    return this.penaltyRulesService.update(id, updatePenaltyRuleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.penaltyRulesService.remove(id);
  }
}
