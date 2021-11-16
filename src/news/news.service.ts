import { Injectable } from '@nestjs/common';
import { CreateNewsItemDto } from './dto/create-news-item.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NewsItem } from './entities/news-item.entity';

@Injectable()
export class NewsService {
  constructor(
    @InjectRepository(NewsItem)
    private newsRepository: Repository<NewsItem>,
  ) {}

  async createIfNotExist(createDto: CreateNewsItemDto) {
    const { link } = createDto;
    const item = await this.newsRepository.findOne({ link });
    console.log('CREATE', createDto);
    if (!item) {
      const newsItem = new NewsItem();

      newsItem.link = createDto.link;
      newsItem.source = createDto.source;
      newsItem.title = createDto.title;
      newsItem.pubDate = createDto.title;

      await this.newsRepository.save(newsItem);
      console.log('News Item has been saved', newsItem);
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
}
