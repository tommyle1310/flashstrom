import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like, FindManyOptions } from 'typeorm';
import { RedisService } from '../redis/redis.service';
import {
  ChatbotResponse,
  ResponseType,
  ActionCode
} from './entities/chatbot_response.entity';
import { ChatbotGuide } from './entities/chatbot_guide.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Customer } from '../customers/entities/customer.entity';
import { CreateChatbotResponseDto } from './dto/create-chatbot_response.dto';
import { UpdateChatbotResponseDto } from './dto/update-chatbot_response.dto';
import { SearchChatbotResponseDto } from './dto/search-chatbot_response.dto';
import { ApiResponse, createResponse } from 'src/utils/createResponse';

export interface AdminBotResponse {
  content: string | any[] | any;
  action_code?: ActionCode;
  type: 'TEXT' | 'OPTIONS' | 'GUIDE' | 'ORDER' | 'INQUIRY' | 'ACTION_RESULT';
}

export interface ChatbotSession {
  admin_id: string;
  last_response_id?: number;
  is_active_skipped?: boolean;
  current_guide_step?: number;
}

export interface ActionHandler {
  action_code: ActionCode;
  handler: (params?: any) => Promise<AdminBotResponse>;
  description: string;
}

@Injectable()
export class AdminChatbotService {
  private readonly logger = new Logger(AdminChatbotService.name);
  private sessions = new Map<string, ChatbotSession>();
  private actionHandlers: Map<ActionCode, ActionHandler> = new Map();

  constructor(
    @InjectRepository(ChatbotResponse)
    private readonly chatbotResponseRepository: Repository<ChatbotResponse>,
    @InjectRepository(ChatbotGuide)
    private readonly chatbotGuideRepository: Repository<ChatbotGuide>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    private readonly redisService: RedisService
  ) {
    this.initializeActionHandlers();
  }

  private initializeActionHandlers(): void {
    // Register action handlers
    this.actionHandlers.set(ActionCode.FIND_ORDER_BY_ID, {
      action_code: ActionCode.FIND_ORDER_BY_ID,
      handler: this.findOrderById.bind(this),
      description: 'Find order by ID'
    });

    this.actionHandlers.set(ActionCode.GET_CUSTOMERS_REGISTERED_TODAY, {
      action_code: ActionCode.GET_CUSTOMERS_REGISTERED_TODAY,
      handler: this.getCustomersRegisteredToday.bind(this),
      description: 'Get customers registered today'
    });

    this.actionHandlers.set(ActionCode.GET_TOTAL_ORDERS_TODAY, {
      action_code: ActionCode.GET_TOTAL_ORDERS_TODAY,
      handler: this.getTotalOrdersToday.bind(this),
      description: 'Get total orders count for today'
    });

    this.actionHandlers.set(ActionCode.GET_GROSS_REVENUE_TODAY, {
      action_code: ActionCode.GET_GROSS_REVENUE_TODAY,
      handler: this.getGrossRevenueToday.bind(this),
      description: 'Get total gross revenue for today'
    });

    this.actionHandlers.set(ActionCode.GET_PENDING_ORDERS, {
      action_code: ActionCode.GET_PENDING_ORDERS,
      handler: this.getPendingOrders.bind(this),
      description: 'Get all pending orders'
    });
  }

