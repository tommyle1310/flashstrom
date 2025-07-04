import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DataSeedingService } from './data-seeding.service';

@Injectable()
export class StartupService implements OnApplicationBootstrap {
  private readonly logger = new Logger(StartupService.name);

  constructor(private readonly dataSeedingService: DataSeedingService) {}

  async onApplicationBootstrap(): Promise<void> {
    this.logger.log('🚀 Checking data sufficiency before starting server...');

    try {
      // Check if we have sufficient data
      const isDataSufficient =
        await this.dataSeedingService.checkDataSufficiency();

      if (!isDataSufficient) {
        this.logger.warn(
          '❌ Insufficient data found. Starting data seeding...'
        );
        await this.dataSeedingService.seedAllData();

        // Verify seeding was successful
        const isNowSufficient =
          await this.dataSeedingService.checkDataSufficiency();

        if (isNowSufficient) {
          this.logger.log('✅ Data seeding completed successfully!');
        } else {
          this.logger.error(
            '❌ Data seeding failed. Server may not function properly.'
          );
        }
      } else {
        this.logger.log('✅ Sufficient data found. Server ready to start.');
      }

      this.logger.log('🎯 Admin Chatbot System initialized and ready!');
      this.logger.log('📡 Socket.IO namespace: /admin-chat');
      this.logger.log(
        '🔧 Available events: adminMessage, nextStep, resetSession, getHelp'
      );
    } catch (error) {
      this.logger.error('❌ Error during startup data check:', error);
      throw error;
    }
  }
}
