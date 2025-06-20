import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { Process } from '../../core/entities/process.entity';
import { AIInsight } from '../../core/entities/ai-insight.entity';
import { AIModule } from '../ai/ai.module';
import { CommonModule } from '../../common/common.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Process, AIInsight]),
    AIModule,
    CommonModule,
    EventsModule
  ],
  controllers: [WebhookController],
  providers: [WebhookService],
  exports: [WebhookService]
})
export class WebhookModule {} 