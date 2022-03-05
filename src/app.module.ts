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
import { ADMIN_JS_OPTIONS } from './adminjs';

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
            tls: {
              rejectUnauthorized: false,
            },
          },
        };
      },
    }),
    TypeOrmModule.forRoot(),
    AdminModule.createAdmin({
      adminJsOptions: ADMIN_JS_OPTIONS,
      auth: {
        authenticate: async (email, password) => {
          if (
            email === process.env.BASIC_USER &&
            password === process.env.BASIC_PASSWORD
          ) {
            return Promise.resolve({ email: password });
          }
          return null;
        },
        cookieName: 'newsName',
        cookiePassword: 'newsPass',
      },
    }),
    FeedsModule,
    InteractionsModule,
    NewsModule,
  ],
})
export class AppModule {}
