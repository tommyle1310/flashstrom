import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  WsException
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { AdminChatbotService, AdminBotResponse } from './admin_chatbot.service';
import { Logger } from '@nestjs/common';
import { AdminRole } from 'src/utils/types/admin';

@WebSocketGateway({
  namespace: 'admin-chat',
  cors: {
    origin: ['*', 'http://localhost:3000', 'http://localhost:1310'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Authorization', 'auth', 'Content-Type']
  },
  transports: ['websocket', 'polling']
})
export class AdminChatbotGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AdminChatbotGateway.name);
  private adminSockets = new Map<string, Socket>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly adminChatbotService: AdminChatbotService
  ) {}

  async handleConnection(client: Socket) {
    try {
      console.log('check client', client.handshake.headers.auth);
      const userData = await this.validateAdminToken(client);
      if (!userData) {
        client.disconnect();
        return;
      }

      client.data.admin = userData;
      this.adminSockets.set(userData.id, client);
      await client.join(`admin_${userData.id}`);

      this.logger.log(`Admin ${userData.id} connected to chatbot`);

      // Send welcome message
      client.emit('adminBotResponse', {
        content:
          "Hello Admin! I'm your assistant. Type 'help' to see available commands, 'check order' to look up orders, or ask me anything.",
        type: 'TEXT'
      });
    } catch (error) {
      this.logger.error('Connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const adminId = client.data.admin?.id;
    if (adminId) {
      this.adminSockets.delete(adminId);
      this.logger.log(`Admin ${adminId} disconnected from chatbot`);
    }
  }

  @SubscribeMessage('adminMessage')
  async handleAdminMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { message: string }
  ) {
    try {
      const admin = client.data.admin;
      if (!admin) {
        throw new WsException('Unauthorized');
      }
      const { message } = data;
      if (!message || message.trim().length === 0) {
        client.emit('adminBotResponse', {
          content: 'Please enter a valid message.',
          type: 'TEXT'
        });
        return;
      }

      this.logger.log(`Admin ${admin.id} sent message: ${message}`);

      // Process the message through the chatbot service
      const response: AdminBotResponse =
        await this.adminChatbotService.processAdminInput(
          admin.id,
          message.trim()
        );

      // Emit the response back to the admin
      client.emit('adminBotResponse', response);

      this.logger.log(
        `Bot responded to admin ${admin.id} with type: ${response.type}`
      );
    } catch (error) {
      this.logger.error('Error handling admin message:', error);
      client.emit('adminBotResponse', {
        content: 'Sorry, I encountered an error processing your request.',
        type: 'TEXT'
      });
    }
  }

  @SubscribeMessage('nextStep')
  async handleNextStep(@ConnectedSocket() client: Socket) {
    try {
      const admin = client.data.admin;
      if (!admin) {
        throw new WsException('Unauthorized');
      }

      const response = await this.adminChatbotService.nextGuideStep(admin.id);

      if (response) {
        client.emit('adminBotResponse', response);
      } else {
        client.emit('adminBotResponse', {
          content: 'No guide in progress. How can I help you?',
          type: 'TEXT'
        });
      }
    } catch (error) {
      this.logger.error('Error handling next step:', error);
      client.emit('adminBotResponse', {
        content: 'Error advancing to next step.',
        type: 'TEXT'
      });
    }
  }

  @SubscribeMessage('resetSession')
  async handleResetSession(@ConnectedSocket() client: Socket) {
    try {
      const admin = client.data.admin;
      if (!admin) {
        throw new WsException('Unauthorized');
      }

      await this.adminChatbotService.resetSession(admin.id);

      client.emit('adminBotResponse', {
        content: 'Session reset. How can I help you?',
        type: 'TEXT'
      });
    } catch (error) {
      this.logger.error('Error resetting session:', error);
      client.emit('adminBotResponse', {
        content: 'Error resetting session.',
        type: 'TEXT'
      });
    }
  }

  @SubscribeMessage('getHelp')
  async handleGetHelp(@ConnectedSocket() client: Socket) {
    try {
      const helpResponse = await this.adminChatbotService.getHelp();

      client.emit('adminBotResponse', helpResponse);
    } catch (error) {
      this.logger.error('Error getting help:', error);
      client.emit('adminBotResponse', {
        content: 'Error loading help menu.',
        type: 'TEXT'
      });
    }
  }

  private async validateAdminToken(client: Socket): Promise<any> {
    try {
      let authHeader = client.handshake.headers.auth as string;
      if (!authHeader && client.handshake.auth && client.handshake.auth.token) {
        authHeader = client.handshake.auth.token;
      }

      if (!authHeader?.startsWith('Bearer ')) {
        return null;
      }

      const token = authHeader.slice(7);
      if (!token) {
        return null;
      }

      const decoded = await this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET
      });
      console.log('check decoded', decoded);
      // Verify this is an admin user
      if (
        decoded.logged_in_as !== AdminRole.SUPER_ADMIN &&
        decoded.logged_in_as !== AdminRole.COMPANION_ADMIN &&
        decoded.logged_in_as !== AdminRole.FINANCE_ADMIN
      ) {
        this.logger.warn(`Non-admin user attempted to connect: ${decoded.id}`);
        return null;
      }

      return decoded;
    } catch (error) {
      this.logger.error('Token validation error:', error);
      return null;
    }
  }

  // Method to send message to specific admin (for server-driven responses)
  async sendToAdmin(
    adminId: string,
    response: AdminBotResponse
  ): Promise<void> {
    const adminSocket = this.adminSockets.get(adminId);
    if (adminSocket) {
      adminSocket.emit('adminBotResponse', response);
    }
  }

  // Method to broadcast to all connected admins
  async broadcastToAllAdmins(response: AdminBotResponse): Promise<void> {
    this.server.emit('adminBotResponse', response);
  }
}

// const rioteAccounts = [
//   {name: 'abc', age: 18, cccd: 1, password: 'porm'},
//   {name: 'thomas', age: 1, cccd: 2, password: '12'},
//   {name: 'Chuakiet', age: 291, cccd: 11, password: 'jdsfds'},
// ]

// class riotAccount {
//   private readonly name: string;
//   private  password: string ;
//   private readonly age: number;
//   private readonly cccd: number;
//     constructor(public readonly inputName: {name: string}, public readonly ageInput: number, cccd?: number) {
//       this.name = inputName.name;
//       this.age = ageInput
//       this.cccd = cccd
//     }

//     public  takePassword() {
//       if (rioteAccounts.find(account => account.cccd === this.cccd)) {
//         this.password = rioteAccounts.find(account => account.cccd === this.cccd).password
//         return this.password
//       }
//       return 'forbnidden, may lua dao'
//     }
// }

// const pornAcc = new riotAccount({name: 'abc'}, 18, 1)
// const pornPassword = pornAcc.takePassword()

// const nameOfPornAcc = pornAcc.takePassword()

// const mornWantToStealPornAcc = new riotAccount({name: 'abcd'}, 18)
// const mornRetrievePornPass = mornWantToStealPornAcc.password

// class PornGiaPha {
//   public readonly skinColor: string
//   constructor(public readonly inputPuskinColor: string) {
//     this.skinColor = inputPuskinColor
//   }

//   private getPuskinColor() {
//     return this.skinColor
// }
// }
// class PornJunior extends PornGiaPha {
//   skinCon: string
//   constructor() {
//     super()
//   }

// }

// const pornJunior = new PornJunior()
// const pornJuniorPuskinColor = pornJunior.getPuskinColor()
