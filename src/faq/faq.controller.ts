import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete
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
