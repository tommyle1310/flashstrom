import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ChatbotResponse,
  ResponseType
} from './entities/chatbot_response.entity';
import { ChatbotGuide } from './entities/chatbot_guide.entity';
import {
  FAQ,
  FAQStatus,
  FAQType,
  FAQTargetUser
} from '../faq/entities/faq.entity';
import { FinanceRule } from '../finance_rules/entities/finance_rule.entity';

@Injectable()
export class DataSeedingService {
  private readonly logger = new Logger(DataSeedingService.name);

  constructor(
    @InjectRepository(ChatbotResponse)
    private readonly chatbotResponseRepository: Repository<ChatbotResponse>,
    @InjectRepository(ChatbotGuide)
    private readonly chatbotGuideRepository: Repository<ChatbotGuide>,
    @InjectRepository(FAQ)
    private readonly faqRepository: Repository<FAQ>,
    @InjectRepository(FinanceRule)
    private readonly financeRuleRepository: Repository<FinanceRule>
  ) {}

  async seedAllData(): Promise<void> {
    this.logger.log('Starting data seeding...');

    try {
      await this.seedChatbotResponses();
      await this.seedChatbotGuides();
      await this.seedFAQs();
      await this.seedFinanceRules();

      this.logger.log('Data seeding completed successfully');
    } catch (error) {
      this.logger.error('Error during data seeding:', error);
      throw error;
    }
  }

