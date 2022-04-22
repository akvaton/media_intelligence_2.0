import { Process, Processor } from '@nestjs/bull';
import { InteractionsService } from '../interactions.service';
import {
  GENERAL_AUDIENCE_TIME_QUEUE,
  GENERAL_TWITTER_AUDIENCE_TIME_JOB,
} from 'src/config/constants';
import { INTERACTIONS_PROCESSES_FINISH } from '../../config/configuration';
import * as dayjs from 'dayjs';

@Processor(GENERAL_AUDIENCE_TIME_QUEUE)
export class GeneralAudienceTimeProcessor {
  constructor(private interactionsService: InteractionsService) {}

  @Process(GENERAL_TWITTER_AUDIENCE_TIME_JOB)
  async measureGeneralTwitterAudienceTime() {
    const measuredTime = dayjs()
      .subtract(INTERACTIONS_PROCESSES_FINISH, 'ms')
      .startOf('minute');

    await this.interactionsService.measureGeneralTwitterAudienceTime(
      measuredTime.toDate(),
    );
  }
}
