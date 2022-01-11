import { Controller, Get, Param } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Feed } from '../feeds/entities/feed.entity';
import { Repository } from 'typeorm';
import { Article } from './entities/news-item.entity';
import { InteractionsService } from '../interactions/interactions.service';
import { Interaction } from '../interactions/entities/interaction.entity';

@Controller('news')
export class NewsController {
  constructor(
    @InjectRepository(Feed)
    private feedsRepository: Repository<Feed>,
    @InjectRepository(Article)
    private newsRepository: Repository<Article>,
    private interactionsService: InteractionsService,
  ) {}
  @Get('graph/:id')
  async findOne(@Param() params) {
    let delta = 0;
    const article = await this.newsRepository.findOne(params.id, {
      relations: ['interactions'],
    });
    const { interactions } = article;
    const normalizedData = interactions.map((interaction, index) => {
      if (interaction.audienceTime < interactions[index - 1]?.audienceTime) {
        delta += interactions[index - 1].audienceTime;
      }

      return {
        ...interaction,
        audienceTime: interaction.audienceTime + delta,
      } as Interaction;
    });
    const graphData =
      this.interactionsService.getGraphData(normalizedData) || [];

    return JSON.stringify(graphData);
  }
}
