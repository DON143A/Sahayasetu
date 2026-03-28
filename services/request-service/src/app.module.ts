import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig, jwtConfig, appConfig } from '@sahayasetu/config';
import { RequestsModule } from './requests/requests.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { ChatModule } from './chat/chat.module';
import { RatingsModule } from './ratings/ratings.module';
import { CategoriesModule } from './categories/categories.module';
import { HelpRequest } from './requests/entities/request.entity';
import { RequestLog } from './requests/entities/request-log.entity';
import { Assignment } from './assignments/assignment.entity';
import { ChatMessage } from './chat/chat-message.entity';
import { Rating } from './ratings/rating.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, appConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('database.postgres.host'),
        port: config.get('database.postgres.port'),
        username: config.get('database.postgres.username'),
        password: config.get('database.postgres.password'),
        database: config.get('database.postgres.database'),
        entities: [HelpRequest, RequestLog, Assignment, ChatMessage, Rating],
        synchronize: config.get('database.postgres.synchronize'),
        logging: config.get('database.postgres.logging'),
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      }),
    }),
    RequestsModule,
    AssignmentsModule,
    ChatModule,
    RatingsModule,
    CategoriesModule,
  ],
})
export class AppModule {}