  private async seedChatbotResponses(): Promise<void> {
    const count = await this.chatbotResponseRepository.count();
    if (count >= 11) {
      this.logger.log(
        `ChatbotResponses already has ${count} rows, skipping seeding`
      );
      return;
    }

    this.logger.log('Seeding chatbot_responses...');

    const responses = [
      // TEXT responses
      {
        keyword: 'check order',
        response_type: ResponseType.TEXT,
        response_text: 'Enter order ID.',
        options: null,
        parent_id: null,
        is_active: false // This will trigger server-driven response for next input
      },
      {
        keyword: 'list unresolved inquiries',
        response_type: ResponseType.TEXT,
        response_text: 'List of unresolved inquiries:',
        options: null,
        parent_id: null,
        is_active: false // This will trigger server-driven response for next input
      },
      {
        keyword: 'hello',
        response_type: ResponseType.TEXT,
        response_text: 'Hello Admin! How can I assist you today?',
        options: null,
        parent_id: null,
        is_active: true
      },
      // GUIDE responses
      {
        keyword: 'resolve complaint',
        response_type: ResponseType.GUIDE,
        response_text:
          'I will guide you through resolving a customer complaint.',
        options: null,
        parent_id: null,
        is_active: true
      },
      {
        keyword: 'contact restaurant',
        response_type: ResponseType.GUIDE,
        response_text: 'Let me guide you through contacting a restaurant.',
        options: null,
        parent_id: null,
        is_active: true
      },
      // OPTIONS responses
      {
        keyword: 'help',
        response_type: ResponseType.OPTIONS,
        response_text: 'Please select an option:',
        options: [
          { id: 1, text: 'Check Order Status', next_id: 1 },
          { id: 2, text: 'Resolve Complaint', next_id: 3 },
          { id: 3, text: 'Contact Restaurant', next_id: 4 },
          { id: 4, text: 'View Reports', next_id: null },
          { id: 5, text: 'Admin Settings', next_id: 6 },
          { id: 6, text: 'View Promotion', next_id: 7 },
          { id: 7, text: 'View Inquiry', next_id: 8 },
          { id: 8, text: 'View Flashfood Analytics', next_id: null }
        ],
        parent_id: null,
        is_active: true
      },
      {
        keyword: 'view flashfood analytics',
        response_type: ResponseType.OPTIONS,
        response_text: 'Please select an option:',
        options: [
          { id: 1, text: 'Order Analytics', next_id: 1 },
          { id: 2, text: 'User Analytics', next_id: 3 },
          { id: 3, text: 'Balance Activity Analytics', next_id: 4 },
          { id: 4, text: 'List Unresolved Inquiries', next_id: 5 }
        ],
        parent_id: null,
        is_active: true
      },
      {
        keyword: 'order analytics',
        response_type: ResponseType.OPTIONS,
        response_text: 'Please select an option:',
        options: [
          { id: 1, text: 'Total Orders today', next_id: 1 },
          { id: 2, text: 'Total Orders this month', next_id: 2 },
          { id: 3, text: 'Total Delivered Orders today', next_id: 3 },
          { id: 4, text: 'Total Cancelled Orders today', next_id: 4 }
        ],
        parent_id: null,
        is_active: true
      },
      {
        keyword: 'user analytics',
        response_type: ResponseType.OPTIONS,
        response_text: 'Please select an option:',
        options: [
          { id: 1, text: 'Total customer registered today', next_id: 1 },
          { id: 2, text: 'Total customer registered today', next_id: 2 },
          { id: 3, text: 'Total driver registered today', next_id: 3 }
        ],
        parent_id: null,
        is_active: false
      },
      {
        keyword: 'balance activity analytics',
        response_type: ResponseType.OPTIONS,
        response_text: 'Please select an option:',
        options: [
          { id: 1, text: "Total Flashfood's balance", next_id: 1 },
          { id: 2, text: 'Total earning from promotions sold', next_id: 2 },
          { id: 3, text: 'Total gross icome', next_id: 3 },
          { id: 4, text: 'Total net icome', next_id: 4 },
          { id: 5, text: 'Total driver commission', next_id: 5 },
          { id: 6, text: 'Total restaurant commission', next_id: 6 }
        ],
        parent_id: null,
        is_active: true
      },
      {
        keyword: 'admin settings',
        response_type: ResponseType.OPTIONS,
        response_text: 'Admin Settings Menu:',
        options: [
          { id: 1, text: 'User Management', next_id: null },
          { id: 2, text: 'System Settings', next_id: null },
          { id: 3, text: 'Reports', next_id: null },
          { id: 4, text: 'Back to Main Menu', next_id: 5 }
        ],
        parent_id: 5,
        is_active: true
      }
    ];

    for (const responseData of responses) {
      const existingResponse = await this.chatbotResponseRepository.findOne({
        where: { keyword: responseData.keyword }
      });

      if (!existingResponse) {
        const response = this.chatbotResponseRepository.create(responseData);
        await this.chatbotResponseRepository.save(response);
        this.logger.log(`Created chatbot response: ${responseData.keyword}`);
      }
    }
  }

  private async seedChatbotGuides(): Promise<void> {
    const count = await this.chatbotGuideRepository.count();
    if (count >= 6) {
      this.logger.log(
        `ChatbotGuides already has ${count} rows, skipping seeding`
      );
      return;
    }

    this.logger.log('Seeding chatbot_guides...');

    // Get the GUIDE responses to link to
    const resolveComplaintResponse =
      await this.chatbotResponseRepository.findOne({
        where: { keyword: 'resolve complaint' }
      });

    const contactRestaurantResponse =
      await this.chatbotResponseRepository.findOne({
        where: { keyword: 'contact restaurant' }
      });

    if (!resolveComplaintResponse || !contactRestaurantResponse) {
      this.logger.warn('GUIDE responses not found, skipping guide seeding');
      return;
    }

    const guides = [
      // Resolve Complaint Guide (3 steps)
      {
        response_id: resolveComplaintResponse.id,
        step_number: 1,
        step_text:
          'Step 1: Ask the customer for their order ID and detailed description of the complaint.',
        next_step_id: null
      },
      {
        response_id: resolveComplaintResponse.id,
        step_number: 2,
        step_text:
          'Step 2: Check the order details in the system and verify the complaint against order history.',
        next_step_id: null
      },
      {
        response_id: resolveComplaintResponse.id,
        step_number: 3,
        step_text:
          'Step 3: Offer appropriate resolution (refund, reorder, store credit) and document the resolution in the system.',
        next_step_id: null
      },
      // Contact Restaurant Guide (3 steps)
      {
        response_id: contactRestaurantResponse.id,
        step_number: 1,
        step_text:
          'Step 1: Locate the restaurant in the system using name or ID.',
        next_step_id: null
      },
      {
        response_id: contactRestaurantResponse.id,
        step_number: 2,
        step_text:
          'Step 2: Use the contact information (phone/email) from the restaurant profile.',
        next_step_id: null
      },
      {
        response_id: contactRestaurantResponse.id,
        step_number: 3,
        step_text:
          'Step 3: Document the communication in the restaurant notes section for future reference.',
        next_step_id: null
      }
    ];

    for (const guideData of guides) {
      const existingGuide = await this.chatbotGuideRepository.findOne({
        where: {
          response_id: guideData.response_id,
          step_number: guideData.step_number
        }
      });

      if (!existingGuide) {
        const guide = this.chatbotGuideRepository.create(guideData);
        await this.chatbotGuideRepository.save(guide);
        this.logger.log(
          `Created guide step: Response ${guideData.response_id}, Step ${guideData.step_number}`
        );
      }
    }
  }

