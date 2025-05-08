import { Module } from '@nestjs/common';
import { FAQsService } from './faq.service';
import { FAQsController } from './faq.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FAQ } from './entities/faq.entity';
import { FAQsRepository } from './faq.repository';

@Module({
  imports: [TypeOrmModule.forFeature([FAQ])],
  controllers: [FAQsController],
  providers: [FAQsService, FAQsRepository]
})
export class FaqModule {}
