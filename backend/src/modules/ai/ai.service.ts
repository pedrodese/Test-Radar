import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';
import { Process } from '../../core/entities/process.entity';
import { AIInsight } from '../../core/entities/ai-insight.entity';
import { InsightType } from '../../common/enums/insight-type.enum';
import { PROCESS_CONSTANTS } from '../../common/constants/process.constants';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private openai: OpenAI;

  constructor(
    @InjectRepository(Process)
    private processRepository: Repository<Process>,
    @InjectRepository(AIInsight)
    private aiInsightRepository: Repository<AIInsight>,
    private configService: ConfigService
  ) {
    const apiKey = this.configService.get<string>('app.openai.apiKey');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async predictProcessCompletion(process: Process): Promise<AIInsight> {
    this.logger.log(`Predicting completion for process ${process.id}`);

    try {
      if (!this.openai) {
        return this.generateFallbackPrediction(process);
      }

      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are an AI assistant specialized in maintenance process time prediction.
            Analyze the process data and provide a concise prediction in this format:
            "Predicted completion: X hours. Risk level: LOW/MEDIUM/HIGH. Reason: brief explanation"
            Keep response under 100 characters.`
          },
          {
            role: "user",
            content: `Analyze this maintenance process:
              Process ID: ${process.id}
              Current Stage: ${process.currentStage}
              Type: ${process.type}
              Vehicle ID: ${process.vehicleId}
              Stage Times: ${this.getStageTimes(process)}
              SLA Remaining: ${this.getSLARemaining(process)}`
          }
        ],
        temperature: 0.3,
        max_tokens: 100
      });

      const aiResponse = completion.choices[0].message.content || 'Unable to generate prediction.';

      const insight = new AIInsight();
      insight.type = InsightType.PREDICTION;
      insight.confidence = this.calculateConfidence(process);
      insight.message = aiResponse;
      insight.processId = process.id;
      insight.timestamp = new Date();

      await this.aiInsightRepository.save(insight);
      return insight;

    } catch (error) {
      this.logger.error(`Error calling OpenAI: ${error.message}`);
      return this.generateFallbackPrediction(process);
    }
  }

  private getStageTimes(process: Process): string {
    const stageTimes = {};
    Object.entries(process.stages).forEach(([stage, stageInfo]) => {
      if (stageInfo.startTime) {
        const elapsed = (Date.now() - new Date(stageInfo.startTime).getTime()) / 1000;
        stageTimes[stage] = `${elapsed.toFixed(1)}s`;
      }
    });
    return JSON.stringify(stageTimes);
  }

  private getSLARemaining(process: Process): string {
    const currentStage = process.currentStage;
    const stageInfo = process.stages[currentStage];
    
    if (!stageInfo.startTime) return 'Not started';
    
    const elapsed = (Date.now() - new Date(stageInfo.startTime).getTime()) / 1000;
    const remaining = stageInfo.sla - elapsed;
    return `${remaining.toFixed(1)}s remaining`;
  }

  private calculateConfidence(process: Process): number {
    // Lógica baseada em dados históricos e estágio atual
    const stageConfidence = {
      'R': 0.3,
      'I': 0.5,
      'D': 0.7,
      'E': 0.8,
      'C': 0.9
    };
    
    return stageConfidence[process.currentStage] || 0.5;
  }

  private async generateFallbackPrediction(process: Process): Promise<AIInsight> {
    const currentStage = process.currentStage;
    const stageInfo = process.stages[currentStage];
    
    let message = `Process ${process.id} is in stage ${currentStage}. `;
    let confidence = 0.5;

    if (stageInfo.startTime) {
      const elapsed = (Date.now() - new Date(stageInfo.startTime).getTime()) / 1000;
      const slaPercentage = (elapsed / stageInfo.sla) * 100;
      
      if (slaPercentage > 80) {
        message += `WARNING: ${slaPercentage.toFixed(1)}% of SLA consumed.`;
        confidence = 0.8;
      } else {
        message += `Progress: ${slaPercentage.toFixed(1)}% of SLA.`;
        confidence = 0.6;
      }
    }

    const insight = new AIInsight();
    insight.type = InsightType.PREDICTION;
    insight.confidence = confidence;
    insight.message = message;
    insight.processId = process.id;
    insight.timestamp = new Date();

    await this.aiInsightRepository.save(insight);
    return insight;
  }
} 