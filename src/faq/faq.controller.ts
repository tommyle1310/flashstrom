import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query
} from '@nestjs/common';
import { FAQsService } from './faq.service';
import { CreateFAQDto } from './dto/create-faq.dto';
import { UpdateFAQDto } from './dto/update-faq.dto';
import { FAQType } from './entities/faq.entity';

@Controller('faqs')
export class FAQsController {
  constructor(private readonly faqsService: FAQsService) {}

  @Post()
  create(@Body() createFAQDto: CreateFAQDto) {
    return this.faqsService.create(createFAQDto);
  }

  @Get()
  findAll() {
    return this.faqsService.findAll();
  }

  @Get('paginated')
  findAllPaginated(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ) {
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    return this.faqsService.findAllPaginated(parsedPage, parsedLimit);
  }

  @Get('active')
  findActive() {
    return this.faqsService.findActive();
  }

  @Get('type/:type')
  findByType(@Param('type') type: FAQType) {
    return this.faqsService.findByType(type);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.faqsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateFAQDto: UpdateFAQDto) {
    return this.faqsService.update(id, updateFAQDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.faqsService.remove(id);
  }
}
