import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerService } from './services/logger.service';
import { ValidationService } from './services/validation.service';
import { CacheService } from './services/cache.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [LoggerService, ValidationService, CacheService],
  exports: [LoggerService, ValidationService, CacheService]
})
export class CommonModule {} 