  async processAdminInput(
    adminId: string,
    inputText: string
  ): Promise<AdminBotResponse> {
    const session = this.getOrCreateSession(adminId);
    const timestamp = new Date().toISOString();
    let response: AdminBotResponse;
    let success = true;
    let responseId: number | null = null;

    try {
      // Check if we should skip bot response due to previous is_active = false
      if (session.is_active_skipped) {
        session.is_active_skipped = false;

        // Check if this looks like an order ID
        if (inputText.trim().toUpperCase().startsWith('FF_ORDER_')) {
          response = await this.handleOrderLookup(inputText.trim());
          await this.logToRedis(adminId, inputText, null, timestamp, false);
          return response;
        }

        // If not an order ID, fall back to normal processing
      }

      // Try to find matching response
      const chatbotResponse = await this.findMatchingResponse(inputText);

      if (chatbotResponse) {
        responseId = chatbotResponse.id;
        response = await this.buildResponse(chatbotResponse, session);

        // Set flag if this response has is_active = false
        if (!chatbotResponse.is_active) {
          session.is_active_skipped = true;
        }
      } else {
        // No match found, use fallback
        response = this.getFallbackResponse();
        success = false;
      }

      // Log to Redis
      await this.logToRedis(adminId, inputText, responseId, timestamp, success);
    } catch (error) {
      this.logger.error('Error processing admin input:', error);
      response = this.getFallbackResponse();
      await this.logToRedis(adminId, inputText, null, timestamp, false);
    }

    return response;
  }

  private getOrCreateSession(adminId: string): ChatbotSession {
    if (!this.sessions.has(adminId)) {
      this.sessions.set(adminId, { admin_id: adminId });
    }
    return this.sessions.get(adminId)!;
  }

  private async findMatchingResponse(
    inputText: string
  ): Promise<ChatbotResponse | null> {
    const normalizedInput = inputText.toLowerCase().trim();

    // Try exact keyword match first
    let response = await this.chatbotResponseRepository.findOne({
      where: { keyword: normalizedInput }
    });

    if (!response) {
      // Try partial match
      const responses = await this.chatbotResponseRepository.find();
      response =
        responses.find(
          r =>
            normalizedInput.includes(r.keyword.toLowerCase()) ||
            r.keyword.toLowerCase().includes(normalizedInput)
        ) || null;
    }

    return response;
  }

  private async buildResponse(
    chatbotResponse: ChatbotResponse,
    session: ChatbotSession
  ): Promise<AdminBotResponse> {
    switch (chatbotResponse.response_type) {
      case ResponseType.TEXT:
        return {
          content: chatbotResponse.response_text,
          type: 'TEXT'
        };

      case ResponseType.OPTIONS:
        return {
          content: chatbotResponse.options || [],
          type: 'OPTIONS'
        };

      case ResponseType.GUIDE:
        return await this.buildGuideResponse(chatbotResponse, session);

      case ResponseType.ACTION:
        return await this.executeAction(chatbotResponse);

      default:
        return this.getFallbackResponse();
    }
  }

  private async executeAction(
    chatbotResponse: ChatbotResponse
  ): Promise<AdminBotResponse> {
    try {
      if (!chatbotResponse.action_code) {
        return {
          content: 'Action code not specified for this response.',
          type: 'TEXT'
        };
      }

      const actionHandler = this.actionHandlers.get(
        chatbotResponse.action_code
      );
      if (!actionHandler) {
        return {
          content: `Unknown action code: ${chatbotResponse.action_code}`,
          type: 'TEXT'
        };
      }

      // Execute the action handler
      const result = await actionHandler.handler();
      return result;
    } catch (error) {
      this.logger.error(
        `Error executing action ${chatbotResponse.action_code}:`,
        error
      );
      return {
        content: 'Error executing the requested action.',
        type: 'TEXT'
      };
    }
  }

  // Action handler functions
  private async findOrderById(orderId?: string): Promise<AdminBotResponse> {
    try {
      // This would typically get the order ID from the conversation context
      // For now, we'll return the last 5 orders as an example
      const orders = await this.orderRepository.find({
        take: 5,
        order: { created_at: 'DESC' },
        relations: ['customer', 'restaurant']
      });

      return {
        content: {
          message: 'Recent orders:',
          orders: orders.map(order => ({
            id: order.id,
            status: order.status,
            total: order.total_amount,
            customer:
              order.customer?.first_name + ' ' + order.customer?.last_name,
            restaurant: order.restaurant?.restaurant_name
          }))
        },
        action_code: ActionCode.FIND_ORDER_BY_ID,
        type: 'ACTION_RESULT'
      };
    } catch (error) {
      this.logger.error('Error finding orders:', error);
      return {
        content: 'Error retrieving orders.',
        type: 'TEXT'
      };
    }
  }

