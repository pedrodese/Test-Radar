import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LoggerService {
  private readonly logger = new Logger('TestRadar');

  logEvent(event: string, data: any) {
    this.logger.log(JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      data
    }));
  }

  logError(event: string, error: any, data?: any) {
    this.logger.error(JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      error: error.message || error,
      stack: error.stack,
      data
    }));
  }

  logWarning(event: string, data: any) {
    this.logger.warn(JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      data
    }));
  }
} 