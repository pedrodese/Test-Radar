import { IsString, IsObject, IsOptional, IsEnum, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { MaintenanceWebhookPayload } from '../interfaces/maintenance-webhook.interface';

class MaintenanceDataDto {
  @IsString()
  processId: string;

  @IsString()
  vehicleId: string;

  @IsEnum(['preventive', 'corrective', 'emergency'])
  type: 'preventive' | 'corrective' | 'emergency';

  @IsDateString()
  timestamp: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class MaintenanceWebhookDto implements MaintenanceWebhookPayload {
  @IsEnum(['maintenance.created', 'maintenance.identified', 'maintenance.approved', 'maintenance.started', 'maintenance.completed'])
  event: 'maintenance.created' | 'maintenance.identified' | 'maintenance.approved' | 'maintenance.started' | 'maintenance.completed';

  @ValidateNested()
  @Type(() => MaintenanceDataDto)
  data: MaintenanceDataDto;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  severity?: 'low' | 'medium' | 'high';
} 