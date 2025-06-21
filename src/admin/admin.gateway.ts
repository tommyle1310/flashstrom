import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  namespace: 'admin',
  cors: {
    origin: ['*', process.env.FULL_BACKEND_URL],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket']
})
export class AdminGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AdminGateway.name);
  private isListenerRegistered = false; // Track listener status

  constructor(
    private readonly jwtService: JwtService,
    private readonly eventEmitter: EventEmitter2
  ) {
    this.logger.log('AdminGateway initialized');
  }

  afterInit() {
    this.logger.log('AdminGateway afterInit called');

    // Check and cleanup old listeners
    const listenerCount = this.eventEmitter.listenerCount(
      'newly_created_entity_notification'
    );
    this.logger.log(
      `Current newly_created_entity_notification listeners: ${listenerCount}`
    );
    if (listenerCount > 1) {
      this.logger.warn('Multiple listeners detected, removing all');
      this.eventEmitter.removeAllListeners('newly_created_entity_notification');
    }

    // Register listener only once
    if (!this.isListenerRegistered) {
      this.eventEmitter.on(
        'newly_created_entity_notification',
        this.handleNewlyCreatedEntityNotification.bind(this)
      );
      this.isListenerRegistered = true;
      this.logger.log(
        'Registered listener for newly_created_entity_notification'
      );
    }

    this.server.setMaxListeners(300);
  }

  async onModuleDestroy() {
    this.eventEmitter.removeListener(
      'newly_created_entity_notification',
      this.handleNewlyCreatedEntityNotification.bind(this)
    );
    this.isListenerRegistered = false;
    this.logger.log('Removed listener for newly_created_entity_notification');
  }

  private async validateToken(client: Socket): Promise<any> {
    try {
      const authHeader = client.handshake.auth?.token as string;
      if (!authHeader?.startsWith('Bearer ')) {
        this.logger.error('Invalid token format');
        client.disconnect();
        return null;
      }

      const token = authHeader.slice(7);
      if (!token) {
        this.logger.error('No token provided');
        client.disconnect();
        return null;
      }

      const decoded = await this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET
      });

      // Verify that the user has admin privileges
      const userType = decoded.logged_in_as;
      const adminTypes = ['SUPER_ADMIN', 'FINANCE_ADMIN', 'COMPANION_ADMIN'];

      if (!adminTypes.includes(userType)) {
        this.logger.error(`Unauthorized user type: ${userType}`);
        client.disconnect();
        return null;
      }

      return decoded;
    } catch (error: any) {
      this.logger.error('Token validation error:', error.message);
      client.disconnect();
      return null;
    }
  }

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected to admin namespace: ${client.id}`);
    const adminData = await this.validateToken(client);
    if (!adminData) return;

    const adminId = adminData.id;
    if (adminId) {
      client.join(`admin_${adminId}`);
      client.join('admin_global'); // Join global admin room for broadcasts
      this.logger.log(
        `Admin auto-joined admin_${adminId} and admin_global via token`
      );
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from admin namespace: ${client.id}`);
  }

  @OnEvent('newly_created_entity_notification')
  async handleNewlyCreatedEntityNotification(@MessageBody() data: any) {
    this.logger.log('Received newly_created_entity_notification:', data);
    try {
      const entityName = data.entity_name;
      if (!entityName) {
        this.logger.error('Missing entity_name in notification data:', data);
        return;
      }

      const notificationPayload = {
        entity_name: entityName,
        timestamp: Math.floor(Date.now() / 1000),
        message: `New ${entityName} has been created`,
        event_type: 'newly_created_entity_notification'
      };

      // Emit to all connected admins in the global room
      await this.server
        .to('admin_global')
        .emit('newly_created_entity_notification', notificationPayload);

      this.logger.log(
        `Emitted newly_created_entity_notification to admin_global for entity: ${entityName}`
      );

      return {
        event: 'newly_created_entity_notification',
        data: notificationPayload,
        message: `Notified all admins about new ${entityName}`
      };
    } catch (error) {
      this.logger.error(
        'Error in handleNewlyCreatedEntityNotification:',
        error
      );
    }
  }

  @SubscribeMessage('joinAdminRoom')
  async handleJoinAdminRoom(
    client: Socket,
    @MessageBody() data: { room: string }
  ) {
    const adminData = await this.validateToken(client);
    if (!adminData) return;

    try {
      await client.join(data.room);
      this.logger.log(`Admin ${adminData.id} joined room: ${data.room}`);

      return {
        event: 'joinAdminRoom',
        success: true,
        message: `Successfully joined ${data.room}`
      };
    } catch (error) {
      this.logger.error('Error joining admin room:', error);
      return {
        event: 'joinAdminRoom',
        success: false,
        message: 'Failed to join room'
      };
    }
  }

  @SubscribeMessage('leaveAdminRoom')
  async handleLeaveAdminRoom(
    client: Socket,
    @MessageBody() data: { room: string }
  ) {
    const adminData = await this.validateToken(client);
    if (!adminData) return;

    try {
      await client.leave(data.room);
      this.logger.log(`Admin ${adminData.id} left room: ${data.room}`);

      return {
        event: 'leaveAdminRoom',
        success: true,
        message: `Successfully left ${data.room}`
      };
    } catch (error) {
      this.logger.error('Error leaving admin room:', error);
      return {
        event: 'leaveAdminRoom',
        success: false,
        message: 'Failed to leave room'
      };
    }
  }
}
