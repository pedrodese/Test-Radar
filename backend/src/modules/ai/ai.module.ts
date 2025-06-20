import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AIService } from './ai.service';
import { Process } from 'src/core/entities/process.entity';
import { AIInsight } from 'src/core/entities/ai-insight.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Process, AIInsight]),
    ConfigModule
  ],
  providers: [AIService],
  exports: [AIService]
})
export class AIModule {} 