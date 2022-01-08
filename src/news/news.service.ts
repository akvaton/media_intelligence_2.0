import { Injectable } from '@nestjs/common';
import { CreateNewsItemDto } from './dto/create-news-item.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from './entities/news-item.entity';
import { In } from 'typeorm';
import * as dayjs from 'dayjs';

@Injectable()
export class NewsService {
  constructor(
    @InjectRepository(Article)
    private newsRepository: Repository<Article>,
  ) {}

  async createIfNotExist(items: Array<CreateNewsItemDto>, sourceId: number) {
    const existingItems = await this.newsRepository.find({
      link: In(items.map((item) => item.link)),
    });

    const existingItemsMap = existingItems.reduce((acc, curr) => {
      acc[curr.link] = true;

      return acc;
    }, {});
    const entitiesToSave = items.reduce((acc, createDto) => {
      if (!existingItemsMap[createDto.link]) {
        const pubDate = new Date(createDto.pubDate || new Date());
        if (dayjs().diff(pubDate, 'hour') > 12) {
          return acc;
        }
        const newsItem = new Article();

        newsItem.link = createDto.link;
        newsItem.sourceId = sourceId;
        newsItem.title = createDto.title;
        newsItem.pubDate = pubDate;

        existingItemsMap[createDto.link] = true;
        acc.push(newsItem);
      }

      return acc;
    }, []);

    return this.newsRepository.save(entitiesToSave);
  }

  findAll() {
    return this.newsRepository.find();
  }

  findOne(id: number) {
    return this.newsRepository.findOne(id);
  }
}
