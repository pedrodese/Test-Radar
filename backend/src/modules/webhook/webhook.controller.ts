import { Controller, Post, Body, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { MaintenanceWebhookDto } from '../../common/dto/maintenance-webhook.dto';
import { WebhookService } from './webhook.service';

@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  @Post('maintenance')
  async handleMaintenanceWebhook(@Body() webhookData: MaintenanceWebhookDto) {
    try {
      this.logger.log(JSON.stringify({
        event: 'webhook.received',
        timestamp: new Date(),
        data: webhookData
      }));

      const result = await this.webhookService.processMaintenanceWebhook(webhookData);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      this.logger.error(JSON.stringify({
        event: 'webhook.error',
        timestamp: new Date(),
        error: error.message,
        data: webhookData
      }));

      throw new HttpException({
        success: false,
        error: error.message
      }, HttpStatus.BAD_REQUEST);
    }
  }
} 