  private async getCustomersRegisteredToday(): Promise<AdminBotResponse> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayTimestamp = Math.floor(today.getTime() / 1000);
      const tomorrowTimestamp = Math.floor(tomorrow.getTime() / 1000);

      const customers = await this.customerRepository.find({
        where: {
          created_at: Between(todayTimestamp, tomorrowTimestamp)
        }
      });

      return {
        content: {
          message: `Customers registered today: ${customers.length}`,
          customers: customers.map(customer => ({
            id: customer.id,
            name: `${customer.first_name} ${customer.last_name}`,
            phone: customer.phone || 'N/A'
          }))
        },
        action_code: ActionCode.GET_CUSTOMERS_REGISTERED_TODAY,
        type: 'ACTION_RESULT'
      };
    } catch (error) {
      this.logger.error('Error getting customers registered today:', error);
      return {
        content: 'Error retrieving customer registration data.',
        type: 'TEXT'
      };
    }
  }

  private async getTotalOrdersToday(): Promise<AdminBotResponse> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayTimestamp = Math.floor(today.getTime() / 1000);
      const tomorrowTimestamp = Math.floor(tomorrow.getTime() / 1000);

      const orderCount = await this.orderRepository.count({
        where: {
          created_at: Between(todayTimestamp, tomorrowTimestamp)
        }
      });

      return {
        content: {
          message: `Total orders today: ${orderCount}`,
          count: orderCount,
          date: today.toDateString()
        },
        action_code: ActionCode.GET_TOTAL_ORDERS_TODAY,
        type: 'ACTION_RESULT'
      };
    } catch (error) {
      this.logger.error('Error getting total orders today:', error);
      return {
        content: 'Error retrieving order count.',
        type: 'TEXT'
      };
    }
  }

  private async getGrossRevenueToday(): Promise<AdminBotResponse> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayTimestamp = Math.floor(today.getTime() / 1000);
      const tomorrowTimestamp = Math.floor(tomorrow.getTime() / 1000);

      const orders = await this.orderRepository.find({
        where: {
          created_at: Between(todayTimestamp, tomorrowTimestamp),
          status: OrderStatus.DELIVERED
        }
      });

      const totalRevenue = orders.reduce(
        (sum, order) => sum + (+order.total_amount || 0),
        0
      );

      return {
        content: {
          message: `Total revenue today: $${
            typeof totalRevenue === 'number'
              ? totalRevenue.toFixed(2)
              : totalRevenue
                ? totalRevenue
                : 0
          }`,
          revenue: totalRevenue,
          orderCount: orders.length,
          date: today.toDateString()
        },
        action_code: ActionCode.GET_GROSS_REVENUE_TODAY,
        type: 'ACTION_RESULT'
      };
    } catch (error) {
      this.logger.error('Error getting revenue today:', error);
      return {
        content: 'Error retrieving revenue data.',
        type: 'TEXT'
      };
    }
  }

  private async getPendingOrders(): Promise<AdminBotResponse> {
    try {
      const pendingOrders = await this.orderRepository.find({
        where: [
          { status: OrderStatus.PENDING },
          { status: OrderStatus.RESTAURANT_ACCEPTED },
          { status: OrderStatus.PREPARING },
          { status: OrderStatus.READY_FOR_PICKUP },
          { status: OrderStatus.OUT_FOR_DELIVERY }
        ],
        relations: ['customer', 'restaurant', 'driver'],
        order: { created_at: 'DESC' }
      });

      return {
        content: {
          message: `Pending orders: ${pendingOrders.length}`,
          orders: pendingOrders.map(order => ({
            id: order.id,
            status: order.status,
            total: order.total_amount,
            customer:
              order.customer?.first_name + ' ' + order.customer?.last_name,
            restaurant: order.restaurant?.restaurant_name,
            driver: order.driver
              ? `${order.driver.first_name} ${order.driver.last_name}`
              : 'Not assigned'
          }))
        },
        action_code: ActionCode.GET_PENDING_ORDERS,
        type: 'ACTION_RESULT'
      };
    } catch (error) {
      this.logger.error('Error getting pending orders:', error);
      return {
        content: 'Error retrieving pending orders.',
        type: 'TEXT'
      };
    }
  }

  public async getHelp(): Promise<AdminBotResponse> {
    const helpResponse = await this.chatbotResponseRepository.findOne({
      where: {
        response_type: ResponseType.OPTIONS,
        keyword: 'help'
      }
    });
    if (!helpResponse) {
      return this.getFallbackResponse();
    }
    return {
      content: helpResponse?.options,
      type: 'OPTIONS'
    };
  }

  private async buildGuideResponse(
    chatbotResponse: ChatbotResponse,
    session: ChatbotSession
  ): Promise<AdminBotResponse> {
    // Get the first step or current step
    const stepNumber = session.current_guide_step || 1;

    const guide = await this.chatbotGuideRepository.findOne({
      where: {
        response_id: chatbotResponse.id,
        step_number: stepNumber
      }
    });

    if (guide) {
      // Update session to track current step
      session.current_guide_step = stepNumber;
      session.last_response_id = chatbotResponse.id;

      return {
        content: guide.step_text,
        type: 'GUIDE'
      };
    }

    return this.getFallbackResponse();
  }

  private async handleOrderLookup(orderId: string): Promise<AdminBotResponse> {
    try {
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
        relations: ['customer', 'restaurant', 'driver']
      });

      if (order) {
        return {
          content: {
            id: order.id,
            status: order.status,
            details: `Order total: ${order.total_amount}, Customer: ${order.customer?.first_name || 'N/A'} ${order.customer?.last_name || ''}, Restaurant: ${order.restaurant?.restaurant_name || 'N/A'}`
          },
          type: 'ORDER'
        };
      } else {
        return {
          content: `Order ${orderId} not found.`,
          type: 'TEXT'
        };
      }
    } catch (error) {
      this.logger.error('Error looking up order:', error);
      return {
        content: 'Error retrieving order information.',
        type: 'TEXT'
      };
    }
  }

  private getFallbackResponse(): AdminBotResponse {
    return {
      content: "I don't know, please try again...",
      type: 'TEXT'
    };
  }

  private async logToRedis(
    adminId: string,
    inputText: string,
    responseId: number | null,
    timestamp: string,
    success: boolean
  ): Promise<void> {
    try {
      const logKey = `log:${timestamp}:${adminId}`;
      const logData = {
        admin_id: parseInt(adminId),
        input_text: inputText,
        response_id: responseId,
        timestamp: timestamp,
        success: success
      };

      await this.redisService.set(
        logKey,
        JSON.stringify(logData),
        86400 * 1000
      ); // 24 hours TTL
    } catch (error) {
      this.logger.error('Error logging to Redis:', error);
    }
  }

  // Method to handle "done" or session reset
  async resetSession(adminId: string): Promise<void> {
    const session = this.sessions.get(adminId);
    if (session) {
      session.current_guide_step = undefined;
      session.last_response_id = undefined;
      session.is_active_skipped = false;
    }
  }

  // Method to advance guide step
  async nextGuideStep(adminId: string): Promise<AdminBotResponse | null> {
    const session = this.sessions.get(adminId);
    if (!session || !session.last_response_id || !session.current_guide_step) {
      return null;
    }

    const nextStep = session.current_guide_step + 1;
    const guide = await this.chatbotGuideRepository.findOne({
      where: {
        response_id: session.last_response_id,
        step_number: nextStep
      }
    });

    if (guide) {
      session.current_guide_step = nextStep;
      return {
        content: guide.step_text,
        type: 'GUIDE'
      };
    }

    // No more steps, reset guide session
    session.current_guide_step = undefined;
    session.last_response_id = undefined;
    return {
      content: 'Guide completed. How else can I help you?',
      type: 'TEXT'
    };
  }

  async createBotResponse(
    createDto: CreateChatbotResponseDto
  ): Promise<ApiResponse<ChatbotResponse>> {
    const response = this.chatbotResponseRepository.create(createDto);
    await this.chatbotResponseRepository.save(response);
    return createResponse(
      'OK',
      response,
      'Created new chatbot response succesfully'
    );
  }

  async updateBotResponse(
    id: number,
    updateDto: UpdateChatbotResponseDto
  ): Promise<ChatbotResponse> {
    await this.chatbotResponseRepository.update(id, updateDto);
    return this.chatbotResponseRepository.findOne({ where: { id } });
  }

  async searchBotResponses(searchDto: SearchChatbotResponseDto): Promise<{
    data: ChatbotResponse[];
    total: number;
    message: string;
  }> {
    try {
      // If getall is true, return all responses
      if (searchDto.getall) {
        const [responses, total] =
          await this.chatbotResponseRepository.findAndCount({
            order: { created_at: 'DESC' }
          });

        return {
          data: responses,
          total,
          message: `Retrieved all ${total} chatbot responses`
        };
      }

      // Build search conditions
      const findOptions: FindManyOptions<ChatbotResponse> = {
        where: {},
        order: { created_at: 'DESC' }
      };

      // Add specific field filters
      if (searchDto.keyword) {
        findOptions.where['keyword'] = Like(`%${searchDto.keyword}%`);
      }

      if (searchDto.response_type) {
        findOptions.where['response_type'] = searchDto.response_type;
      }

      if (searchDto.action_code) {
        findOptions.where['action_code'] = searchDto.action_code;
      }

      if (searchDto.is_active !== undefined) {
        findOptions.where['is_active'] = searchDto.is_active;
      }

      // Handle general search term (search in keyword or response_text)
      if (searchDto.search) {
        const searchTerm = `%${searchDto.search}%`;
        const queryBuilder =
          this.chatbotResponseRepository.createQueryBuilder('response');

        queryBuilder.where(
          '(response.keyword ILIKE :searchTerm OR response.response_text ILIKE :searchTerm)',
          { searchTerm }
        );

        // Add other filters to query builder if they exist
        if (searchDto.response_type) {
          queryBuilder.andWhere('response.response_type = :responseType', {
            responseType: searchDto.response_type
          });
        }

        if (searchDto.action_code) {
          queryBuilder.andWhere('response.action_code = :actionCode', {
            actionCode: searchDto.action_code
          });
        }

        if (searchDto.is_active !== undefined) {
          queryBuilder.andWhere('response.is_active = :isActive', {
            isActive: searchDto.is_active
          });
        }

        queryBuilder.orderBy('response.created_at', 'DESC');

        const [responses, total] = await queryBuilder.getManyAndCount();

        return {
          data: responses,
          total,
          message:
            total > 0
              ? `Found ${total} responses matching "${searchDto.search}"`
              : `No responses found matching "${searchDto.search}"`
        };
      }

      // If no search term but have other filters
      if (Object.keys(findOptions.where).length > 0) {
        const [responses, total] =
          await this.chatbotResponseRepository.findAndCount(findOptions);

        return {
          data: responses,
          total,
          message:
            total > 0
              ? `Found ${total} responses matching the specified filters`
              : 'No responses found matching the specified filters'
        };
      }

      // If no filters provided, return empty result with message
      return {
        data: [],
        total: 0,
        message:
          'Please provide search parameters or use getall=true to retrieve all responses'
      };
    } catch (error) {
      this.logger.error('Error searching chatbot responses:', error);
      throw new Error('Failed to search chatbot responses');
    }
  }
}
