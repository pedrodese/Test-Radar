import { ProcessStatus } from '../enums/process-status.enum';
import { EventType } from '../enums/event-type.enum';

export interface Process {
  id: string;
  title: string;
  type: 'maintenance' | 'financial' | 'supply';
  vehicleId?: string;
  currentStage: 'R' | 'I' | 'D' | 'E' | 'C';
  status: ProcessStatus;
  createdAt: Date;
  predictedCompletionTime?: Date;
  riskScore?: number;
  stages: {
    R: { startTime?: Date; endTime?: Date; sla: number; };
    I: { startTime?: Date; endTime?: Date; sla: number; };
    D: { startTime?: Date; endTime?: Date; sla: number; };
    E: { startTime?: Date; endTime?: Date; sla: number; };
    C: { startTime?: Date; endTime?: Date; sla: number; };
  };
} 