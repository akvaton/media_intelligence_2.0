import { Injectable } from '@nestjs/common';
import { CreateNewsItemDto } from './dto/create-news-item.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as dayjs from 'dayjs';
import { Article } from './entities/news-item.entity';
import { In } from 'typeorm';
import isValidUrl from 'src/utils/is-valid-url';

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
    const entitiesToSave = items.reduce((acc, { link, pubDate, title }) => {
      if (!existingItemsMap[link] && isValidUrl(link)) {
        if (dayjs().diff(pubDate, 'hour') > 12) {
          return acc;
        }

        const now = new Date();
        const publicationDayJsDate = dayjs(pubDate);
        const publicationDate =
          pubDate && publicationDayJsDate.isBefore(now)
            ? publicationDayJsDate.toDate()
            : now;
        const newsItem = new Article();

        newsItem.link = link;
        newsItem.sourceId = sourceId;
        newsItem.title = title;
        newsItem.pubDate = publicationDate;

        existingItemsMap[link] = true;
        acc.push(newsItem);
      }

      return acc;
    }, []);

    return this.newsRepository.save(entitiesToSave);
  }
}
