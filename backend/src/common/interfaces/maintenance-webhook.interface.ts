import { EventType } from '../enums/event-type.enum';

export interface MaintenanceWebhookPayload {
  event: 'maintenance.created' | 'maintenance.identified' | 'maintenance.approved' | 'maintenance.started' | 'maintenance.completed';
  data: {
    processId: string;
    vehicleId: string;
    type: 'preventive' | 'corrective' | 'emergency';
    timestamp: string;
    metadata?: any;
  };
} 