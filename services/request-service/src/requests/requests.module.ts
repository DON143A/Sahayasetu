import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import { HelpRequest } from './entities/request.entity';
import { RequestLog } from './entities/request-log.entity';
import { RequestEventsGateway } from '../events/request-events.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([HelpRequest, RequestLog]),
    EventEmitterModule.forRoot(),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        secret: c.get<string>('jwt.secret'),
      }),
    }),
  ],
  controllers: [RequestsController],
  providers: [RequestsService, RequestEventsGateway],
  exports: [RequestsService],
})
export class RequestsModule {}
