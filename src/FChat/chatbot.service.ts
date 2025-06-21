import { Injectable } from '@nestjs/common';

export interface ChatbotResponse {
  message: string;
  type: 'text' | 'options' | 'transfer';
  options?: string[];
  confidence?: number;
}

@Injectable()
export class ChatbotService {
  private responses: Map<string, ChatbotResponse> = new Map();
  private keywords: Map<string, string[]> = new Map();

  constructor() {
    this.initializeResponses();
    this.initializeKeywords();
  }

  private initializeResponses() {
    // Greeting responses
    this.responses.set('greeting', {
      message:
        "👋 Hello! Welcome to FlashFood! I'm here to help you. How can I assist you today?",
      type: 'options',
      options: [
        'What is FlashFood?',
        'How to order food?',
        'Contact support',
        'Account help',
        'Connect to human'
      ]
    });

    // About FlashFood
    this.responses.set('about', {
      message:
        '🍔 FlashFood is a fast food delivery app that connects you with local restaurants! Order your favorite meals and get them delivered quickly to your doorstep.',
      type: 'text'
    });

    // How to order
    this.responses.set('order', {
      message:
        '📱 To order food:\n1. Browse restaurants near you\n2. Select items from menu\n3. Add to cart\n4. Choose delivery address\n5. Make payment\n6. Track your order!\n\nNeed help with a specific step?',
      type: 'options',
      options: [
        'Payment issues',
        'Delivery problems',
        'Menu questions',
        'Connect to human'
      ]
    });

    // Contact support
    this.responses.set('support', {
      message:
        '📧 You can reach our support team at:\n\n✉️ Email: support@flashfood.com\n📞 Phone: +1-800-FLASH-FOOD\n\nOr I can connect you with a live agent right now!',
      type: 'options',
      options: ['Connect to human', 'Email support', 'Back to main menu']
    });

    // Account help
    this.responses.set('account', {
      message:
        '👤 Account related help:\n\n• Change password: Profile > Settings > Change Password\n• Update profile: Profile > Edit Profile\n• Payment methods: Profile > Payment Methods\n• Order history: Profile > My Orders',
      type: 'options',
      options: [
        'Password issues',
        'Profile updates',
        'Payment problems',
        'Connect to human'
      ]
    });

    // Password help
    this.responses.set('password', {
      message:
        '🔐 To change your password:\n1. Go to Profile\n2. Tap Settings\n3. Select "Change Password"\n4. Enter current and new password\n5. Save changes\n\nForgot your password? Use "Forgot Password" on login screen.',
      type: 'text'
    });

    // Payment help
    this.responses.set('payment', {
      message:
        '💳 Payment help:\n\n• We accept: Credit cards, PayPal, Apple Pay, Google Pay\n• Payment issues: Check card details and billing address\n• Refunds: Contact support for refund requests\n• Failed payments: Try a different payment method',
      type: 'options',
      options: [
        'Refund request',
        'Payment failed',
        'Add payment method',
        'Connect to human'
      ]
    });

    // Delivery help
    this.responses.set('delivery', {
      message:
        '🚚 Delivery information:\n\n• Average delivery time: 20-45 minutes\n• Track your order in real-time\n• Delivery fee varies by distance\n• Contact driver directly for updates',
      type: 'options',
      options: [
        'Track order',
        'Delivery delay',
        'Contact driver',
        'Connect to human'
      ]
    });

    // Transfer to human
    this.responses.set('transfer', {
      message:
        "🔄 I'll connect you with one of our customer care representatives. Please hold on...",
      type: 'transfer'
    });

    // Default response
    this.responses.set('default', {
      message:
        "🤔 I'm not sure about that. Let me help you with some common topics:",
      type: 'options',
      options: [
        'What is FlashFood?',
        'How to order food?',
        'Contact support',
        'Account help',
        'Connect to human'
      ]
    });
  }

  private initializeKeywords() {
    this.keywords.set('greeting', [
      'hi',
      'hello',
      'hey',
      'good morning',
      'good afternoon',
      'good evening',
      'start'
    ]);
    this.keywords.set('about', [
      'what is',
      'about',
      'flashfood',
      'app',
      'service',
      'company'
    ]);
    this.keywords.set('order', [
      'order',
      'food',
      'delivery',
      'restaurant',
      'menu',
      'cart',
      'buy'
    ]);
    this.keywords.set('support', [
      'support',
      'help',
      'contact',
      'email',
      'phone',
      'customer service'
    ]);
    this.keywords.set('account', [
      'account',
      'profile',
      'settings',
      'personal',
      'user'
    ]);
    this.keywords.set('password', [
      'password',
      'login',
      'forgot',
      'change password',
      'reset'
    ]);
    this.keywords.set('payment', [
      'payment',
      'card',
      'paypal',
      'billing',
      'money',
      'refund',
      'charge'
    ]);
    this.keywords.set('delivery', [
      'delivery',
      'driver',
      'track',
      'time',
      'location',
      'address'
    ]);
    this.keywords.set('transfer', [
      'human',
      'agent',
      'representative',
      'person',
      'talk to someone'
    ]);
  }

  getResponse(userMessage: string): ChatbotResponse {
    const message = userMessage.toLowerCase().trim();

    // Check for exact option matches first
    const optionMatches = this.checkOptionMatches(message);
    if (optionMatches) {
      return optionMatches;
    }

    // Check for keyword matches
    let bestMatch = 'default';
    let highestScore = 0;

    for (const [responseKey, keywords] of this.keywords.entries()) {
      const score = this.calculateKeywordScore(message, keywords);
      if (score > highestScore && score > 0.3) {
        // Minimum threshold
        highestScore = score;
        bestMatch = responseKey;
      }
    }

    return this.responses.get(bestMatch) || this.responses.get('default')!;
  }

  private checkOptionMatches(message: string): ChatbotResponse | null {
    const optionMap: { [key: string]: string } = {
      'what is flashfood': 'about',
      'what is flashfood?': 'about',
      'how to order food': 'order',
      'how to order food?': 'order',
      'contact support': 'support',
      'account help': 'account',
      'connect to human': 'transfer',
      'payment issues': 'payment',
      'delivery problems': 'delivery',
      'menu questions': 'order',
      'password issues': 'password',
      'profile updates': 'account',
      'payment problems': 'payment',
      'email support': 'support',
      'back to main menu': 'greeting',
      'refund request': 'payment',
      'payment failed': 'payment',
      'add payment method': 'payment',
      'track order': 'delivery',
      'delivery delay': 'delivery',
      'contact driver': 'delivery'
    };

    const responseKey = optionMap[message];
    return responseKey ? this.responses.get(responseKey) || null : null;
  }

  private calculateKeywordScore(message: string, keywords: string[]): number {
    let score = 0;
    const messageWords = message.split(' ');

    for (const keyword of keywords) {
      if (message.includes(keyword)) {
        // Exact phrase match gets higher score
        score += keyword.split(' ').length * 0.3;
      } else {
        // Check for individual word matches
        const keywordWords = keyword.split(' ');
        let wordMatches = 0;
        for (const keywordWord of keywordWords) {
          if (messageWords.includes(keywordWord)) {
            wordMatches++;
          }
        }
        if (wordMatches > 0) {
          score += (wordMatches / keywordWords.length) * 0.1;
        }
      }
    }

    return score;
  }

  getGreeting(): ChatbotResponse {
    return this.responses.get('greeting')!;
  }
}
