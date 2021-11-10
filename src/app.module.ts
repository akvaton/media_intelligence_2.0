import { Module } from '@nestjs/common';
import { AdminModule } from '@adminjs/nestjs';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AudioModule } from './audio/audio.module';
import { FeedsModule } from './feeds/feeds.module';
import { Feed } from './feeds/entities/feed.entity';
import AdminJS from 'adminjs';
import { Database, Resource } from '@adminjs/typeorm';
// import { ExpressCustomLoader } from './express-custom-loader';

AdminJS.registerAdapter({ Database, Resource });

@Module({
  imports: [
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
      // customLoader: ExpressCustomLoader,
    }),
    FeedsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
