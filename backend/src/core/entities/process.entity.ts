import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany } from 'typeorm';
import { ProcessStatus } from '../../common/enums/process-status.enum';
import { AIInsight } from './ai-insight.entity';

@Entity('processes')
export class Process {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({
    type: 'enum',
    enum: ['maintenance', 'financial', 'supply']
  })
  type: 'maintenance' | 'financial' | 'supply';

  @Column({ nullable: true })
  vehicleId?: string;

  @Column({
    type: 'enum',
    enum: ['R', 'I', 'D', 'E', 'C']
  })
  currentStage: 'R' | 'I' | 'D' | 'E' | 'C';

  @Column({
    type: 'enum',
    enum: ProcessStatus,
    default: ProcessStatus.PENDING
  })
  status: ProcessStatus;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  predictedCompletionTime?: Date;

  @Column({ type: 'float', nullable: true })
  riskScore?: number;

  @Column('jsonb')
  stages: {
    R: { startTime?: Date; endTime?: Date; sla: number; };
    I: { startTime?: Date; endTime?: Date; sla: number; };
    D: { startTime?: Date; endTime?: Date; sla: number; };
    E: { startTime?: Date; endTime?: Date; sla: number; };
    C: { startTime?: Date; endTime?: Date; sla: number; };
  };

  @OneToMany(() => AIInsight, insight => insight.processId)
  insights: AIInsight[];
} 