  private async seedFAQs(): Promise<void> {
    const count = await this.faqRepository.count();
    if (count >= 6) {
      this.logger.log(`FAQs already has ${count} rows, skipping seeding`);
      return;
    }

    this.logger.log('Seeding FAQs...');

    const faqs: {
      question: string;
      answer: { type: 'text' | 'image' | 'image_row'; value: string }[];
      type: FAQType;
      status: FAQStatus;
      target_user: FAQTargetUser[];
    }[] = [
      {
        question: 'How do I check order status?',
        answer: [
          {
            type: 'text' as const,
            value:
              'To check order status, navigate to Orders > Search Orders and enter the order ID.'
          },
          {
            type: 'text' as const,
            value:
              'You can also use the admin chatbot by typing "check order" and then entering the order ID when prompted.'
          }
        ],
        type: FAQType.GENERAL,
        status: FAQStatus.ACTIVE,
        target_user: [FAQTargetUser.CUSTOMER_CARE]
      },
      {
        question: 'How do I process a refund?',
        answer: [
          { type: 'text' as const, value: 'To process a refund:' },
          { type: 'text' as const, value: '1. Go to Orders > Find the order' },
          { type: 'text' as const, value: '2. Click "Process Refund"' },
          {
            type: 'text' as const,
            value: '3. Select refund type (full/partial)'
          },
          { type: 'text' as const, value: '4. Add reason and confirm' }
        ],
        type: FAQType.PAYMENT,
        status: FAQStatus.ACTIVE,
        target_user: [FAQTargetUser.CUSTOMER_CARE]
      },
      {
        question: 'How do I contact a restaurant?',
        answer: [
          { type: 'text' as const, value: 'To contact a restaurant:' },
          {
            type: 'text' as const,
            value: '1. Go to Restaurants > Restaurant List'
          },
          { type: 'text' as const, value: '2. Search for the restaurant' },
          { type: 'text' as const, value: '3. Click on restaurant name' },
          {
            type: 'text' as const,
            value: '4. Contact details are in the profile section'
          }
        ],
        type: FAQType.SERVICE,
        status: FAQStatus.ACTIVE,
        target_user: [FAQTargetUser.CUSTOMER_CARE]
      },
      {
        question: 'How do I handle driver complaints?',
        answer: [
          { type: 'text' as const, value: 'For driver complaints:' },
          { type: 'text' as const, value: '1. Document the complaint details' },
          {
            type: 'text' as const,
            value: '2. Check driver history and ratings'
          },
          { type: 'text' as const, value: '3. Investigate with delivery logs' },
          {
            type: 'text' as const,
            value: '4. Take appropriate action (warning, training, suspension)'
          }
        ],
        type: FAQType.SERVICE,
        status: FAQStatus.ACTIVE,
        target_user: [FAQTargetUser.CUSTOMER_CARE]
      },
      {
        question: 'How do I update finance rules?',
        answer: [
          { type: 'text' as const, value: 'To update finance rules:' },
          { type: 'text' as const, value: '1. Go to Admin > Finance Rules' },
          {
            type: 'text' as const,
            value: '2. Click "Create New Rule" or edit existing'
          },
          {
            type: 'text' as const,
            value: '3. Update commission rates, wages, and fees'
          },
          { type: 'text' as const, value: '4. Save and activate the new rule' }
        ],
        type: FAQType.ACCOUNT,
        status: FAQStatus.ACTIVE,
        target_user: [FAQTargetUser.CUSTOMER_CARE]
      },
      {
        question: 'How do I view analytics and reports?',
        answer: [
          { type: 'text' as const, value: 'To access reports:' },
          {
            type: 'text' as const,
            value: '1. Navigate to Dashboard > Analytics'
          },
          {
            type: 'text' as const,
            value: '2. Select report type (Orders, Revenue, Users)'
          },
          { type: 'text' as const, value: '3. Set date range and filters' },
          { type: 'text' as const, value: '4. Export data if needed' }
        ],
        type: FAQType.GENERAL,
        status: FAQStatus.ACTIVE,
        target_user: [FAQTargetUser.CUSTOMER_CARE]
      }
    ];

    for (const faqData of faqs) {
      const existingFAQ = await this.faqRepository.findOne({
        where: { question: faqData.question }
      });

      if (!existingFAQ) {
        const faq = this.faqRepository.create(faqData as any);
        await this.faqRepository.save(faq);
        this.logger.log(`Created FAQ: ${faqData.question}`);
      }
    }
  }

