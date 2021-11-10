import { Injectable } from '@nestjs/common';
import { FeedDto } from './dto/feed.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feed } from './entities/feed.entity';

@Injectable()
export class FeedsService {
  constructor(
    @InjectRepository(Feed)
    private feedsRepository: Repository<Feed>,
  ) {}

  create(createFeedDto: FeedDto) {
    return this.feedsRepository.create(createFeedDto);
  }

  findAll() {
    return this.feedsRepository.find();
  }

  findOne(id: number) {
    return this.feedsRepository.findOne(id);
  }

  update(id: number, updateFeedDto: FeedDto) {
    return this.feedsRepository.update(id, updateFeedDto);
  }

  async remove(id: number) {
    await this.feedsRepository.delete(id);
  }
}
