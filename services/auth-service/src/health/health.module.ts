import { Module } from '@nestjs/common';
import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  async check() {
    const dbOk = this.dataSource.isInitialized;
    return {
      status: dbOk ? 'ok' : 'degraded',
      service: 'auth-service',
      timestamp: new Date().toISOString(),
      database: dbOk ? 'connected' : 'disconnected',
    };
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
