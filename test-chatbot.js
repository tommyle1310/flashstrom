// Simple chatbot test script
// Run with: node test-chatbot.js

const { io } = require('socket.io-client');

// Configuration
const SERVER_URL = 'http://localhost:3000';
const USER_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Replace with actual token

class ChatbotTester {
  constructor() {
    this.socket = null;
    this.sessionId = null;
  }

  connect() {
    console.log('🔌 Connecting to chat server...');

    this.socket = io(`${SERVER_URL}/chat`, {
      auth: {
        token: `Bearer ${USER_TOKEN}`
      },
      transports: ['websocket']
    });

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.socket.on('connect', () => {
      console.log('✅ Connected to server');
      console.log('📞 Starting support chat...');
      this.socket.emit('startSupportChat');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
    });

    this.socket.on('supportChatStarted', data => {
      console.log('🎉 Support chat started:', data);
      this.sessionId = data.sessionId;

      // Start testing bot responses
      this.runTests();
    });

    this.socket.on('chatbotMessage', data => {
      console.log('\n🤖 Bot Response:');
      console.log('   Message:', data.message);
      console.log('   Type:', data.type);
      if (data.options) {
        console.log('   Options:', data.options);
      }
      console.log('   Time:', new Date(data.timestamp).toLocaleTimeString());
    });

    this.socket.on('userMessage', data => {
      console.log('\n👤 User sent:', data.message);
    });

    this.socket.on('error', error => {
      console.error('❌ Error:', error);
    });
  }

  sendMessage(message) {
    if (!this.sessionId) {
      console.error('❌ No active session');
      return;
    }

    console.log(`\n📤 Sending: "${message}"`);
    this.socket.emit('sendSupportMessage', {
      sessionId: this.sessionId,
      message: message
    });
  }

  async runTests() {
    console.log('\n🧪 Starting chatbot tests...\n');

    const tests = [
      'hello',
      'What is FlashFood?',
      'How to order food?',
      'change password',
      'contact support',
      'payment issues',
      'delivery problems',
      'random question that bot doesnt know',
      'Connect to human'
    ];

    for (let i = 0; i < tests.length; i++) {
      await this.delay(3000); // Wait 3 seconds between tests
      this.sendMessage(tests[i]);
    }

    // End session after all tests
    setTimeout(() => {
      console.log('\n🏁 Ending test session...');
      this.socket.emit('endSupportSession', { sessionId: this.sessionId });
      setTimeout(() => process.exit(0), 2000);
    }, 30000);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Instructions
console.log('='.repeat(60));
console.log('🤖 FlashFood Chatbot Tester');
console.log('='.repeat(60));
console.log('');
console.log('SETUP INSTRUCTIONS:');
console.log('1. Make sure your backend is running: npm run start:dev');
console.log('2. Replace USER_TOKEN with a valid JWT token');
console.log('3. Run this script: node test-chatbot.js');
console.log('');

// Check if token is set
if (USER_TOKEN === 'YOUR_JWT_TOKEN_HERE') {
  console.log('❌ ERROR: Please set a valid JWT token in USER_TOKEN');
  console.log('   Get a token by logging in to your app first');
  process.exit(1);
}

// Start the test
const tester = new ChatbotTester();
tester.connect();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down test...');
  process.exit(0);
});
