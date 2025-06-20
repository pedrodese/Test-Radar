import { Injectable, BadRequestException } from '@nestjs/common';
import { MaintenanceWebhookPayload } from '../interfaces/maintenance-webhook.interface';
import { PROCESS_CONSTANTS } from '../constants/process.constants';

@Injectable()
export class ValidationService {
  validateMaintenanceWebhook(payload: MaintenanceWebhookPayload) {
    if (!payload.event) {
      throw new BadRequestException('Event type is required');
    }

    if (!payload.data) {
      throw new BadRequestException('Data is required');
    }

    if (!payload.data.processId) {
      throw new BadRequestException('Process ID is required');
    }

    if (!payload.data.vehicleId) {
      throw new BadRequestException('Vehicle ID is required');
    }

    if (!payload.data.type || !PROCESS_CONSTANTS.MAINTENANCE_TYPES.includes(payload.data.type)) {
      throw new BadRequestException('Invalid maintenance type');
    }

    if (!payload.data.timestamp) {
      throw new BadRequestException('Timestamp is required');
    }

    try {
      new Date(payload.data.timestamp);
    } catch (error) {
      throw new BadRequestException('Invalid timestamp format');
    }
  }
} 