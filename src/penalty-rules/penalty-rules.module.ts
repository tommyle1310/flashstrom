import { Module } from '@nestjs/common';
import { PenaltyRulesService } from './penalty-rules.service';
import { PenaltyRulesController } from './penalty-rules.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Penalty } from 'src/penalties/entities/penalty.entity';
import { PenaltyRulesRepository } from './penalty-rules.repository';
import { PenaltyRule } from './entities/penalty-rule.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Penalty, PenaltyRule])],
  controllers: [PenaltyRulesController],
  providers: [PenaltyRulesService, PenaltyRulesRepository]
})
export class PenaltyRulesModule {}
