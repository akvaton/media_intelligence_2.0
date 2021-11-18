import { Module } from '@nestjs/common';
import { AdminModule } from '@adminjs/nestjs';
import { Database, Resource } from '@adminjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FeedsModule } from './feeds/feeds.module';
import { Feed } from './feeds/entities/feed.entity';
import AdminJS from 'adminjs';
import { InteractionsModule } from './interactions/interactions.module';
import { ScheduleModule } from '@nestjs/schedule';
import { NewsModule } from './news/news.module';
import { NewsItem } from './news/entities/news-item.entity';
import { Interaction } from './interactions/entities/interaction.entity';

AdminJS.registerAdapter({ Database, Resource });

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379,
      },
    }),
    TypeOrmModule.forRoot(),
    AdminModule.createAdmin({
      adminJsOptions: {
        rootPath: '/admin',
        resources: [Feed, NewsItem, Interaction],
        branding: {
          logo: false,
          companyName: '',
        },
      },
    }),
    FeedsModule,
    InteractionsModule,
    NewsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
