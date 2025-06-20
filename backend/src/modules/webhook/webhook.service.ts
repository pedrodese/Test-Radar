import { Injectable, BadRequestException } from '@nestjs/common';
import { MaintenanceWebhookDto } from '../../common/dto/maintenance-webhook.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Process } from '../../core/entities/process.entity';
import { AIInsight } from '../../core/entities/ai-insight.entity';
import { AIService } from '../ai/ai.service';
import { ProcessStatus } from '../../common/enums/process-status.enum';
import { EventType } from '../../common/enums/event-type.enum';
import { InsightType } from '../../common/enums/insight-type.enum';
import { LoggerService } from '../../common/services/logger.service';
import { ValidationService } from '../../common/services/validation.service';
import { CacheService } from '../../common/services/cache.service';
import { PROCESS_CONSTANTS } from '../../common/constants/process.constants';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class WebhookService {
  constructor(
    @InjectRepository(Process)
    private processRepository: Repository<Process>,
    @InjectRepository(AIInsight)
    private aiInsightRepository: Repository<AIInsight>,
    private aiService: AIService,
    private logger: LoggerService,
    private validation: ValidationService,
    private cache: CacheService,
    private eventsGateway: EventsGateway
  ) {}

  async processMaintenanceWebhook(webhookData: MaintenanceWebhookDto) {
    this.logger.logEvent('webhook.received', webhookData);

    try {
      this.validation.validateMaintenanceWebhook(webhookData);

      const stage = this.mapEventToStage(webhookData.event);
      if (!stage) {
        throw new BadRequestException(`Invalid event: ${webhookData.event}`);
      }

      let process = await this.getProcessFromCache(webhookData.data.processId);

      if (!process) {
        process = this.createNewProcess(webhookData);
        this.logger.logEvent('process.created', {
          processId: process.id,
          stage: 'R',
          type: process.type,
          vehicleId: process.vehicleId
        });
      } else {
        this.validateStageSequence(process.currentStage, stage);
      }

      process.currentStage = stage;
      process.stages[stage].startTime = new Date(webhookData.data.timestamp);

      const previousStage = this.getPreviousStage(stage);
      if (previousStage && process.stages[previousStage].startTime && !process.stages[previousStage].endTime) {
        process.stages[previousStage].endTime = new Date(webhookData.data.timestamp);
        this.logger.logEvent('stage.completed', {
          processId: process.id,
          stage: previousStage,
          duration: (process.stages[previousStage].endTime.getTime() - process.stages[previousStage].startTime.getTime()) / 1000
        });
      }

      await this.calculateSLAAndCheckAlerts(process);

      const prediction = await this.aiService.predictProcessCompletion(process);
      process.predictedCompletionTime = new Date(Date.now() + prediction.confidence * 1000);
      process.riskScore = prediction.confidence;

      this.logger.logEvent('prediction.generated', {
        processId: process.id,
        stage: process.currentStage,
        prediction: {
          message: prediction.message,
          confidence: prediction.confidence
        }
      });

      await this.processRepository.save(process);
      await this.updateProcessCache(process);

      // Emite atualização do processo em tempo real
      this.eventsGateway.emitProcessUpdate(process);

      // Emite insight de AI em tempo real
      this.eventsGateway.emitAIInsight({
        processId: process.id,
        prediction: {
          message: prediction.message,
          confidence: prediction.confidence
        },
        timestamp: new Date()
      });

      return { 
        success: true, 
        processId: process.id,
        currentStage: process.currentStage,
        prediction: {
          message: prediction.message,
          confidence: prediction.confidence
        }
      };
    } catch (error) {
      this.logger.logError('webhook.error', error, webhookData);
      throw error;
    }
  }

  private async getProcessFromCache(processId: string): Promise<Process | null> {
    const cachedProcess = await this.cache.get<Process>(`process:${processId}`);
    if (cachedProcess) {
      return cachedProcess;
    }

    const process = await this.processRepository.findOne({
      where: { id: processId }
    });

    if (process) {
      await this.cache.set(`process:${processId}`, process, 300);
    }

    return process;
  }

  private async updateProcessCache(process: Process): Promise<void> {
    await this.cache.set(`process:${process.id}`, process, 300);
  }

  private mapEventToStage(event: string): 'R' | 'I' | 'D' | 'E' | 'C' | null {
    const eventToStageMap = {
      'maintenance.created': 'R',
      'maintenance.identified': 'I',
      'maintenance.approved': 'D',
      'maintenance.started': 'E',
      'maintenance.completed': 'C'
    };
    return eventToStageMap[event] || null;
  }

  private validateStageSequence(currentStage: string, newStage: string) {
    const currentIndex = Object.keys(PROCESS_CONSTANTS.STAGES).indexOf(currentStage);
    const newIndex = Object.keys(PROCESS_CONSTANTS.STAGES).indexOf(newStage);

    if (newIndex <= currentIndex) {
      throw new BadRequestException(
        `Invalid stage sequence. Current stage: ${currentStage}, Attempted stage: ${newStage}`
      );
    }
  }

  private getPreviousStage(currentStage: 'R' | 'I' | 'D' | 'E' | 'C'): 'R' | 'I' | 'D' | 'E' | 'C' | null {
    const stages = Object.keys(PROCESS_CONSTANTS.STAGES);
    const currentIndex = stages.indexOf(currentStage);
    return currentIndex > 0 ? stages[currentIndex - 1] as 'R' | 'I' | 'D' | 'E' | 'C' : null;
  }

  private createNewProcess(webhookData: MaintenanceWebhookDto): Process {
    const process = new Process();
    process.id = webhookData.data.processId;
    process.title = `Maintenance - ${webhookData.data.type}`;
    process.type = 'maintenance';
    process.vehicleId = webhookData.data.vehicleId;
    process.status = ProcessStatus.PENDING;
    process.currentStage = 'R';
    process.createdAt = new Date();
    process.stages = {
      R: { sla: PROCESS_CONSTANTS.STAGES.R.sla },
      I: { sla: PROCESS_CONSTANTS.STAGES.I.sla },
      D: { sla: PROCESS_CONSTANTS.STAGES.D.sla },
      E: { sla: PROCESS_CONSTANTS.STAGES.E.sla },
      C: { sla: PROCESS_CONSTANTS.STAGES.C.sla }
    };
    return process;
  }

  private async calculateSLAAndCheckAlerts(process: Process) {
    const currentStage = process.currentStage;
    const stageInfo = process.stages[currentStage];
    
    if (stageInfo.startTime) {
      const elapsedTime = Date.now() - stageInfo.startTime.getTime();
      const slaPercentage = (elapsedTime / (stageInfo.sla * 1000)) * 100;

      this.logger.logEvent('sla.check', {
        processId: process.id,
        stage: currentStage,
        slaPercentage,
        elapsedTime: elapsedTime / 1000
      });

      if (slaPercentage > PROCESS_CONSTANTS.ALERT_THRESHOLDS.WARNING * 100) {
        await this.generateAlert(process, slaPercentage);
      }

      if (slaPercentage > PROCESS_CONSTANTS.ALERT_THRESHOLDS.CRITICAL * 100) {
        process.status = ProcessStatus.FAILED;
        await this.autoEscalate(process);
      }
    }
  }

  private async generateAlert(process: Process, slaPercentage: number) {
    const insight = new AIInsight();
    insight.type = InsightType.PREDICTION;
    insight.confidence = 0.8;
    insight.message = `Process ${process.id} is at ${(slaPercentage * 100).toFixed(2)}% of SLA`;
    insight.processId = process.id;
    insight.timestamp = new Date();

    await this.aiInsightRepository.save(insight);

    this.logger.logEvent('alert.generated', {
      processId: process.id,
      stage: process.currentStage,
      slaPercentage,
      message: insight.message
    });

    // Emite o alerta em tempo real
    this.eventsGateway.emitAlert({
      processId: process.id,
      stage: process.currentStage,
      slaPercentage,
      message: insight.message,
      timestamp: new Date()
    });
  }

  private async autoEscalate(process: Process) {
    const insight = new AIInsight();
    insight.type = InsightType.PREDICTION;
    insight.confidence = 1.0;
    insight.message = `Process ${process.id} has exceeded SLA and requires immediate attention`;
    insight.processId = process.id;
    insight.timestamp = new Date();

    await this.aiInsightRepository.save(insight);

    this.logger.logEvent('process.escalated', {
      processId: process.id,
      stage: process.currentStage,
      message: insight.message
    });

    // Emite o alerta de escalação em tempo real
    this.eventsGateway.emitAlert({
      processId: process.id,
      stage: process.currentStage,
      message: insight.message,
      severity: 'high',
      timestamp: new Date()
    });
  }
} 