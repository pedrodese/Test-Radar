import { Controller, Get, Query, Param } from '@nestjs/common';
import { ProcessStatus } from '../../common/enums/process-status.enum';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}
  
  @Get('processes')
  async getProcesses(
    @Query('status') status?: ProcessStatus,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ) {
    return this.dashboardService.getProcesses(status, page, limit);
  }

  @Get('metrics')
  async getMetrics() {
    return this.dashboardService.getMetrics();
  }

  @Get('alerts')
  async getAlerts(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ) {
    return this.dashboardService.getAlerts(page, limit);
  }

  @Get('process/:id')
  async getProcessDetails(@Param('id') id: string) {
    return this.dashboardService.getProcessDetails(id);
  }

  @Get('process/:id/events')
  async getProcessEvents(@Param('id') id: string) {
    return this.dashboardService.getProcessEvents(id);
  }

  @Get('insights')
  async getInsights(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ) {
    return this.dashboardService.getInsights(page, limit);
  }
} 