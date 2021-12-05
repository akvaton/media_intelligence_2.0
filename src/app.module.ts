import { Module } from '@nestjs/common';
import { AdminModule } from '@adminjs/nestjs';
import { Database, Resource } from '@adminjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedsModule } from './feeds/feeds.module';
import AdminJS from 'adminjs';
import { InteractionsModule } from './interactions/interactions.module';
import { ScheduleModule } from '@nestjs/schedule';
import { NewsModule } from './news/news.module';
import { ConfigModule } from '@nestjs/config';
import { ADMIN_JS_OPTIONS } from './config/adminjs';

AdminJS.registerAdapter({ Database, Resource });

@Module({
  imports: [
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      useFactory: () => {
        const {
          hostname: host,
          port,
          password,
        } = new URL(process.env.REDIS_URL);

        return {
          redis: {
            host,
            port: Number(port),
            password,
          },
        };
      },
    }),
    TypeOrmModule.forRoot(),
    AdminModule.createAdmin({
      adminJsOptions: ADMIN_JS_OPTIONS,
    }),
    FeedsModule,
    InteractionsModule,
    NewsModule,
  ],
})
export class AppModule {}
