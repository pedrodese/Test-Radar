import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { InsightType } from '../../common/enums/insight-type.enum';
import { Process } from './process.entity';

@Entity('ai_insights')
export class AIInsight {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: InsightType
  })
  type: InsightType;

  @Column('float')
  confidence: number;

  @Column('text')
  message: string;

  @Column('uuid')
  processId: string;

  @CreateDateColumn()
  timestamp: Date;

  @ManyToOne(() => Process, process => process.insights)
  @JoinColumn({ name: 'processId' })
  process: Process;
} 