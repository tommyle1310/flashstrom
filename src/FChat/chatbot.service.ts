import { Injectable } from '@nestjs/common';
import { Enum_UserType } from 'src/types/Payload';

export interface ConversationContext {
  userId: string;
  userType: Enum_UserType;
  currentFlow?: string;
  currentStep?: string;
  collectedData?: Record<string, any>;
  lastIntent?: string;
  sessionStartTime: Date;
  previousMessages: string[];
  preferredLanguage?: string;
  escalationCount: number;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export interface ChatbotResponse {
  message: string;
  type:
    | 'text'
    | 'options'
    | 'transfer'
    | 'quick_reply'
    | 'carousel'
    | 'form'
    | 'confirmation';
  options?: Array<{
    text: string;
    value: string;
    action?: string;
  }>;
  quickReplies?: string[];
  cards?: Array<{
    title: string;
    subtitle?: string;
    imageUrl?: string;
    buttons?: Array<{ text: string; value: string }>;
  }>;
  formFields?: Array<{
    name: string;
    type: 'text' | 'email' | 'phone' | 'select';
    label: string;
    required: boolean;
    options?: string[];
  }>;
  confidence?: number;
  suggestedActions?: string[];
  followUpPrompt?: string;
  requiresHuman?: boolean;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface Intent {
  name: string;
  patterns: string[];
  responses: string[];
  context?: string[];
  userTypes?: Enum_UserType[];
  followUp?: string[];
  requiresData?: string[];
  escalationTrigger?: boolean;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

@Injectable()
export class ChatbotService {
  private contexts = new Map<string, ConversationContext>();
  private intents: Intent[] = [];
  private conversationFlows: Map<string, any> = new Map();
  private userTypeHandlers: Map<Enum_UserType, any> = new Map();

  constructor() {
    this.initializeIntents();
    this.initializeConversationFlows();
    this.initializeUserTypeHandlers();
  }

  private initializeIntents() {
    this.intents = [
      // Greeting Intents
      {
        name: 'greeting',
        patterns: [
          'hi',
          'hello',
          'hey',
          'good morning',
          'good afternoon',
          'good evening',
          'start',
          'begin'
        ],
        responses: [
          'Hello! Welcome to FlashFood! 👋',
          'Hi there! How can I help you today?',
          "Welcome! I'm here to assist you."
        ],
        followUp: ['main_menu']
      },

      // Order Related Intents
      {
        name: 'order_status',
        patterns: [
          'order status',
          'where is my order',
          'track order',
          'order tracking',
          'delivery status',
          'how long',
          'eta'
        ],
        responses: ['Let me help you track your order.'],
        requiresData: ['order_id'],
        userTypes: [Enum_UserType.CUSTOMER]
      },

      {
        name: 'order_issue',
        patterns: [
          'wrong order',
          'missing items',
          'cold food',
          'order problem',
          'incorrect order',
          'refund'
        ],
        responses: [
          "I'm sorry to hear about the issue with your order. Let me help resolve this."
        ],
        context: ['order_resolution'],
        userTypes: [Enum_UserType.CUSTOMER],
        escalationTrigger: true
      },

      {
        name: 'payment_issue',
        patterns: [
          'payment failed',
          'card declined',
          'refund',
          'billing issue',
          'charge',
          'money back'
        ],
        responses: [
          'I understand your payment concern. Let me assist you with this.'
        ],
        context: ['payment_resolution'],
        escalationTrigger: true
      },

      // Driver Specific Intents
      {
        name: 'driver_navigation',
        patterns: [
          'route',
          'directions',
          'gps',
          'navigation',
          'address',
          'location',
          'way'
        ],
        responses: ['I can help you with navigation and route optimization.'],
        userTypes: [Enum_UserType.DRIVER],
        context: ['driver_support']
      },

      {
        name: 'driver_payment',
        patterns: [
          'earnings',
          'payment',
          'salary',
          'commission',
          'payout',
          'withdrawal'
        ],
        responses: [
          'Let me help you with your earnings and payment information.'
        ],
        userTypes: [Enum_UserType.DRIVER],
        context: ['driver_payment']
      },

      {
        name: 'driver_vehicle',
        patterns: [
          'vehicle',
          'car',
          'bike',
          'motorcycle',
          'breakdown',
          'maintenance',
          'fuel'
        ],
        responses: ['I can assist you with vehicle-related concerns.'],
        userTypes: [Enum_UserType.DRIVER],
        context: ['driver_vehicle']
      },

      // Restaurant Specific Intents
      {
        name: 'restaurant_orders',
        patterns: [
          'new orders',
          'pending orders',
          'order management',
          'kitchen',
          'preparation time'
        ],
        responses: [
          'I can help you manage your restaurant orders efficiently.'
        ],
        userTypes: [Enum_UserType.RESTAURANT_OWNER],
        context: ['restaurant_orders']
      },

      {
        name: 'restaurant_menu',
        patterns: [
          'menu',
          'items',
          'dishes',
          'pricing',
          'availability',
          'out of stock',
          'add item'
        ],
        responses: ['Let me assist you with menu management.'],
        userTypes: [Enum_UserType.RESTAURANT_OWNER],
        context: ['restaurant_menu']
      },

      {
        name: 'restaurant_analytics',
        patterns: [
          'sales',
          'revenue',
          'analytics',
          'reports',
          'performance',
          'statistics'
        ],
        responses: [
          "I can help you understand your restaurant's performance metrics."
        ],
        userTypes: [Enum_UserType.RESTAURANT_OWNER],
        context: ['restaurant_analytics']
      },

      // General Support Intents
      {
        name: 'account_issue',
        patterns: [
          'account',
          'profile',
          'login',
          'password',
          'forgot password',
          'account blocked',
          'verification'
        ],
        responses: ['I can help you with account-related issues.'],
        context: ['account_support']
      },

      {
        name: 'technical_issue',
        patterns: [
          'app crash',
          'bug',
          'error',
          'not working',
          'frozen',
          'slow',
          'technical problem'
        ],
        responses: [
          "I'm sorry you're experiencing technical difficulties. Let me help troubleshoot."
        ],
        context: ['technical_support'],
        escalationTrigger: true
      },

      {
        name: 'human_request',
        patterns: [
          'human',
          'agent',
          'representative',
          'talk to person',
          'customer service',
          'escalate'
        ],
        responses: ["I'll connect you with a human representative."],
        context: ['transfer_human']
      },

      // Complaint and Feedback
      {
        name: 'complaint',
        patterns: [
          'complaint',
          'dissatisfied',
          'unhappy',
          'terrible',
          'worst',
          'angry',
          'frustrated'
        ],
        responses: [
          "I'm sorry to hear about your negative experience. Let me help resolve this immediately."
        ],
        context: ['complaint_handling'],
        escalationTrigger: true,
        priority: 'high'
      },

      {
        name: 'compliment',
        patterns: [
          'great',
          'excellent',
          'amazing',
          'love',
          'fantastic',
          'wonderful',
          'perfect'
        ],
        responses: [
          "Thank you for the positive feedback! We're glad you're happy with our service."
        ],
        context: ['positive_feedback']
      }
    ];
  }

  private initializeConversationFlows() {
    // Customer Order Resolution Flow
    this.conversationFlows.set('order_resolution', {
      steps: {
        identify_issue: {
          message: 'What specific issue are you experiencing with your order?',
          type: 'options',
          options: [
            {
              text: 'Wrong items received',
              value: 'wrong_items',
              action: 'collect_order_details'
            },
            {
              text: 'Missing items',
              value: 'missing_items',
              action: 'collect_order_details'
            },
            {
              text: 'Food quality issue',
              value: 'quality_issue',
              action: 'collect_order_details'
            },
            { text: 'Delivery delay', value: 'delay', action: 'track_order' },
            {
              text: 'Other issue',
              value: 'other',
              action: 'collect_description'
            }
          ]
        },
        collect_order_details: {
          message:
            'Please provide your order ID or the phone number used for the order.',
          type: 'form',
          formFields: [
            {
              name: 'order_id',
              type: 'text',
              label: 'Order ID',
              required: false
            },
            {
              name: 'phone',
              type: 'phone',
              label: 'Phone Number',
              required: false
            }
          ]
        },
        resolution_options: {
          message: 'Based on your issue, here are the available solutions:',
          type: 'options',
          options: [
            {
              text: 'Request refund',
              value: 'refund',
              action: 'process_refund'
            },
            {
              text: 'Reorder items',
              value: 'reorder',
              action: 'process_reorder'
            },
            {
              text: 'Speak to manager',
              value: 'escalate',
              action: 'transfer_human'
            }
          ]
        }
      }
    });

    // Driver Support Flow
    this.conversationFlows.set('driver_support', {
      steps: {
        identify_need: {
          message: 'How can I assist you today?',
          type: 'options',
          options: [
            {
              text: 'Navigation help',
              value: 'navigation',
              action: 'navigation_support'
            },
            {
              text: 'Customer contact',
              value: 'contact',
              action: 'contact_support'
            },
            {
              text: 'Order details',
              value: 'order_info',
              action: 'order_support'
            },
            {
              text: 'Emergency',
              value: 'emergency',
              action: 'emergency_support'
            }
          ]
        },
        navigation_support: {
          message: 'I can help you with navigation. What do you need?',
          type: 'quick_reply',
          quickReplies: [
            'Get directions',
            'Traffic update',
            'Best route',
            'Contact customer'
          ]
        }
      }
    });

    // Restaurant Management Flow
    this.conversationFlows.set('restaurant_orders', {
      steps: {
        order_management: {
          message: 'What would you like to do with your orders?',
          type: 'options',
          options: [
            {
              text: 'View pending orders',
              value: 'view_pending',
              action: 'show_pending'
            },
            {
              text: 'Update preparation time',
              value: 'update_time',
              action: 'update_prep_time'
            },
            {
              text: 'Mark items unavailable',
              value: 'mark_unavailable',
              action: 'manage_availability'
            },
            {
              text: 'Order issue',
              value: 'order_issue',
              action: 'handle_order_issue'
            }
          ]
        }
      }
    });
  }

  private initializeUserTypeHandlers() {
    // Customer Handler
    this.userTypeHandlers.set(Enum_UserType.CUSTOMER, {
      welcomeMessage:
        "Welcome to FlashFood! 🍔 I'm your personal food delivery assistant. I can help you with orders, payments, account issues, and more!",
      mainMenu: [
        { text: '📱 Track my order', value: 'track_order' },
        { text: '🔄 Order issue/refund', value: 'order_issue' },
        { text: '💳 Payment & billing', value: 'payment_help' },
        { text: '👤 Account settings', value: 'account_help' },
        { text: '📞 Talk to human', value: 'human_agent' }
      ],
      priority: 'medium'
    });

    // Driver Handler
    this.userTypeHandlers.set(Enum_UserType.DRIVER, {
      welcomeMessage:
        "Hello Driver! 🚗 I'm here to support you during your deliveries. I can help with navigation, customer issues, earnings, and more!",
      mainMenu: [
        { text: '🗺️ Navigation help', value: 'navigation_help' },
        { text: '📦 Current delivery', value: 'current_delivery' },
        { text: '💰 Earnings & payments', value: 'earnings' },
        { text: '🔧 Vehicle support', value: 'vehicle_help' },
        { text: '🚨 Emergency support', value: 'emergency' },
        { text: '📞 Talk to dispatcher', value: 'human_agent' }
      ],
      priority: 'high'
    });

    // Restaurant Handler
    this.userTypeHandlers.set(Enum_UserType.RESTAURANT_OWNER, {
      welcomeMessage:
        'Welcome Restaurant Partner! 🏪 I can help you manage orders, update your menu, track performance, and resolve any issues!',
      mainMenu: [
        { text: '📋 Manage orders', value: 'manage_orders' },
        { text: '📝 Update menu', value: 'menu_management' },
        { text: '📊 View analytics', value: 'view_analytics' },
        { text: '⚙️ Restaurant settings', value: 'restaurant_settings' },
        { text: '💡 Business tips', value: 'business_support' },
        { text: '📞 Partner support', value: 'human_agent' }
      ],
      priority: 'high'
    });
  }

  async getResponse(
    userMessage: string,
    userId: string,
    userType: Enum_UserType
  ): Promise<ChatbotResponse> {
    const context = this.getOrCreateContext(userId, userType);

    // Update conversation context
    context.previousMessages.push(userMessage);
    if (context.previousMessages.length > 10) {
      context.previousMessages = context.previousMessages.slice(-10);
    }

    // Analyze sentiment
    context.sentiment = this.analyzeSentiment(userMessage);

    // Check if this is a direct option selection first
    const normalizedMessage = userMessage.toLowerCase().trim();

    // Check for main menu option selection
    const userHandler = this.userTypeHandlers.get(context.userType);
    if (userHandler?.mainMenu) {
      // Strip emojis and special characters for better matching
      const cleanMessage = normalizedMessage.replace(/[^\w\s]/gi, '').trim();

      console.log('DEBUG - User type:', context.userType);
      console.log('DEBUG - User message:', userMessage);
      console.log('DEBUG - Normalized message:', normalizedMessage);
      console.log('DEBUG - Clean message:', cleanMessage);
      console.log(
        'DEBUG - Available menu options:',
        JSON.stringify(userHandler.mainMenu)
      );

      const selectedOption = userHandler.mainMenu.find(option => {
        // Try exact value match first
        if (option.value.toLowerCase() === normalizedMessage) {
          console.log('DEBUG - Exact value match found:', option.value);
          return true;
        }

        // Try exact text match (with emojis)
        if (option.text.toLowerCase() === normalizedMessage) {
          console.log('DEBUG - Exact text match found:', option.text);
          return true;
        }

        // Try text match without emojis
        const cleanOptionText = option.text
          .toLowerCase()
          .replace(/[^\w\s]/gi, '')
          .trim();

        console.log(
          'DEBUG - Comparing:',
          cleanOptionText,
          'with',
          cleanMessage
        );
        const isMatch =
          cleanOptionText === cleanMessage ||
          cleanMessage.includes(cleanOptionText);
        if (isMatch) {
          console.log('DEBUG - Text match found:', option.text, option.value);
        }
        return isMatch;
      });

      console.log(
        'DEBUG - Selected option:',
        selectedOption ? JSON.stringify(selectedOption) : 'none'
      );

      if (selectedOption) {
        // Handle the selected option
        switch (selectedOption.value) {
          case 'track_order':
            context.currentFlow = 'order_tracking';
            context.currentStep = 'get_order_id';
            return {
              message: "I'll help you track your order! 📦",
              type: 'form',
              formFields: [
                {
                  name: 'order_id',
                  type: 'text',
                  label: 'Order ID',
                  required: false
                },
                {
                  name: 'phone',
                  type: 'phone',
                  label: 'Phone Number',
                  required: false
                }
              ],
              followUpPrompt:
                'Provide either your Order ID or the phone number you used to place the order.'
            };
          case 'order_issue':
            context.currentFlow = 'order_resolution';
            context.currentStep = 'identify_issue';
            return this.conversationFlows.get('order_resolution').steps[
              'identify_issue'
            ];
          case 'payment_help':
            context.currentFlow = 'payment_support';
            context.currentStep = 'identify_payment_issue';
            return {
              message:
                'I understand you need help with payment. What specific issue are you experiencing?',
              type: 'options',
              options: [
                { text: 'Payment method declined', value: 'payment_declined' },
                { text: 'Wrong amount charged', value: 'wrong_charge' },
                { text: 'Request refund', value: 'refund_request' },
                { text: 'Update payment method', value: 'update_payment' },
                { text: 'Other payment issue', value: 'other_payment' }
              ]
            };
          case 'account_help':
            context.currentFlow = 'account_support';
            context.currentStep = 'identify_account_issue';
            return {
              message:
                'I can help you with your account. What do you need assistance with?',
              type: 'options',
              options: [
                { text: 'Update profile information', value: 'update_profile' },
                { text: 'Change email/password', value: 'change_credentials' },
                {
                  text: 'Notification settings',
                  value: 'notification_settings'
                },
                { text: 'Address management', value: 'manage_addresses' },
                { text: 'Delete account', value: 'delete_account' }
              ]
            };
          case 'human_agent':
            return {
              message:
                "I'll connect you with a human representative right away! 👥",
              type: 'transfer',
              priority: 'medium',
              requiresHuman: true
            };
          // Add handlers for driver menu options
          case 'navigation_help':
            context.currentFlow = 'driver_support';
            context.currentStep = 'navigation_options';
            return {
              message: '🗺️ Navigation Support Available:',
              type: 'options',
              options: [
                { text: 'Get best route', value: 'best_route' },
                { text: 'Traffic alerts', value: 'traffic_alerts' },
                { text: 'Customer location help', value: 'customer_location' },
                { text: 'Parking assistance', value: 'parking_help' },
                { text: 'Back to driver menu', value: 'back_to_driver_menu' }
              ]
            };
          case 'current_delivery':
            context.currentFlow = 'driver_support';
            context.currentStep = 'order_info_options';
            return {
              message: '📦 Select an order to view details:',
              type: 'options',
              options: [
                {
                  text: 'Current delivery (#A7X29)',
                  value: 'current_delivery'
                },
                { text: 'Next pickup (#B8Y31)', value: 'next_pickup' },
                { text: 'Order history', value: 'order_history' },
                { text: 'Back to driver menu', value: 'back_to_driver_menu' }
              ]
            };
          // Restaurant owner menu options
          case 'manage_orders':
            context.currentFlow = 'restaurant_orders';
            context.currentStep = 'order_management';
            return {
              message:
                'I can help you manage your restaurant orders. What would you like to do?',
              type: 'options',
              options: [
                { text: 'View pending orders', value: 'view_pending' },
                { text: 'Update preparation time', value: 'update_time' },
                { text: 'Mark items unavailable', value: 'mark_unavailable' },
                { text: 'Order issue', value: 'order_issue' }
              ]
            };
          // Other option handlers remain the same
          // ... existing code ...
        }
      }
    }

    // Check for flow-specific option selection
    if (this.isOptionSelection(userMessage, context)) {
      console.log('Flow-specific option selected');
      // Let the flow handler deal with it
    }

    // Process the message normally if no option was selected
    const intent = this.identifyIntent(userMessage, userType, context);
    let response: ChatbotResponse;

    if (context.currentFlow && context.currentStep) {
      response = await this.handleFlowResponse(userMessage, context, intent);
    } else {
      response = await this.handleInitialResponse(userMessage, context, intent);
    }

    // Check if escalation is needed
    if (this.shouldEscalate(context, intent, userMessage)) {
      response.requiresHuman = true;
      response.priority = 'high';
      context.escalationCount++;
    }

    // Update context
    context.lastIntent = intent?.name;
    this.contexts.set(userId, context);

    // Validate options before returning
    if (response && response.options) {
      response.options = this.validateMenuOptions(response.options);
    }

    return response;
  }

  private getOrCreateContext(
    userId: string,
    userType: Enum_UserType
  ): ConversationContext {
    if (!this.contexts.has(userId)) {
      this.contexts.set(userId, {
        userId,
        userType,
        sessionStartTime: new Date(),
        previousMessages: [],
        escalationCount: 0
      });
    }
    return this.contexts.get(userId)!;
  }

  private identifyIntent(
    message: string,
    userType: Enum_UserType,
    context: ConversationContext
  ): Intent | null {
    const normalizedMessage = message.toLowerCase().trim();
    let bestMatch: Intent | null = null;
    let highestScore = 0;

    for (const intent of this.intents) {
      // Skip if intent is not for this user type
      if (intent.userTypes && !intent.userTypes.includes(userType)) continue;

      const score = this.calculateIntentScore(
        normalizedMessage,
        intent,
        context
      );
      if (score > highestScore && score > 0.4) {
        highestScore = score;
        bestMatch = intent;
      }
    }

    return bestMatch;
  }

  private calculateIntentScore(
    message: string,
    intent: Intent,
    context: ConversationContext
  ): number {
    let score = 0;
    const messageWords = message.split(' ');

    // Pattern matching
    for (const pattern of intent.patterns) {
      if (message.includes(pattern)) {
        score += pattern.split(' ').length * 0.3;
      } else {
        const patternWords = pattern.split(' ');
        let wordMatches = 0;
        for (const patternWord of patternWords) {
          if (messageWords.includes(patternWord)) {
            wordMatches++;
          }
        }
        if (wordMatches > 0) {
          score += (wordMatches / patternWords.length) * 0.2;
        }
      }
    }

    // Context bonus
    if (
      intent.context &&
      context.currentFlow &&
      intent.context.includes(context.currentFlow)
    ) {
      score += 0.3;
    }

    // Recent intent bonus
    if (context.lastIntent === intent.name) {
      score += 0.1;
    }

    return score;
  }

  private async handleInitialResponse(
    message: string,
    context: ConversationContext,
    intent: Intent | null
  ): Promise<ChatbotResponse> {
    if (!intent) {
      return this.getDefaultResponse(context);
    }

    const userHandler = this.userTypeHandlers.get(context.userType);

    switch (intent.name) {
      case 'greeting':
        return {
          message:
            userHandler?.welcomeMessage || 'Hello! How can I help you today?',
          type: 'options',
          options: userHandler?.mainMenu || [],
          followUpPrompt:
            'Please select an option or tell me what you need help with.'
        };

      case 'order_status':
        context.currentFlow = 'order_tracking';
        context.currentStep = 'get_order_id';
        return {
          message: "I'll help you track your order! 📦",
          type: 'form',
          formFields: [
            {
              name: 'order_id',
              type: 'text',
              label: 'Order ID',
              required: false
            },
            {
              name: 'phone',
              type: 'phone',
              label: 'Phone Number',
              required: false
            }
          ],
          followUpPrompt:
            'Provide either your Order ID or the phone number you used to place the order.'
        };

      case 'order_issue':
        context.currentFlow = 'order_resolution';
        context.currentStep = 'identify_issue';
        return this.conversationFlows.get('order_resolution').steps[
          'identify_issue'
        ];

      case 'driver_navigation':
        context.currentFlow = 'driver_support';
        context.currentStep = 'identify_need';
        return this.conversationFlows.get('driver_support').steps[
          'identify_need'
        ];

      case 'restaurant_orders':
        context.currentFlow = 'restaurant_orders';
        context.currentStep = 'order_management';
        return this.conversationFlows.get('restaurant_orders').steps[
          'order_management'
        ];

      case 'human_request':
        return {
          message:
            "I'll connect you with a human representative right away! 👥",
          type: 'transfer',
          priority: 'medium'
        };

      case 'complaint':
        context.escalationCount++;
        return {
          message:
            "I sincerely apologize for the trouble you're experiencing. Let me escalate this to our priority support team immediately. 🚨",
          type: 'transfer',
          priority: 'urgent',
          requiresHuman: true
        };

      default:
        const response =
          intent.responses[Math.floor(Math.random() * intent.responses.length)];
        return {
          message: response,
          type: 'text',
          followUpPrompt: 'How else can I assist you today?'
        };
    }
  }

  private async handleFlowResponse(
    message: string,
    context: ConversationContext,
    intent: Intent | null
  ): Promise<ChatbotResponse> {
    const flow = this.conversationFlows.get(context.currentFlow!);
    if (!flow || !context.currentStep) {
      return this.getDefaultResponse(context);
    }

    // Store user response
    if (!context.collectedData) context.collectedData = {};
    context.collectedData[context.currentStep] = message;

    // Process based on current flow and step
    switch (context.currentFlow) {
      case 'order_resolution':
        return this.handleOrderResolutionFlow(message, context);
      case 'driver_support':
        return this.handleDriverSupportFlow(message, context);
      case 'restaurant_orders':
        return this.handleRestaurantOrdersFlow(message, context);
      case 'order_tracking':
        return this.handleOrderTrackingFlow(message, context);
      case 'payment_support':
        // Handle payment support flow
        // For now, just return to main menu as a placeholder
        context.currentFlow = undefined;
        context.currentStep = undefined;
        const userHandler = this.userTypeHandlers.get(context.userType);
        return {
          message:
            'Your payment issue has been addressed. What else can I help you with today?',
          type: 'options',
          options: userHandler?.mainMenu || []
        };
      case 'account_support':
        // Handle account support flow
        // For now, just return to main menu as a placeholder
        context.currentFlow = undefined;
        context.currentStep = undefined;
        const userHandler2 = this.userTypeHandlers.get(context.userType);
        return {
          message:
            'Your account issue has been addressed. What else can I help you with today?',
          type: 'options',
          options: userHandler2?.mainMenu || []
        };
      default:
        // Check if we're in a nested flow step
        if (
          context.currentStep.includes('navigation_') ||
          context.currentStep.includes('order_details_') ||
          context.currentStep.includes('update_time_') ||
          context.currentStep.includes('report_issue_') ||
          context.currentStep.includes('order_info_') ||
          context.currentStep.includes('emergency_') ||
          context.currentStep.includes('contact_') ||
          context.currentStep.includes('customer_unreachable_')
        ) {
          // Handle nested flows based on the parent flow
          if (context.currentFlow === 'driver_support') {
            return this.handleDriverSupportFlow(message, context);
          } else if (context.currentFlow === 'restaurant_orders') {
            return this.handleRestaurantOrdersFlow(message, context);
          } else if (context.currentFlow === 'order_tracking') {
            return this.handleOrderTrackingFlow(message, context);
          }
        }

        return this.getDefaultResponse(context);
    }
  }

  private handleOrderResolutionFlow(
    message: string,
    context: ConversationContext
  ): ChatbotResponse {
    switch (context.currentStep) {
      case 'identify_issue':
        context.currentStep = 'collect_order_details';
        return {
          message:
            "I understand you're having an issue. Let me get your order details to help resolve this quickly.",
          type: 'form',
          formFields: [
            {
              name: 'order_id',
              type: 'text',
              label: 'Order ID (if you have it)',
              required: false
            },
            {
              name: 'phone',
              type: 'phone',
              label: 'Phone Number',
              required: true
            }
          ]
        };

      case 'collect_order_details':
        context.currentStep = 'resolution_options';
        return {
          message:
            'Thank you for the information. Based on your issue, here are the available solutions:',
          type: 'options',
          options: [
            { text: '💰 Request full refund', value: 'full_refund' },
            { text: '🔄 Reorder missing/wrong items', value: 'reorder' },
            { text: '💳 Partial refund + reorder', value: 'partial_refund' },
            { text: '📞 Speak to manager', value: 'escalate' }
          ]
        };

      default:
        return this.completeFlow(
          context,
          'Your issue has been logged and will be resolved within 24 hours. Is there anything else I can help you with?'
        );
    }
  }

  private handleDriverSupportFlow(
    message: string,
    context: ConversationContext
  ): ChatbotResponse {
    switch (context.currentStep) {
      case 'identify_need':
        if (message.toLowerCase().includes('navigation')) {
          context.currentStep = 'navigation_options';
          return {
            message: '🗺️ Navigation Support Available:',
            type: 'options',
            options: [
              { text: 'Get best route', value: 'best_route' },
              { text: 'Traffic alerts', value: 'traffic_alerts' },
              { text: 'Customer location help', value: 'customer_location' },
              { text: 'Parking assistance', value: 'parking_help' },
              { text: 'Back to driver menu', value: 'back_to_driver_menu' }
            ]
          };
        } else if (message.toLowerCase().includes('contact')) {
          context.currentStep = 'contact_options';
          return {
            message: '📱 Customer Contact Options:',
            type: 'options',
            options: [
              { text: 'Call customer', value: 'call_customer' },
              { text: 'Text customer', value: 'text_customer' },
              {
                text: 'Unable to reach customer',
                value: 'customer_unreachable'
              },
              { text: 'Back to driver menu', value: 'back_to_driver_menu' }
            ]
          };
        } else if (
          message.toLowerCase().includes('order_info') ||
          message.toLowerCase().includes('order detail')
        ) {
          context.currentStep = 'order_info_options';
          return {
            message: '📦 Select an order to view details:',
            type: 'options',
            options: [
              { text: 'Current delivery (#A7X29)', value: 'current_delivery' },
              { text: 'Next pickup (#B8Y31)', value: 'next_pickup' },
              { text: 'Order history', value: 'order_history' },
              { text: 'Back to driver menu', value: 'back_to_driver_menu' }
            ]
          };
        } else if (message.toLowerCase().includes('emergency')) {
          context.currentStep = 'emergency_options';
          return {
            message: '🚨 Emergency Support - What type of emergency?',
            type: 'options',
            options: [
              { text: 'Vehicle breakdown', value: 'vehicle_breakdown' },
              { text: 'Accident', value: 'accident' },
              { text: 'Safety concern', value: 'safety_concern' },
              { text: 'Medical emergency', value: 'medical_emergency' },
              { text: 'Back to driver menu', value: 'back_to_driver_menu' }
            ],
            priority: 'urgent',
            requiresHuman: true
          };
        }
        break;

      case 'navigation_options':
        if (message.toLowerCase().includes('best_route')) {
          context.currentStep = 'best_route_options';
          return {
            message: '🛣️ Best Route Options:',
            type: 'options',
            options: [
              { text: 'Fastest route', value: 'fastest_route' },
              { text: 'Avoid highways', value: 'avoid_highways' },
              { text: 'Avoid tolls', value: 'avoid_tolls' },
              {
                text: 'Optimize multiple deliveries',
                value: 'optimize_deliveries'
              },
              {
                text: 'Back to navigation options',
                value: 'back_to_navigation'
              }
            ]
          };
        } else if (message.toLowerCase().includes('traffic')) {
          return {
            message:
              '🚦 Current Traffic Alerts in Your Area:\n\n• Heavy congestion on Main St between 5th and 9th Ave\n• Construction on Highway 101 near exit 25\n• Accident reported on Broadway and 3rd St\n\nWould you like to:',
            type: 'options',
            options: [
              { text: 'Reroute to avoid traffic', value: 'reroute_traffic' },
              { text: 'Get estimated delay time', value: 'delay_estimate' },
              {
                text: 'Back to navigation options',
                value: 'back_to_navigation'
              }
            ]
          };
        } else if (message.toLowerCase().includes('customer_location')) {
          return {
            message: '📍 Customer Location Support:',
            type: 'options',
            options: [
              { text: 'Get detailed directions', value: 'detailed_directions' },
              { text: 'Address seems incorrect', value: 'address_issue' },
              { text: 'Building/apartment access help', value: 'access_help' },
              {
                text: 'Back to navigation options',
                value: 'back_to_navigation'
              }
            ]
          };
        } else if (message.toLowerCase().includes('parking')) {
          return {
            message: '🅿️ Parking Assistance:',
            type: 'options',
            options: [
              { text: 'Find nearby parking', value: 'find_parking' },
              { text: 'Parking rules for this area', value: 'parking_rules' },
              { text: 'Report no parking available', value: 'no_parking' },
              {
                text: 'Back to navigation options',
                value: 'back_to_navigation'
              }
            ]
          };
        } else if (message.toLowerCase().includes('back')) {
          context.currentStep = 'identify_need';
          return {
            message: 'How can I assist you today?',
            type: 'options',
            options: [
              { text: 'Navigation help', value: 'navigation' },
              { text: 'Customer contact', value: 'contact' },
              { text: 'Order details', value: 'order_info' },
              { text: 'Emergency', value: 'emergency' }
            ]
          };
        }
        break;

      case 'best_route_options':
        if (message.toLowerCase().includes('fastest')) {
          return {
            message:
              '🚀 Calculating fastest route to your destination...\n\nEstimated arrival time: 7:45 PM (15 minutes)\nDistance: 3.2 miles\nTraffic: Light\n\nRoute has been sent to your navigation app.',
            type: 'options',
            options: [
              { text: 'Start navigation', value: 'start_navigation' },
              { text: 'Find alternate route', value: 'alternate_route' },
              {
                text: 'Back to navigation options',
                value: 'back_to_navigation'
              }
            ]
          };
        } else if (message.toLowerCase().includes('avoid_highways')) {
          return {
            message:
              '🛣️ Calculating route avoiding highways...\n\nEstimated arrival time: 7:52 PM (22 minutes)\nDistance: 4.1 miles\nTraffic: Moderate\n\nRoute has been sent to your navigation app.',
            type: 'options',
            options: [
              { text: 'Start navigation', value: 'start_navigation' },
              { text: 'Find alternate route', value: 'alternate_route' },
              {
                text: 'Back to navigation options',
                value: 'back_to_navigation'
              }
            ]
          };
        } else if (message.toLowerCase().includes('avoid_tolls')) {
          return {
            message:
              '💰 Calculating route avoiding tolls...\n\nEstimated arrival time: 7:50 PM (20 minutes)\nDistance: 3.8 miles\nTraffic: Light to Moderate\n\nRoute has been sent to your navigation app.',
            type: 'options',
            options: [
              { text: 'Start navigation', value: 'start_navigation' },
              { text: 'Find alternate route', value: 'alternate_route' },
              {
                text: 'Back to navigation options',
                value: 'back_to_navigation'
              }
            ]
          };
        } else if (message.toLowerCase().includes('optimize')) {
          return {
            message:
              '📦 Optimizing route for multiple deliveries...\n\nOptimal delivery order:\n1. 123 Main St (2 min away)\n2. 456 Oak Ave (5 min from stop 1)\n3. 789 Pine Blvd (3 min from stop 2)\n\nTotal estimated time: 35 minutes\nTotal distance: 5.3 miles',
            type: 'options',
            options: [
              { text: 'Start optimized navigation', value: 'start_navigation' },
              {
                text: 'Reorder deliveries manually',
                value: 'reorder_deliveries'
              },
              {
                text: 'Back to navigation options',
                value: 'back_to_navigation'
              }
            ]
          };
        } else if (message.toLowerCase().includes('back')) {
          context.currentStep = 'navigation_options';
          return {
            message: '🗺️ Navigation Support Available:',
            type: 'options',
            options: [
              { text: 'Get best route', value: 'best_route' },
              { text: 'Traffic alerts', value: 'traffic_alerts' },
              { text: 'Customer location help', value: 'customer_location' },
              { text: 'Parking assistance', value: 'parking_help' },
              { text: 'Back to driver menu', value: 'back_to_driver_menu' }
            ]
          };
        }
        break;

      case 'contact_options':
        if (message.toLowerCase().includes('call')) {
          return {
            message:
              '📞 Initiating call to customer (Sarah Johnson) at (555) 123-4567...\n\nReminder: For safety, please ensure you are parked before making the call.',
            type: 'options',
            options: [
              { text: 'Call completed', value: 'call_completed' },
              { text: 'No answer', value: 'no_answer' },
              { text: 'Wrong number', value: 'wrong_number' },
              { text: 'Back to contact options', value: 'back_to_contact' }
            ]
          };
        } else if (message.toLowerCase().includes('text')) {
          return {
            message: '✉️ Send a text message to customer:',
            type: 'form',
            formFields: [
              {
                name: 'message',
                type: 'text',
                label: 'Message to Customer',
                required: true
              }
            ]
          };
        } else if (message.toLowerCase().includes('unreachable')) {
          context.currentStep = 'customer_unreachable_options';
          return {
            message: '⚠️ Unable to reach customer. What would you like to do?',
            type: 'options',
            options: [
              { text: 'Wait 5 more minutes', value: 'wait_more' },
              { text: 'Leave at safe location', value: 'leave_safe' },
              { text: 'Contact support', value: 'contact_support' },
              { text: 'Cancel delivery', value: 'cancel_delivery' },
              { text: 'Back to contact options', value: 'back_to_contact' }
            ]
          };
        } else if (message.toLowerCase().includes('back')) {
          context.currentStep = 'identify_need';
          return {
            message: 'How can I assist you today?',
            type: 'options',
            options: [
              { text: 'Navigation help', value: 'navigation' },
              { text: 'Customer contact', value: 'contact' },
              { text: 'Order details', value: 'order_info' },
              { text: 'Emergency', value: 'emergency' }
            ]
          };
        }
        break;

      case 'customer_unreachable_options':
        if (message.toLowerCase().includes('wait_more')) {
          return {
            message:
              "⏱️ We'll wait 5 more minutes and then try contacting the customer again. I'll send you a reminder when it's time.",
            type: 'options',
            options: [
              { text: 'Customer arrived', value: 'customer_arrived' },
              { text: 'Still unreachable', value: 'still_unreachable' },
              { text: 'Back to contact options', value: 'back_to_contact' }
            ]
          };
        } else if (message.toLowerCase().includes('leave_safe')) {
          return {
            message:
              '📦 If you decide to leave the order at a safe location, please:\n\n1. Take a clear photo of where you left it\n2. Send the photo to the customer\n3. Add detailed description of the location\n\nWould you like to proceed?',
            type: 'options',
            options: [
              { text: 'Take photo and complete delivery', value: 'take_photo' },
              { text: 'No safe location available', value: 'no_safe_location' },
              {
                text: 'Back to unreachable options',
                value: 'back_to_unreachable'
              }
            ]
          };
        } else if (message.toLowerCase().includes('contact_support')) {
          return {
            message:
              '👥 Connecting you with support team. Please wait a moment...',
            type: 'transfer',
            priority: 'medium',
            requiresHuman: true
          };
        } else if (message.toLowerCase().includes('back')) {
          context.currentStep = 'contact_options';
          return {
            message: '📱 Customer Contact Options:',
            type: 'options',
            options: [
              { text: 'Call customer', value: 'call_customer' },
              { text: 'Text customer', value: 'text_customer' },
              {
                text: 'Unable to reach customer',
                value: 'customer_unreachable'
              },
              { text: 'Back to driver menu', value: 'back_to_driver_menu' }
            ]
          };
        }
        break;

      case 'order_info_options':
        if (message.toLowerCase().includes('current_delivery')) {
          return {
            message:
              '📝 Order #A7X29 Details:\n\n• Customer: Sarah Johnson\n• Address: 123 Main St, Apt 4B\n• Items: Double Cheeseburger, Fries, Milkshake\n• Restaurant: Burger Joint\n• Pickup time: 7:15 PM\n• Delivery ETA: 7:30 PM\n• Special instructions: "Please knock, don\'t ring doorbell. Dog barks."',
            type: 'options',
            options: [
              { text: 'Contact customer', value: 'contact_customer_A7X29' },
              { text: 'Navigate to address', value: 'navigate_A7X29' },
              { text: 'Report issue with order', value: 'report_issue_A7X29' },
              { text: 'Back to order info', value: 'back_to_order_info' }
            ]
          };
        } else if (message.toLowerCase().includes('next_pickup')) {
          return {
            message:
              '📝 Order #B8Y31 Details:\n\n• Customer: Mike Chen\n• Address: 456 Oak Ave\n• Items: Dragon Roll, California Roll, Miso Soup\n• Restaurant: Sushi Express\n• Pickup time: 7:45 PM\n• Delivery ETA: 8:00 PM\n• Special instructions: "Leave at door, no contact delivery please."',
            type: 'options',
            options: [
              { text: 'Contact restaurant', value: 'contact_restaurant_B8Y31' },
              {
                text: 'Navigate to restaurant',
                value: 'navigate_restaurant_B8Y31'
              },
              { text: 'Adjust pickup time', value: 'adjust_pickup_B8Y31' },
              { text: 'Back to order info', value: 'back_to_order_info' }
            ]
          };
        } else if (message.toLowerCase().includes('history')) {
          return {
            message:
              "📋 Today's Delivery History:\n\n• Order #X5Y21 - Completed at 6:15 PM\n• Order #Z7W32 - Completed at 6:45 PM\n• Order #V9U27 - Completed at 7:00 PM",
            type: 'options',
            options: [
              { text: 'View earnings summary', value: 'view_earnings' },
              { text: 'View customer ratings', value: 'view_ratings' },
              { text: 'Back to order info', value: 'back_to_order_info' }
            ]
          };
        } else if (message.toLowerCase().includes('back')) {
          context.currentStep = 'identify_need';
          return {
            message: 'How can I assist you today?',
            type: 'options',
            options: [
              { text: 'Navigation help', value: 'navigation' },
              { text: 'Customer contact', value: 'contact' },
              { text: 'Order details', value: 'order_info' },
              { text: 'Emergency', value: 'emergency' }
            ]
          };
        }
        break;

      case 'emergency_options':
        if (message.toLowerCase().includes('vehicle_breakdown')) {
          return {
            message:
              "🚨 Vehicle Breakdown Emergency\n\nYour safety is our priority. I've alerted our emergency support team, and they will contact you immediately.\n\nIn the meantime:\n1. Move to a safe location if possible\n2. Turn on hazard lights\n3. Stay in your vehicle if it's safe to do so",
            type: 'options',
            options: [
              {
                text: 'Request roadside assistance',
                value: 'roadside_assistance'
              },
              { text: 'Call emergency hotline', value: 'call_emergency' },
              { text: 'Cancel current deliveries', value: 'cancel_deliveries' }
            ],
            priority: 'urgent',
            requiresHuman: true
          };
        } else if (message.toLowerCase().includes('accident')) {
          return {
            message:
              "🚨 Accident Emergency\n\nI've alerted our emergency response team. They will contact you immediately.\n\nImportant steps to take now:\n1. Check if anyone needs medical attention\n2. Call local emergency services (911) if needed\n3. Exchange information with other parties if applicable\n4. Take photos of the scene if safe to do so",
            type: 'options',
            options: [
              { text: 'Call 911', value: 'call_911' },
              {
                text: 'Speak to emergency support',
                value: 'emergency_support'
              },
              { text: 'Report accident details', value: 'report_accident' }
            ],
            priority: 'urgent',
            requiresHuman: true
          };
        } else if (message.toLowerCase().includes('safety')) {
          return {
            message:
              "🚨 Safety Concern\n\nYour safety is our top priority. I've alerted our safety response team, and they will contact you immediately.\n\nIf you feel you're in immediate danger, please:\n1. Move to a safe, public location\n2. Call local emergency services if necessary\n3. Stay on this chat so we can assist you",
            type: 'options',
            options: [
              { text: 'Call 911', value: 'call_911' },
              { text: 'Speak to safety team', value: 'safety_team' },
              {
                text: 'Cancel current delivery',
                value: 'cancel_delivery_safety'
              }
            ],
            priority: 'urgent',
            requiresHuman: true
          };
        } else if (message.toLowerCase().includes('medical')) {
          return {
            message:
              "🚨 Medical Emergency\n\nI've alerted our emergency response team. They will contact you immediately.\n\nIf this is a life-threatening emergency:\n1. Call local emergency services (911) immediately\n2. If safe to do so, pull over and turn on hazard lights\n3. Focus on your health first - deliveries can wait",
            type: 'options',
            options: [
              { text: 'Call 911', value: 'call_911' },
              { text: 'Speak to medical support', value: 'medical_support' },
              { text: 'Cancel all deliveries', value: 'cancel_all_medical' }
            ],
            priority: 'urgent',
            requiresHuman: true
          };
        } else if (message.toLowerCase().includes('back')) {
          context.currentStep = 'identify_need';
          return {
            message: 'How can I assist you today?',
            type: 'options',
            options: [
              { text: 'Navigation help', value: 'navigation' },
              { text: 'Customer contact', value: 'contact' },
              { text: 'Order details', value: 'order_info' },
              { text: 'Emergency', value: 'emergency' }
            ]
          };
        }
        break;
    }

    // Handle common navigation commands
    if (
      message.toLowerCase().includes('back_to_driver_menu') ||
      message.toLowerCase().includes('back_to_navigation') ||
      message.toLowerCase().includes('back_to_contact') ||
      message.toLowerCase().includes('back_to_order_info') ||
      message.toLowerCase().includes('back_to_unreachable')
    ) {
      // Extract the destination from the command
      if (message.toLowerCase().includes('navigation')) {
        context.currentStep = 'navigation_options';
        return {
          message: '🗺️ Navigation Support Available:',
          type: 'options',
          options: [
            { text: 'Get best route', value: 'best_route' },
            { text: 'Traffic alerts', value: 'traffic_alerts' },
            { text: 'Customer location help', value: 'customer_location' },
            { text: 'Parking assistance', value: 'parking_help' },
            { text: 'Back to driver menu', value: 'back_to_driver_menu' }
          ]
        };
      } else if (message.toLowerCase().includes('contact')) {
        context.currentStep = 'contact_options';
        return {
          message: '📱 Customer Contact Options:',
          type: 'options',
          options: [
            { text: 'Call customer', value: 'call_customer' },
            { text: 'Text customer', value: 'text_customer' },
            { text: 'Unable to reach customer', value: 'customer_unreachable' },
            { text: 'Back to driver menu', value: 'back_to_driver_menu' }
          ]
        };
      } else if (message.toLowerCase().includes('order_info')) {
        context.currentStep = 'order_info_options';
        return {
          message: '📦 Select an order to view details:',
          type: 'options',
          options: [
            { text: 'Current delivery (#A7X29)', value: 'current_delivery' },
            { text: 'Next pickup (#B8Y31)', value: 'next_pickup' },
            { text: 'Order history', value: 'order_history' },
            { text: 'Back to driver menu', value: 'back_to_driver_menu' }
          ]
        };
      } else if (message.toLowerCase().includes('unreachable')) {
        context.currentStep = 'customer_unreachable_options';
        return {
          message: '⚠️ Unable to reach customer. What would you like to do?',
          type: 'options',
          options: [
            { text: 'Wait 5 more minutes', value: 'wait_more' },
            { text: 'Leave at safe location', value: 'leave_safe' },
            { text: 'Contact support', value: 'contact_support' },
            { text: 'Cancel delivery', value: 'cancel_delivery' },
            { text: 'Back to contact options', value: 'back_to_contact' }
          ]
        };
      } else {
        // Default to main driver menu
        context.currentStep = 'identify_need';
        return {
          message: 'How can I assist you today?',
          type: 'options',
          options: [
            { text: 'Navigation help', value: 'navigation' },
            { text: 'Customer contact', value: 'contact' },
            { text: 'Order details', value: 'order_info' },
            { text: 'Emergency', value: 'emergency' }
          ]
        };
      }
    }

    return this.completeFlow(
      context,
      "I've noted your request. A dispatcher will contact you shortly if needed."
    );
  }

  private handleRestaurantOrdersFlow(
    message: string,
    context: ConversationContext
  ): ChatbotResponse {
    switch (context.currentStep) {
      case 'order_management':
        if (message.toLowerCase().includes('pending')) {
          context.currentStep = 'view_pending_orders';
          return {
            message: '📋 Here are your pending orders:',
            type: 'options',
            options: [
              {
                text: 'Order #1234 - Pizza Place - $45.99',
                value: 'order_1234'
              },
              {
                text: 'Order #5678 - Burger Joint - $32.50',
                value: 'order_5678'
              },
              {
                text: 'Order #9012 - Sushi Express - $67.25',
                value: 'order_9012'
              },
              { text: 'Back to order management', value: 'back_to_orders' }
            ]
          };
        } else if (
          message.toLowerCase().includes('update') ||
          message.toLowerCase().includes('preparation')
        ) {
          context.currentStep = 'update_preparation_time';
          return {
            message: 'Select an order to update preparation time:',
            type: 'options',
            options: [
              {
                text: 'Order #1234 - Pizza Place - Current: 15 min',
                value: 'prep_1234'
              },
              {
                text: 'Order #5678 - Burger Joint - Current: 10 min',
                value: 'prep_5678'
              },
              {
                text: 'Order #9012 - Sushi Express - Current: 20 min',
                value: 'prep_9012'
              },
              { text: 'Back to order management', value: 'back_to_orders' }
            ]
          };
        } else if (
          message.toLowerCase().includes('unavailable') ||
          message.toLowerCase().includes('mark')
        ) {
          context.currentStep = 'mark_items_unavailable';
          return {
            message: 'Select menu category to update availability:',
            type: 'options',
            options: [
              { text: 'Appetizers', value: 'cat_appetizers' },
              { text: 'Main Dishes', value: 'cat_main' },
              { text: 'Desserts', value: 'cat_desserts' },
              { text: 'Beverages', value: 'cat_beverages' },
              { text: 'Back to order management', value: 'back_to_orders' }
            ]
          };
        } else if (message.toLowerCase().includes('issue')) {
          context.currentStep = 'handle_order_issue';
          return {
            message: 'Select the order with an issue:',
            type: 'options',
            options: [
              { text: 'Order #1234 - Pizza Place', value: 'issue_1234' },
              { text: 'Order #5678 - Burger Joint', value: 'issue_5678' },
              { text: 'Order #9012 - Sushi Express', value: 'issue_9012' },
              { text: 'Back to order management', value: 'back_to_orders' }
            ]
          };
        }
        break;

      case 'view_pending_orders':
        if (
          message.toLowerCase().includes('order_1234') ||
          message.includes('1234')
        ) {
          context.currentStep = 'order_details_1234';
          return {
            message:
              '📝 Order #1234 Details:\n- Customer: John Smith\n- Items: Large Pepperoni Pizza, Garlic Knots, Soda\n- Total: $45.99\n- Requested: 6:30 PM\n- Status: Preparing',
            type: 'options',
            options: [
              { text: 'Mark as ready for pickup', value: 'ready_1234' },
              { text: 'Update preparation time', value: 'update_time_1234' },
              { text: 'Contact customer', value: 'contact_customer_1234' },
              { text: 'Report issue with order', value: 'report_issue_1234' },
              { text: 'Back to pending orders', value: 'back_to_pending' }
            ]
          };
        } else if (
          message.toLowerCase().includes('order_5678') ||
          message.includes('5678')
        ) {
          context.currentStep = 'order_details_5678';
          return {
            message:
              '📝 Order #5678 Details:\n- Customer: Sarah Johnson\n- Items: Double Cheeseburger, Fries, Milkshake\n- Total: $32.50\n- Requested: 7:00 PM\n- Status: Preparing',
            type: 'options',
            options: [
              { text: 'Mark as ready for pickup', value: 'ready_5678' },
              { text: 'Update preparation time', value: 'update_time_5678' },
              { text: 'Contact customer', value: 'contact_customer_5678' },
              { text: 'Report issue with order', value: 'report_issue_5678' },
              { text: 'Back to pending orders', value: 'back_to_pending' }
            ]
          };
        } else if (
          message.toLowerCase().includes('order_9012') ||
          message.includes('9012')
        ) {
          context.currentStep = 'order_details_9012';
          return {
            message:
              '📝 Order #9012 Details:\n- Customer: Mike Chen\n- Items: Dragon Roll, California Roll, Miso Soup\n- Total: $67.25\n- Requested: 7:15 PM\n- Status: Preparing',
            type: 'options',
            options: [
              { text: 'Mark as ready for pickup', value: 'ready_9012' },
              { text: 'Update preparation time', value: 'update_time_9012' },
              { text: 'Contact customer', value: 'contact_customer_9012' },
              { text: 'Report issue with order', value: 'report_issue_9012' },
              { text: 'Back to pending orders', value: 'back_to_pending' }
            ]
          };
        } else if (message.toLowerCase().includes('back')) {
          context.currentStep = 'order_management';
          return this.conversationFlows.get('restaurant_orders').steps[
            'order_management'
          ];
        }
        break;

      case 'order_details_1234':
      case 'order_details_5678':
      case 'order_details_9012':
        const orderId = context.currentStep.split('_').pop();

        if (message.toLowerCase().includes('ready')) {
          return {
            message: `✅ Order #${orderId} has been marked as ready for pickup. The customer will be notified.`,
            type: 'options',
            options: [
              { text: 'Back to pending orders', value: 'back_to_pending' },
              { text: 'Back to order management', value: 'back_to_orders' }
            ]
          };
        } else if (message.toLowerCase().includes('update_time')) {
          context.currentStep = `update_time_${orderId}`;
          return {
            message: 'Select new preparation time:',
            type: 'options',
            options: [
              { text: '5 minutes', value: `time_5_${orderId}` },
              { text: '10 minutes', value: `time_10_${orderId}` },
              { text: '15 minutes', value: `time_15_${orderId}` },
              { text: '20 minutes', value: `time_20_${orderId}` },
              { text: '30+ minutes', value: `time_30_${orderId}` }
            ]
          };
        } else if (message.toLowerCase().includes('contact')) {
          return {
            message: `📱 Connecting you with the customer for Order #${orderId}. You can send a message below:`,
            type: 'form',
            formFields: [
              {
                name: 'message',
                type: 'text',
                label: 'Message to Customer',
                required: true
              }
            ]
          };
        } else if (message.toLowerCase().includes('report')) {
          context.currentStep = `report_issue_${orderId}`;
          return {
            message: 'What issue are you experiencing with this order?',
            type: 'options',
            options: [
              {
                text: 'Missing ingredients',
                value: `issue_ingredients_${orderId}`
              },
              {
                text: 'Equipment problem',
                value: `issue_equipment_${orderId}`
              },
              { text: 'Staff shortage', value: `issue_staff_${orderId}` },
              { text: 'Other issue', value: `issue_other_${orderId}` }
            ]
          };
        } else if (message.toLowerCase().includes('back_to_pending')) {
          context.currentStep = 'view_pending_orders';
          return {
            message: '📋 Here are your pending orders:',
            type: 'options',
            options: [
              {
                text: 'Order #1234 - Pizza Place - $45.99',
                value: 'order_1234'
              },
              {
                text: 'Order #5678 - Burger Joint - $32.50',
                value: 'order_5678'
              },
              {
                text: 'Order #9012 - Sushi Express - $67.25',
                value: 'order_9012'
              },
              { text: 'Back to order management', value: 'back_to_orders' }
            ]
          };
        }
        break;

      case 'update_time_1234':
      case 'update_time_5678':
      case 'update_time_9012':
        const orderIdTime = context.currentStep.split('_').pop();
        const timeMatch = message.match(/time_(\d+)/);

        if (timeMatch) {
          const minutes = timeMatch[1];
          return {
            message: `✅ Preparation time for Order #${orderIdTime} has been updated to ${minutes} minutes. The customer will be notified of the new estimate.`,
            type: 'options',
            options: [
              {
                text: 'Back to order details',
                value: `back_to_order_${orderIdTime}`
              },
              { text: 'Back to pending orders', value: 'back_to_pending' },
              { text: 'Back to order management', value: 'back_to_orders' }
            ]
          };
        } else if (message.toLowerCase().includes('back_to_order')) {
          context.currentStep = `order_details_${orderIdTime}`;
          return this.handleRestaurantOrdersFlow(`order_${orderIdTime}`, {
            ...context,
            currentStep: 'view_pending_orders'
          });
        }
        break;

      case 'report_issue_1234':
      case 'report_issue_5678':
      case 'report_issue_9012':
        const orderIdIssue = context.currentStep.split('_').pop();

        if (message.toLowerCase().includes('issue_')) {
          let issueType = 'other';
          if (message.includes('ingredients'))
            issueType = 'missing ingredients';
          else if (message.includes('equipment'))
            issueType = 'equipment problem';
          else if (message.includes('staff')) issueType = 'staff shortage';

          return {
            message: `🚨 Your issue (${issueType}) with Order #${orderIdIssue} has been reported to management. Would you like to:`,
            type: 'options',
            options: [
              {
                text: 'Cancel the order',
                value: `cancel_order_${orderIdIssue}`
              },
              {
                text: 'Notify the customer of delay',
                value: `notify_delay_${orderIdIssue}`
              },
              {
                text: 'Request assistance',
                value: `request_help_${orderIdIssue}`
              },
              {
                text: 'Back to order details',
                value: `back_to_order_${orderIdIssue}`
              }
            ]
          };
        } else if (message.toLowerCase().includes('back_to_order')) {
          context.currentStep = `order_details_${orderIdIssue}`;
          return this.handleRestaurantOrdersFlow(`order_${orderIdIssue}`, {
            ...context,
            currentStep: 'view_pending_orders'
          });
        }
        break;

      case 'update_preparation_time':
        if (message.toLowerCase().includes('prep_')) {
          const orderIdPrep = message.split('_').pop();
          context.currentStep = `update_time_${orderIdPrep}`;
          return {
            message: `Select new preparation time for Order #${orderIdPrep}:`,
            type: 'options',
            options: [
              { text: '5 minutes', value: `time_5_${orderIdPrep}` },
              { text: '10 minutes', value: `time_10_${orderIdPrep}` },
              { text: '15 minutes', value: `time_15_${orderIdPrep}` },
              { text: '20 minutes', value: `time_20_${orderIdPrep}` },
              { text: '30+ minutes', value: `time_30_${orderIdPrep}` }
            ]
          };
        } else if (message.toLowerCase().includes('back_to_orders')) {
          context.currentStep = 'order_management';
          return this.conversationFlows.get('restaurant_orders').steps[
            'order_management'
          ];
        }
        break;

      case 'mark_items_unavailable':
        if (message.toLowerCase().includes('cat_')) {
          const category = message.replace('cat_', '');
          context.currentStep = `items_${category}`;

          let items = [];
          switch (category) {
            case 'appetizers':
              items = [
                {
                  text: 'Garlic Bread - Currently Available',
                  value: 'item_garlic_bread'
                },
                {
                  text: 'Mozzarella Sticks - Currently Available',
                  value: 'item_mozzarella'
                },
                {
                  text: 'Chicken Wings - Currently Available',
                  value: 'item_wings'
                }
              ];
              break;
            case 'main':
              items = [
                {
                  text: 'Pepperoni Pizza - Currently Available',
                  value: 'item_pepperoni'
                },
                {
                  text: 'Margherita Pizza - Currently Available',
                  value: 'item_margherita'
                },
                {
                  text: 'Spaghetti Bolognese - Currently Available',
                  value: 'item_spaghetti'
                }
              ];
              break;
            case 'desserts':
              items = [
                {
                  text: 'Tiramisu - Currently Available',
                  value: 'item_tiramisu'
                },
                {
                  text: 'Cheesecake - Currently Available',
                  value: 'item_cheesecake'
                },
                {
                  text: 'Ice Cream - Currently Available',
                  value: 'item_ice_cream'
                }
              ];
              break;
            case 'beverages':
              items = [
                { text: 'Soda - Currently Available', value: 'item_soda' },
                { text: 'Beer - Currently Available', value: 'item_beer' },
                { text: 'Wine - Currently Available', value: 'item_wine' }
              ];
              break;
          }

          return {
            message: `Select items to mark as unavailable in ${category}:`,
            type: 'options',
            options: [
              ...items,
              { text: 'Back to categories', value: 'back_to_categories' },
              { text: 'Back to order management', value: 'back_to_orders' }
            ]
          };
        } else if (message.toLowerCase().includes('back_to_orders')) {
          context.currentStep = 'order_management';
          return this.conversationFlows.get('restaurant_orders').steps[
            'order_management'
          ];
        }
        break;

      case 'items_appetizers':
      case 'items_main':
      case 'items_desserts':
      case 'items_beverages':
        if (message.toLowerCase().includes('item_')) {
          const item = message.replace('item_', '').replace(/_/g, ' ');
          return {
            message: `✅ ${item} has been marked as unavailable. Customers will not be able to order this item until you mark it available again.`,
            type: 'options',
            options: [
              {
                text: 'Mark another item unavailable',
                value: 'back_to_categories'
              },
              { text: 'Back to order management', value: 'back_to_orders' }
            ]
          };
        } else if (message.toLowerCase().includes('back_to_categories')) {
          context.currentStep = 'mark_items_unavailable';
          return {
            message: 'Select menu category to update availability:',
            type: 'options',
            options: [
              { text: 'Appetizers', value: 'cat_appetizers' },
              { text: 'Main Dishes', value: 'cat_main' },
              { text: 'Desserts', value: 'cat_desserts' },
              { text: 'Beverages', value: 'cat_beverages' },
              { text: 'Back to order management', value: 'back_to_orders' }
            ]
          };
        } else if (message.toLowerCase().includes('back_to_orders')) {
          context.currentStep = 'order_management';
          return this.conversationFlows.get('restaurant_orders').steps[
            'order_management'
          ];
        }
        break;

      case 'handle_order_issue':
        if (message.toLowerCase().includes('issue_')) {
          const orderIdIssue = message.split('_').pop();
          context.currentStep = `order_issue_${orderIdIssue}`;
          return {
            message: `What issue are you experiencing with Order #${orderIdIssue}?`,
            type: 'options',
            options: [
              {
                text: 'Missing ingredients',
                value: `issue_ingredients_${orderIdIssue}`
              },
              {
                text: 'Equipment problem',
                value: `issue_equipment_${orderIdIssue}`
              },
              { text: 'Staff shortage', value: `issue_staff_${orderIdIssue}` },
              {
                text: 'Customer complaint',
                value: `issue_customer_${orderIdIssue}`
              },
              { text: 'Other issue', value: `issue_other_${orderIdIssue}` },
              {
                text: 'Back to order selection',
                value: 'back_to_issue_selection'
              }
            ]
          };
        } else if (message.toLowerCase().includes('back_to_orders')) {
          context.currentStep = 'order_management';
          return this.conversationFlows.get('restaurant_orders').steps[
            'order_management'
          ];
        }
        break;
    }

    // If we reach here, check for common navigation commands
    if (
      message.toLowerCase().includes('back_to_orders') ||
      message.toLowerCase() === 'back'
    ) {
      context.currentStep = 'order_management';
      return this.conversationFlows.get('restaurant_orders').steps[
        'order_management'
      ];
    }

    return this.completeFlow(
      context,
      'Your restaurant management request has been processed. Anything else I can help with?'
    );
  }

  private completeFlow(
    context: ConversationContext,
    message: string
  ): ChatbotResponse {
    context.currentFlow = undefined;
    context.currentStep = undefined;
    context.collectedData = {};

    const userHandler = this.userTypeHandlers.get(context.userType);

    return {
      message,
      type: 'options',
      options: userHandler?.mainMenu || [],
      followUpPrompt: 'Is there anything else I can help you with?'
    };
  }

  private shouldEscalate(
    context: ConversationContext,
    intent: Intent | null,
    message: string
  ): boolean {
    // Escalate if user explicitly requests human
    if (intent?.name === 'human_request') return true;

    // Escalate for complaints
    if (intent?.escalationTrigger) return true;

    // Escalate if user is frustrated (multiple escalation attempts)
    if (context.escalationCount >= 2) return true;

    // Escalate for negative sentiment with certain keywords
    if (
      context.sentiment === 'negative' &&
      (message.includes('manager') ||
        message.includes('supervisor') ||
        message.includes('complaint'))
    ) {
      return true;
    }

    // Escalate for drivers in emergency situations
    if (
      context.userType === Enum_UserType.DRIVER &&
      (message.includes('emergency') ||
        message.includes('accident') ||
        message.includes('urgent'))
    ) {
      return true;
    }

    return false;
  }

  private analyzeSentiment(
    message: string
  ): 'positive' | 'negative' | 'neutral' {
    const negativeWords = [
      'bad',
      'terrible',
      'awful',
      'hate',
      'angry',
      'frustrated',
      'disappointed',
      'worst',
      'horrible'
    ];
    const positiveWords = [
      'good',
      'great',
      'excellent',
      'amazing',
      'love',
      'fantastic',
      'wonderful',
      'perfect',
      'best'
    ];

    const lowerMessage = message.toLowerCase();
    const negativeCount = negativeWords.filter(word =>
      lowerMessage.includes(word)
    ).length;
    const positiveCount = positiveWords.filter(word =>
      lowerMessage.includes(word)
    ).length;

    if (negativeCount > positiveCount) return 'negative';
    if (positiveCount > negativeCount) return 'positive';
    return 'neutral';
  }

  private getDefaultResponse(context: ConversationContext): ChatbotResponse {
    const userHandler = this.userTypeHandlers.get(context.userType);

    // Check if user selected an option from main menu
    if (userHandler?.mainMenu) {
      const normalizedMessage = context.previousMessages[
        context.previousMessages.length - 1
      ]
        .toLowerCase()
        .trim();

      // Check if the message matches any menu option value or text
      const selectedOption = userHandler.mainMenu.find(
        option =>
          option.value.toLowerCase() === normalizedMessage ||
          option.text
            .toLowerCase()
            .replace(/[^\w\s]/gi, '')
            .includes(normalizedMessage)
      );

      if (selectedOption) {
        // Handle the selected option
        switch (selectedOption.value) {
          case 'vehicle_help':
            return {
              message: 'I can assist you with vehicle-related concerns.',
              type: 'text',
              followUpPrompt: 'How else can I assist you today?'
            };
          case 'navigation_help':
            return {
              message: 'I can help you with navigation and route optimization.',
              type: 'text',
              followUpPrompt: 'What specific navigation assistance do you need?'
            };
          case 'emergency':
            return {
              message:
                '🚨 This is an emergency support channel. What type of emergency?',
              type: 'options',
              options: [
                { text: 'Vehicle breakdown', value: 'breakdown' },
                { text: 'Accident', value: 'accident' },
                { text: 'Safety concern', value: 'safety' },
                { text: 'Medical emergency', value: 'medical' }
              ],
              priority: 'urgent',
              requiresHuman: true
            };
          case 'human_agent':
            return {
              message:
                "I'll connect you with a human representative right away! 👥",
              type: 'transfer',
              priority: 'medium',
              requiresHuman: true
            };
          // Restaurant owner menu options
          case 'manage_orders':
            return {
              message:
                'I can help you manage your restaurant orders. What would you like to do?',
              type: 'options',
              options: [
                { text: 'View pending orders', value: 'view_pending' },
                { text: 'Update preparation time', value: 'update_time' },
                { text: 'Mark items unavailable', value: 'mark_unavailable' },
                { text: 'Order issue', value: 'order_issue' }
              ]
            };
          case 'menu_management':
            return {
              message: 'Let me assist you with menu management.',
              type: 'options',
              options: [
                { text: 'Add new item', value: 'add_item' },
                { text: 'Update existing item', value: 'update_item' },
                { text: 'Remove item', value: 'remove_item' },
                { text: 'Change prices', value: 'change_prices' }
              ]
            };
          case 'view_analytics':
            return {
              message:
                "I can help you understand your restaurant's performance metrics.",
              type: 'options',
              options: [
                { text: 'Sales report', value: 'sales_report' },
                { text: 'Customer feedback', value: 'customer_feedback' },
                { text: 'Popular items', value: 'popular_items' },
                { text: 'Delivery statistics', value: 'delivery_stats' }
              ]
            };
          case 'restaurant_settings':
            return {
              message: 'What restaurant settings would you like to manage?',
              type: 'options',
              options: [
                { text: 'Update business hours', value: 'update_hours' },
                { text: 'Manage delivery zones', value: 'delivery_zones' },
                { text: 'Update contact info', value: 'update_contact' },
                { text: 'Change restaurant profile', value: 'update_profile' }
              ]
            };
          case 'business_support':
            return {
              message:
                'Here are some business support options for your restaurant:',
              type: 'options',
              options: [
                { text: 'Marketing tips', value: 'marketing_tips' },
                { text: 'Optimize menu', value: 'optimize_menu' },
                { text: 'Increase sales', value: 'increase_sales' },
                { text: 'Reduce costs', value: 'reduce_costs' }
              ]
            };
          // Add other option handlers as needed
        }
      }
    }

    return {
      message:
        "I'm not sure I understand. Let me show you what I can help you with:",
      type: 'options',
      options: this.validateMenuOptions(
        userHandler?.mainMenu || [
          { text: 'Talk to human', value: 'human_agent' }
        ]
      ),
      confidence: 0.1
    };
  }

  // Helper method to ensure menu options are correctly formatted
  private validateMenuOptions(options: Array<{ text: string; value: string }>) {
    if (!options) return options;

    // Deep clone to avoid modifying the original
    const validatedOptions = JSON.parse(JSON.stringify(options));

    // Check for and fix any double underscores in option values
    for (const option of validatedOptions) {
      if (option.value && option.value.includes('__')) {
        console.log(
          `DEBUG - Found double underscore in option value: ${option.value}`
        );
        option.value = option.value.replace(/__/g, '_');
        console.log(`DEBUG - Fixed to: ${option.value}`);
      }
    }

    return validatedOptions;
  }

  getGreeting(userType: Enum_UserType): ChatbotResponse {
    const userHandler = this.userTypeHandlers.get(userType);

    // Validate menu options before returning
    const validatedOptions = this.validateMenuOptions(
      userHandler?.mainMenu || []
    );

    return {
      message:
        userHandler?.welcomeMessage || 'Hello! How can I help you today?',
      type: 'options',
      options: validatedOptions,
      followUpPrompt:
        'Please select an option or tell me what you need help with.'
    };
  }

  // Analytics and insights
  getConversationAnalytics(userId: string): any {
    const context = this.contexts.get(userId);
    if (!context) return null;

    return {
      sessionDuration: Date.now() - context.sessionStartTime.getTime(),
      messageCount: context.previousMessages.length,
      escalationCount: context.escalationCount,
      lastSentiment: context.sentiment,
      userType: context.userType,
      completedFlows: context.collectedData
        ? Object.keys(context.collectedData)
        : []
    };
  }

  clearContext(userId: string): void {
    this.contexts.delete(userId);
  }

  // New method to handle option selection
  private isOptionSelection(
    message: string,
    context: ConversationContext
  ): boolean {
    // Check if we have a current flow and step
    if (!context.currentFlow || !context.currentStep) {
      return false;
    }

    // Get the current flow and step
    const flow = this.conversationFlows.get(context.currentFlow);
    if (!flow || !flow.steps || !flow.steps[context.currentStep]) {
      return false;
    }

    const step = flow.steps[context.currentStep];

    // Check if the step has options
    if (!step.options) {
      return false;
    }

    // Check if the message matches any option value or text
    const normalizedMessage = message.toLowerCase().trim();
    const cleanMessage = normalizedMessage.replace(/[^\w\s]/gi, '').trim();

    return step.options.some(option => {
      // Try exact value match first
      if (option.value.toLowerCase() === normalizedMessage) {
        return true;
      }

      // Try exact text match (with emojis)
      if (option.text.toLowerCase() === normalizedMessage) {
        return true;
      }

      // Try text match without emojis
      const cleanOptionText = option.text
        .toLowerCase()
        .replace(/[^\w\s]/gi, '')
        .trim();
      return (
        cleanOptionText === cleanMessage ||
        cleanMessage.includes(cleanOptionText)
      );
    });
  }

  // Add a new method to handle order tracking flow
  private handleOrderTrackingFlow(
    message: string,
    context: ConversationContext
  ): ChatbotResponse {
    switch (context.currentStep) {
      case 'get_order_id':
        // Simulate finding the order based on input
        const orderInfo = {
          id: 'ORD-12345',
          status: 'In Transit',
          estimatedDelivery: '7:45 PM',
          restaurant: 'Burger Joint',
          items: ['Double Cheeseburger', 'Fries', 'Soda'],
          driver: 'Michael',
          currentLocation: '3 blocks away'
        };

        context.currentStep = 'show_order_status';
        context.collectedData = { ...context.collectedData, orderInfo };

        return {
          message: `📦 Order #${orderInfo.id} Status: ${orderInfo.status}\n\nRestaurant: ${orderInfo.restaurant}\nItems: ${orderInfo.items.join(', ')}\nDriver: ${orderInfo.driver}\nCurrent Location: ${orderInfo.currentLocation}\nEstimated Delivery: ${orderInfo.estimatedDelivery}`,
          type: 'options',
          options: [
            { text: 'Get live location', value: 'live_location' },
            { text: 'Contact driver', value: 'contact_driver' },
            { text: 'Modify order', value: 'modify_order' },
            { text: 'Report issue', value: 'report_issue' },
            { text: 'Back to main menu', value: 'back_to_main' }
          ]
        };

      case 'show_order_status':
        if (message.toLowerCase().includes('live_location')) {
          context.currentStep = 'show_live_location';
          return {
            message:
              '🗺️ Live Location:\n\nYour driver is currently 3 blocks away on Main Street.\nEstimated arrival in 8 minutes.\n\nThe map link has been sent to your phone.',
            type: 'options',
            options: [
              { text: 'Refresh location', value: 'refresh_location' },
              { text: 'Contact driver', value: 'contact_driver' },
              { text: 'Back to order status', value: 'back_to_status' }
            ]
          };
        } else if (message.toLowerCase().includes('contact_driver')) {
          context.currentStep = 'contact_driver_options';
          return {
            message: '📱 Contact Driver Options:',
            type: 'options',
            options: [
              { text: 'Call driver', value: 'call_driver' },
              { text: 'Text driver', value: 'text_driver' },
              {
                text: 'Special delivery instructions',
                value: 'delivery_instructions'
              },
              { text: 'Back to order status', value: 'back_to_status' }
            ]
          };
        } else if (message.toLowerCase().includes('modify_order')) {
          context.currentStep = 'modify_order_options';
          return {
            message: '✏️ Modify Order Options:',
            type: 'options',
            options: [
              { text: 'Change delivery address', value: 'change_address' },
              { text: 'Add items', value: 'add_items' },
              { text: 'Remove items', value: 'remove_items' },
              { text: 'Cancel order', value: 'cancel_order' },
              { text: 'Back to order status', value: 'back_to_status' }
            ]
          };
        } else if (message.toLowerCase().includes('report_issue')) {
          context.currentStep = 'report_issue_options';
          return {
            message: '⚠️ Report Issue:',
            type: 'options',
            options: [
              { text: 'Order taking too long', value: 'delay_issue' },
              { text: 'Wrong address', value: 'address_issue' },
              { text: 'Payment problem', value: 'payment_issue' },
              { text: 'Other issue', value: 'other_issue' },
              { text: 'Back to order status', value: 'back_to_status' }
            ]
          };
        } else if (message.toLowerCase().includes('back_to_main')) {
          // Return to main menu
          context.currentFlow = undefined;
          context.currentStep = undefined;
          const userHandler = this.userTypeHandlers.get(context.userType);
          return {
            message: 'What else can I help you with today?',
            type: 'options',
            options: userHandler?.mainMenu || []
          };
        }
        break;

      case 'show_live_location':
        if (message.toLowerCase().includes('refresh')) {
          return {
            message:
              '🗺️ Updated Live Location:\n\nYour driver is currently 2 blocks away on Main Street.\nEstimated arrival in 5 minutes.\n\nThe map has been refreshed.',
            type: 'options',
            options: [
              { text: 'Refresh location', value: 'refresh_location' },
              { text: 'Contact driver', value: 'contact_driver' },
              { text: 'Back to order status', value: 'back_to_status' }
            ]
          };
        } else if (message.toLowerCase().includes('back_to_status')) {
          context.currentStep = 'show_order_status';
          const orderInfo = context.collectedData.orderInfo;
          return {
            message: `📦 Order #${orderInfo.id} Status: ${orderInfo.status}\n\nRestaurant: ${orderInfo.restaurant}\nItems: ${orderInfo.items.join(', ')}\nDriver: ${orderInfo.driver}\nCurrent Location: ${orderInfo.currentLocation}\nEstimated Delivery: ${orderInfo.estimatedDelivery}`,
            type: 'options',
            options: [
              { text: 'Get live location', value: 'live_location' },
              { text: 'Contact driver', value: 'contact_driver' },
              { text: 'Modify order', value: 'modify_order' },
              { text: 'Report issue', value: 'report_issue' },
              { text: 'Back to main menu', value: 'back_to_main' }
            ]
          };
        }
        break;

      case 'contact_driver_options':
        if (message.toLowerCase().includes('call_driver')) {
          return {
            message:
              '📞 Calling driver (Michael) at (555) 987-6543...\n\nPlease note that the driver may not answer if they are driving.',
            type: 'options',
            options: [
              {
                text: 'Back to contact options',
                value: 'back_to_contact_options'
              },
              { text: 'Back to order status', value: 'back_to_status' }
            ]
          };
        } else if (message.toLowerCase().includes('text_driver')) {
          return {
            message: '✉️ Send a text message to driver:',
            type: 'form',
            formFields: [
              {
                name: 'message',
                type: 'text',
                label: 'Message to Driver',
                required: true
              }
            ]
          };
        } else if (message.toLowerCase().includes('delivery_instructions')) {
          return {
            message: '📝 Add special delivery instructions:',
            type: 'form',
            formFields: [
              {
                name: 'instructions',
                type: 'text',
                label: 'Delivery Instructions',
                required: true
              }
            ]
          };
        } else if (message.toLowerCase().includes('back_to_status')) {
          context.currentStep = 'show_order_status';
          const orderInfo = context.collectedData.orderInfo;
          return {
            message: `📦 Order #${orderInfo.id} Status: ${orderInfo.status}\n\nRestaurant: ${orderInfo.restaurant}\nItems: ${orderInfo.items.join(', ')}\nDriver: ${orderInfo.driver}\nCurrent Location: ${orderInfo.currentLocation}\nEstimated Delivery: ${orderInfo.estimatedDelivery}`,
            type: 'options',
            options: [
              { text: 'Get live location', value: 'live_location' },
              { text: 'Contact driver', value: 'contact_driver' },
              { text: 'Modify order', value: 'modify_order' },
              { text: 'Report issue', value: 'report_issue' },
              { text: 'Back to main menu', value: 'back_to_main' }
            ]
          };
        }
        break;

      case 'modify_order_options':
        if (message.toLowerCase().includes('change_address')) {
          return {
            message: '🏠 Enter new delivery address:',
            type: 'form',
            formFields: [
              {
                name: 'address',
                type: 'text',
                label: 'New Address',
                required: true
              }
            ]
          };
        } else if (message.toLowerCase().includes('cancel_order')) {
          context.currentStep = 'confirm_cancel';
          return {
            message:
              '⚠️ Are you sure you want to cancel your order? Cancellation fees may apply.',
            type: 'options',
            options: [
              { text: 'Yes, cancel order', value: 'confirm_cancel' },
              { text: 'No, keep my order', value: 'keep_order' }
            ]
          };
        } else if (message.toLowerCase().includes('back_to_status')) {
          context.currentStep = 'show_order_status';
          const orderInfo = context.collectedData.orderInfo;
          return {
            message: `📦 Order #${orderInfo.id} Status: ${orderInfo.status}\n\nRestaurant: ${orderInfo.restaurant}\nItems: ${orderInfo.items.join(', ')}\nDriver: ${orderInfo.driver}\nCurrent Location: ${orderInfo.currentLocation}\nEstimated Delivery: ${orderInfo.estimatedDelivery}`,
            type: 'options',
            options: [
              { text: 'Get live location', value: 'live_location' },
              { text: 'Contact driver', value: 'contact_driver' },
              { text: 'Modify order', value: 'modify_order' },
              { text: 'Report issue', value: 'report_issue' },
              { text: 'Back to main menu', value: 'back_to_main' }
            ]
          };
        }
        break;

      case 'confirm_cancel':
        if (message.toLowerCase().includes('confirm_cancel')) {
          return {
            message:
              '✅ Your order has been cancelled. A confirmation email has been sent to your registered email address. Any applicable refund will be processed within 3-5 business days.',
            type: 'options',
            options: [
              { text: 'Back to main menu', value: 'back_to_main' },
              { text: 'Place new order', value: 'new_order' }
            ]
          };
        } else if (message.toLowerCase().includes('keep_order')) {
          context.currentStep = 'modify_order_options';
          return {
            message: '✏️ Modify Order Options:',
            type: 'options',
            options: [
              { text: 'Change delivery address', value: 'change_address' },
              { text: 'Add items', value: 'add_items' },
              { text: 'Remove items', value: 'remove_items' },
              { text: 'Cancel order', value: 'cancel_order' },
              { text: 'Back to order status', value: 'back_to_status' }
            ]
          };
        }
        break;

      case 'report_issue_options':
        // Handle various issue reports
        if (
          message.toLowerCase().includes('delay') ||
          message.toLowerCase().includes('address') ||
          message.toLowerCase().includes('payment') ||
          message.toLowerCase().includes('other')
        ) {
          return {
            message:
              '🙏 Thank you for reporting this issue. Our customer support team has been notified and will address this immediately. Would you like to:',
            type: 'options',
            options: [
              { text: 'Talk to customer support', value: 'talk_support' },
              { text: 'Get compensation options', value: 'compensation' },
              { text: 'Back to order status', value: 'back_to_status' }
            ]
          };
        } else if (message.toLowerCase().includes('back_to_status')) {
          context.currentStep = 'show_order_status';
          const orderInfo = context.collectedData.orderInfo;
          return {
            message: `📦 Order #${orderInfo.id} Status: ${orderInfo.status}\n\nRestaurant: ${orderInfo.restaurant}\nItems: ${orderInfo.items.join(', ')}\nDriver: ${orderInfo.driver}\nCurrent Location: ${orderInfo.currentLocation}\nEstimated Delivery: ${orderInfo.estimatedDelivery}`,
            type: 'options',
            options: [
              { text: 'Get live location', value: 'live_location' },
              { text: 'Contact driver', value: 'contact_driver' },
              { text: 'Modify order', value: 'modify_order' },
              { text: 'Report issue', value: 'report_issue' },
              { text: 'Back to main menu', value: 'back_to_main' }
            ]
          };
        }
        break;
    }

    // Handle common navigation commands
    if (message.toLowerCase().includes('back_to_status')) {
      context.currentStep = 'show_order_status';
      const orderInfo = context.collectedData.orderInfo;
      return {
        message: `📦 Order #${orderInfo.id} Status: ${orderInfo.status}\n\nRestaurant: ${orderInfo.restaurant}\nItems: ${orderInfo.items.join(', ')}\nDriver: ${orderInfo.driver}\nCurrent Location: ${orderInfo.currentLocation}\nEstimated Delivery: ${orderInfo.estimatedDelivery}`,
        type: 'options',
        options: [
          { text: 'Get live location', value: 'live_location' },
          { text: 'Contact driver', value: 'contact_driver' },
          { text: 'Modify order', value: 'modify_order' },
          { text: 'Report issue', value: 'report_issue' },
          { text: 'Back to main menu', value: 'back_to_main' }
        ]
      };
    } else if (message.toLowerCase().includes('back_to_main')) {
      // Return to main menu
      context.currentFlow = undefined;
      context.currentStep = undefined;
      const userHandler = this.userTypeHandlers.get(context.userType);
      return {
        message: 'What else can I help you with today?',
        type: 'options',
        options: userHandler?.mainMenu || []
      };
    }

    // Default response
    return this.completeFlow(
      context,
      'Your order tracking request has been processed. Anything else I can help with?'
    );
  }
}
