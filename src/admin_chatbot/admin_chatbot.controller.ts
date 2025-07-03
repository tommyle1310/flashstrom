import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { AdminChatbotService } from './admin_chatbot.service';
import { CreateChatbotResponseDto } from './dto/create-chatbot_response.dto'; // Assume you'll create this DTO
import { UpdateChatbotResponseDto } from './dto/update-chatbot_response.dto'; // Assume you'll create this DTO
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard'; // For admin protection

@Controller('admin-chatbot')
@UseGuards(JwtAuthGuard) // Protect all routes in this controller
export class AdminChatbotController {
  constructor(private readonly adminChatbotService: AdminChatbotService) {}

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
    return this.adminChatbotService.updateBotResponse(id, updateDto);
  }
}
