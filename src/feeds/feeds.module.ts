import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { FeedsService } from './feeds.service';
import { FeedsController } from './feeds.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Feed } from './entities/feed.entity';
import { FeedsProcessor } from './feeds.processor';
import { NewsModule } from '../news/news.module';
import { HttpModule, HttpService } from '@nestjs/axios';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const iconv = require('iconv-lite');

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([Feed]),
    BullModule.registerQueue({
      name: 'feeds',
    }),
    NewsModule,
  ],
  controllers: [FeedsController],
  providers: [FeedsService, FeedsProcessor],
})
export class FeedsModule {
  constructor(private httpService: HttpService) {}

  public onModuleInit() {
    this.httpService.axiosRef.interceptors.response.use((response) => {
      const ctype = response.headers['content-type'];

      if (ctype.includes('charset=windows-1251')) {
        response.data = iconv.decode(
          // @ts-ignore
          Buffer.from(response.data),
          'windows-1251',
        );
      } else {
        // @ts-ignore
        response.data = iconv.decode(Buffer.from(response.data), 'utf-8');
      }
      return response;
    });
  }
}
