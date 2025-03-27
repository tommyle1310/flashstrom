import { Module } from '@nestjs/common';
import { OnlineSessionsService } from './online-sessions.service';
import { OnlineSessionsController } from './online-sessions.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnlineSession } from './entities/online-session.entity';
import { OnlineSessionsRepository } from './online-session.repository';

@Module({
  imports: [TypeOrmModule.forFeature([OnlineSession])],
  controllers: [OnlineSessionsController],
  providers: [OnlineSessionsService, OnlineSessionsRepository]
})
export class OnlineSessionsModule {}
