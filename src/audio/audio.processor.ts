import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

@Processor('audio')
export class AudioProcessor {
  private readonly logger = new Logger(AudioProcessor.name);

  @Process()
  handleTranscode(job: Job) {
    this.logger.debug('Start processing...', job.name);
    this.logger.debug(job.data);
    this.logger.debug('Transcoding completed', job.name);
  }
}
