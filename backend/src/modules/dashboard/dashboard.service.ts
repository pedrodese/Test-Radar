import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Process } from '../../core/entities/process.entity';
import { AIInsight } from '../../core/entities/ai-insight.entity';
import { ProcessStatus } from '../../common/enums/process-status.enum';
import { CacheService } from '../../common/services/cache.service';
import { LoggerService } from '../../common/services/logger.service';
import { InsightType } from '../../common/enums/insight-type.enum';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Process)
    private processRepository: Repository<Process>,
    @InjectRepository(AIInsight)
    private aiInsightRepository: Repository<AIInsight>,
    private cache: CacheService,
    private logger: LoggerService
  ) {}

  async getProcesses(status?: ProcessStatus, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    
    const query = this.processRepository.createQueryBuilder('process')
      .orderBy('process.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (status) {
      query.where('process.status = :status', { status });
    }

    const [processes, total] = await query.getManyAndCount();

    // Buscar insights para cada processo
    const processesWithInsights = await Promise.all(
      processes.map(async (process) => {
        const insights = await this.aiInsightRepository.find({
          where: { processId: process.id },
          order: { timestamp: 'DESC' },
          take: 5
        });
        return { ...process, insights };
      })
    );

    return {
      data: processesWithInsights,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getMetrics() {
    const metrics = await this.cache.getOrSet('dashboard:metrics', async () => {
      const [
        totalProcesses,
        activeProcesses,
        completedProcesses,
        overdueProcesses
      ] = await Promise.all([
        this.processRepository.count(),
        this.processRepository.count({ where: { status: ProcessStatus.PENDING } }),
        this.processRepository.count({ where: { status: ProcessStatus.COMPLETED } }),
        this.processRepository.count({ where: { status: ProcessStatus.FAILED } })
      ]);

      return {
        totalProcesses,
        activeProcesses,
        completedProcesses,
        overdueProcesses,
        completionRate: totalProcesses ? (completedProcesses / totalProcesses) * 100 : 0
      };
    }, 300); // 5 minutos de cache

    return metrics;
  }

  async getAlerts(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [alerts, total] = await this.aiInsightRepository.findAndCount({
      where: { type: InsightType.PREDICTION },
      order: { timestamp: 'DESC' },
      skip,
      take: limit
    });

    return {
      data: alerts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getProcessDetails(id: string) {
    const process = await this.cache.getOrSet(`process:${id}`, async () => {
      return this.processRepository.findOne({
        where: { id }
      });
    }, 300);

    if (!process) {
      return null;
    }

    // Buscar insights do processo
    const insights = await this.aiInsightRepository.find({
      where: { processId: id },
      order: { timestamp: 'DESC' }
    });

    const currentStage = process.currentStage;
    const stageInfo = process.stages[currentStage];
    
    let elapsedTime = 0;
    let slaPercentage = 0;

    if (stageInfo.startTime) {
      elapsedTime = Date.now() - new Date(stageInfo.startTime).getTime();
      slaPercentage = (elapsedTime / (stageInfo.sla * 1000)) * 100;
    }

    return {
      ...process,
      insights,
      currentStageInfo: {
        elapsedTime: elapsedTime / 1000,
        slaPercentage,
        remainingTime: stageInfo.sla - (elapsedTime / 1000)
      }
    };
  }

  async getInsights(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [insights, total] = await this.aiInsightRepository.findAndCount({
      order: { timestamp: 'DESC' },
      skip,
      take: limit
    });

    return {
      data: insights,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getProcessEvents(processId: string) {
    const process = await this.processRepository.findOne({
      where: { id: processId }
    });

    if (!process) {
      return null;
    }

    const insights = await this.aiInsightRepository.find({
      where: { processId },
      order: { timestamp: 'ASC' }
    });

    // Construir timeline de eventos baseado nos estágios e insights
    const events: Array<{
      type: string;
      stage?: string;
      timestamp: Date;
      description: string;
      duration?: number;
      insightType?: any;
      confidence?: number;
    }> = [];
    
    // Adicionar eventos de mudança de estágio
    Object.entries(process.stages).forEach(([stage, stageInfo]) => {
      if (stageInfo.startTime) {
        events.push({
          type: 'stage_started',
          stage,
          timestamp: stageInfo.startTime,
          description: `Stage ${stage} started`
        });
      }
      
      if (stageInfo.endTime && stageInfo.startTime) {
        events.push({
          type: 'stage_completed',
          stage,
          timestamp: stageInfo.endTime,
          description: `Stage ${stage} completed`,
          duration: (stageInfo.endTime.getTime() - stageInfo.startTime.getTime()) / 1000
        });
      }
    });

    // Adicionar insights como eventos
    insights.forEach(insight => {
      events.push({
        type: 'ai_insight',
        insightType: insight.type,
        timestamp: insight.timestamp,
        description: insight.message,
        confidence: insight.confidence
      });
    });

    // Ordenar por timestamp
    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return {
      processId,
      events,
      totalEvents: events.length
    };
  }
} 