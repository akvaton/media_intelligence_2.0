import AdminJS from 'adminjs';
import { Module } from '@nestjs/common';
import { AdminModule } from '@adminjs/nestjs';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AudioModule } from './audio/audio.module';
import { FeedsModule } from './feeds/feeds.module';
import { Feed } from './feeds/entities/feed.entity';
import { Database, Resource } from '@adminjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

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
    AudioModule,
    AdminModule.createAdmin({
      adminJsOptions: {
        rootPath: '/admin',
        resources: [Feed],
      },
    }),
    FeedsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