  private async seedFinanceRules(): Promise<void> {
    const count = await this.financeRuleRepository.count();
    if (count >= 1) {
      this.logger.log(
        `FinanceRules already has ${count} rows, skipping seeding`
      );
      return;
    }

    this.logger.log('Seeding finance_rules...');

    const financeRule = {
      driver_fixed_wage: {
        '0-1km': 2.5,
        '1-2km': 3.0,
        '2-3km': 3.5,
        '4-5km': 4.0,
        '>5km': '4.00 + 0.50 per additional km'
      },
      customer_care_hourly_wage: 15.0,
      app_service_fee: 0.15, // 15%
      restaurant_commission: 0.2, // 20%
      created_by_id: null,
      description: 'Default finance rule for FlashFood delivery platform'
    };

    const existingRule = await this.financeRuleRepository.findOne({
      where: { description: financeRule.description }
    });

    if (!existingRule) {
      const rule = this.financeRuleRepository.create(financeRule);
      await this.financeRuleRepository.save(rule);
      this.logger.log('Created default finance rule');
    }
  }

  async checkDataSufficiency(): Promise<boolean> {
    try {
      const chatbotResponseCount = await this.chatbotResponseRepository.count();
      const chatbotGuideCount = await this.chatbotGuideRepository.count();
      const faqCount = await this.faqRepository.count();
      const financeRuleCount = await this.financeRuleRepository.count();

      const sufficient =
        chatbotResponseCount >= 11 &&
        chatbotGuideCount >= 6 &&
        faqCount >= 6 &&
        financeRuleCount >= 1;

      this.logger.log(`Data sufficiency check:
        - ChatbotResponses: ${chatbotResponseCount}/6
        - ChatbotGuides: ${chatbotGuideCount}/6
        - FAQs: ${faqCount}/6
        - FinanceRules: ${financeRuleCount}/1
        - Sufficient: ${sufficient}`);

      return sufficient;
    } catch (error) {
      this.logger.error('Error checking data sufficiency:', error);
      return false;
    }
  }
}
