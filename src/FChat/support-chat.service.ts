import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RedisService } from 'src/redis/redis.service';

export interface SupportSession {
  sessionId: string;
  userId: string;
  userType: string;
  agentId?: string;
  status: 'waiting' | 'active' | 'ended';
  startTime: Date;
  endTime?: Date;
  chatMode: 'bot' | 'human';
}

export interface QueueItem {
  sessionId: string;
  userId: string;
  userType: string;
  priority: number;
  timestamp: Date;
}

@Injectable()
export class SupportChatService {
  private activeSessions = new Map<string, SupportSession>();
  private supportQueue: QueueItem[] = [];
  private availableAgents = new Set<string>();

  constructor(
    private eventEmitter: EventEmitter2,
    private redisService: RedisService
  ) {}

  // Start a new support session
  async startSupportSession(
    userId: string,
    userType: string
  ): Promise<SupportSession> {
    const sessionId = `support_${userId}_${Date.now()}`;

    const session: SupportSession = {
      sessionId,
      userId,
      userType,
      status: 'waiting',
      startTime: new Date(),
      chatMode: 'bot' // Start with bot
    };

    // Save session
    this.activeSessions.set(sessionId, session);
    await this.redisService.set(
      `support_session:${sessionId}`,
      JSON.stringify(session),
      3600 * 1000 // 1 hour TTL
    );

    return session;
  }

  // Request human agent
  async requestHumanAgent(sessionId: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;

    // Check if agent is available
    const availableAgent = this.getNextAvailableAgent();

    if (availableAgent) {
      // Assign agent immediately
      session.agentId = availableAgent;
      session.status = 'active';
      session.chatMode = 'human';

      this.activeSessions.set(sessionId, session);
      await this.redisService.set(
        `support_session:${sessionId}`,
        JSON.stringify(session),
        3600 * 1000
      );

      // Notify agent
      this.eventEmitter.emit('agentAssigned', {
        sessionId,
        userId: session.userId,
        agentId: availableAgent,
        userType: session.userType
      });

      return true;
    } else {
      // Add to queue
      const queueItem: QueueItem = {
        sessionId,
        userId: session.userId,
        userType: session.userType,
        priority: this.calculatePriority(session.userType),
        timestamp: new Date()
      };

      this.supportQueue.push(queueItem);
      this.supportQueue.sort((a, b) => b.priority - a.priority); // Higher priority first

      // Update session
      session.chatMode = 'human';
      this.activeSessions.set(sessionId, session);

      await this.redisService.set(
        `support_session:${sessionId}`,
        JSON.stringify(session),
        3600 * 1000
      );

      return false; // In queue
    }
  }

  // Agent becomes available
  async agentAvailable(agentId: string): Promise<void> {
    this.availableAgents.add(agentId);

    // Check if there are users in queue
    if (this.supportQueue.length > 0) {
      const nextUser = this.supportQueue.shift()!;
      const session = this.activeSessions.get(nextUser.sessionId);

      if (session) {
        session.agentId = agentId;
        session.status = 'active';

        this.activeSessions.set(nextUser.sessionId, session);
        this.availableAgents.delete(agentId);

        await this.redisService.set(
          `support_session:${nextUser.sessionId}`,
          JSON.stringify(session),
          3600 * 1000
        );

        // Notify both user and agent
        this.eventEmitter.emit('agentAssigned', {
          sessionId: nextUser.sessionId,
          userId: nextUser.userId,
          agentId,
          userType: nextUser.userType
        });
      }
    }
  }

  // Agent becomes unavailable
  agentUnavailable(agentId: string): void {
    this.availableAgents.delete(agentId);
  }

  // End support session
  async endSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    session.status = 'ended';
    session.endTime = new Date();

    // Make agent available again
    if (session.agentId) {
      this.availableAgents.add(session.agentId);
    }

    // Remove from active sessions
    this.activeSessions.delete(sessionId);

    // Save final session state
    await this.redisService.set(
      `support_session_ended:${sessionId}`,
      JSON.stringify(session),
      86400 * 1000 // Keep for 24 hours
    );

    // Remove active session
    await this.redisService.del(`support_session:${sessionId}`);

    // Emit session ended event
    this.eventEmitter.emit('sessionEnded', {
      sessionId,
      userId: session.userId,
      agentId: session.agentId,
      duration: session.endTime.getTime() - session.startTime.getTime()
    });
  }

  // Get session info
  getSession(sessionId: string): SupportSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  // Get user's active session
  getUserActiveSession(userId: string): SupportSession | undefined {
    for (const session of this.activeSessions.values()) {
      if (session.userId === userId && session.status !== 'ended') {
        return session;
      }
    }
    return undefined;
  }

  // Switch chat mode (bot <-> human)
  async switchChatMode(
    sessionId: string,
    mode: 'bot' | 'human'
  ): Promise<boolean> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;

    if (mode === 'human') {
      return await this.requestHumanAgent(sessionId);
    } else {
      // Switch back to bot
      session.chatMode = 'bot';
      if (session.agentId) {
        this.availableAgents.add(session.agentId);
        session.agentId = undefined;
      }

      this.activeSessions.set(sessionId, session);
      await this.redisService.set(
        `support_session:${sessionId}`,
        JSON.stringify(session),
        3600 * 1000
      );

      return true;
    }
  }

  // Get queue status
  getQueueStatus(): { position: number; estimatedWait: number } {
    return {
      position: this.supportQueue.length,
      estimatedWait: this.supportQueue.length * 2 // 2 minutes per user estimate
    };
  }

  // Get available agents count
  getAvailableAgentsCount(): number {
    return this.availableAgents.size;
  }

  private getNextAvailableAgent(): string | undefined {
    const agents = Array.from(this.availableAgents);
    if (agents.length > 0) {
      const agent = agents[0];
      this.availableAgents.delete(agent);
      return agent;
    }
    return undefined;
  }

  private calculatePriority(userType: string): number {
    // Higher priority for certain user types
    const priorityMap: { [key: string]: number } = {
      CUSTOMER: 1,
      DRIVER: 2,
      RESTAURANT_OWNER: 2,
      ADMIN: 3
    };
    return priorityMap[userType] || 1;
  }

  // Initialize from Redis on startup
  async initializeFromRedis(): Promise<void> {
    try {
      // Use Redis client directly to scan for keys
      await this.redisService.connect();
      const client = this.redisService.getClient();
      const keys = await client.keys('support_session:*');

      for (const key of keys) {
        const sessionData = await this.redisService.get(key);
        if (sessionData) {
          const session: SupportSession = JSON.parse(sessionData);
          this.activeSessions.set(session.sessionId, session);
        }
      }
    } catch (error) {
      console.error('Error initializing support sessions from Redis:', error);
    }
  }
}
