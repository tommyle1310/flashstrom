import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { AdminChatbotService } from './admin_chatbot.service';
import { CreateChatbotResponseDto } from './dto/create-chatbot_response.dto'; // Assume you'll create this DTO
import { UpdateChatbotResponseDto } from './dto/update-chatbot_response.dto'; // Assume you'll create this DTO
import { SearchChatbotResponseDto } from './dto/search-chatbot_response.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard'; // For admin protection
import { createResponse } from 'src/utils/createResponse';

@Controller('admin-chatbot')
@UseGuards(JwtAuthGuard) // Protect all routes in this controller
export class AdminChatbotController {
  constructor(private readonly adminChatbotService: AdminChatbotService) {}

  @Get('responses')
  async searchBotResponses(@Query() searchDto: SearchChatbotResponseDto) {
    const result = await this.adminChatbotService.searchBotResponses(searchDto);
    return createResponse('OK', result, 'Search bot responses successfully');
  }

  @Post('responses')
  @HttpCode(HttpStatus.CREATED)
  async createBotResponse(@Body() createDto: CreateChatbotResponseDto) {
    return this.adminChatbotService.createBotResponse(createDto);
  }

  @Patch('responses/:id')
  async updateBotResponse(
    @Param('id') id: number,
    @Body() updateDto: UpdateChatbotResponseDto
  ) {
    const result = await this.adminChatbotService.updateBotResponse(
      id,
      updateDto
    );
    return createResponse(
      'OK',
      result,
      'Updated chatbot response successfully'
    );
  }
}
