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
import { ConfigModule } from '@nestjs/config';

AdminJS.registerAdapter({ Database, Resource });

@Module({
  imports: [
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      //redis://:pdcbbd44a475ac51d546091fbd9e415b58a05647acdd0cb4c1be9ad96169f3f9b@ec2-99-81-134-10.eu-west-1.compute.amazonaws.com:27509
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
