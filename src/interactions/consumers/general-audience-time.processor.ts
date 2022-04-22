import { Process, Processor } from '@nestjs/bull';
import { InteractionsService } from '../interactions.service';
import {
  GENERAL_AUDIENCE_TIME_QUEUE,
  GENERAL_TWITTER_AUDIENCE_TIME_JOB,
} from 'src/config/constants';
import { INTERACTIONS_PROCESSES_FINISH } from '../../config/configuration';
import * as dayjs from 'dayjs';
import { Job } from 'bull';

@Processor(GENERAL_AUDIENCE_TIME_QUEUE)
export class GeneralAudienceTimeProcessor {
  constructor(private interactionsService: InteractionsService) {}

  @Process(GENERAL_TWITTER_AUDIENCE_TIME_JOB)
  async measureGeneralTwitterAudienceTime(job: Job<{ requestTime?: string }>) {
    const { requestTime } = job.data;
    const measuredTime = (requestTime ? dayjs(requestTime) : dayjs())
      .subtract(INTERACTIONS_PROCESSES_FINISH, 'ms')
      .startOf('minute');

    return await this.interactionsService.measureGeneralTwitterAudienceTime(
      measuredTime.toDate(),
    );
  }
}
