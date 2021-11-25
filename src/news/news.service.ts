import { Injectable } from '@nestjs/common';
import { CreateNewsItemDto } from './dto/create-news-item.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NewsItem } from './entities/news-item.entity';
import { InteractionsService } from '../interactions/interactions.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class NewsService {
  constructor(
    @InjectRepository(NewsItem)
    private newsRepository: Repository<NewsItem>,
    private interactionsService: InteractionsService,
  ) {}

  async createIfNotExist(createDto: CreateNewsItemDto) {
    const { link } = createDto;
    const item = await this.newsRepository.findOne({ link });

    if (!item) {
      const newsItem = new NewsItem();

      newsItem.link = createDto.link;
      newsItem.source = createDto.source;
      newsItem.title = createDto.title;
      newsItem.pubDate = createDto.pubDate;

      await this.newsRepository.save(newsItem);
    }
  }

  findAll() {
    return this.newsRepository.find();
  }

  findOne(id: number) {
    return this.newsRepository.findOne(id);
  }

  update(id: number, updateNewsDto: UpdateNewsDto) {
    return `This action updates a #${id} news`;
  }

  remove(id: number) {
    return `This action removes a #${id} news`;
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async checkTheNewsDataBase() {
    const newsItems = await this.findAll();
    newsItems.forEach((item) => {
      this.interactionsService.processNewsItem(item);
    });
  }
}
