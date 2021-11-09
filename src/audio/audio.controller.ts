import { InjectQueue } from '@nestjs/bull';
import { Controller, Post, Get } from '@nestjs/common';
import { Queue } from 'bull';
import { OnModuleDestroy } from '@nestjs/common';
@Controller('audio')
export class AudioController implements OnModuleDestroy {
  constructor(@InjectQueue('audio') private readonly audioQueue: Queue) {}

  @Get()
  async qururu() {
    const jobs = await this.audioQueue.getRepeatableJobs();
    console.log('JOBS', jobs);
    return JSON.stringify(jobs);
    // this.audioQueue.empty();
  }

  @Get('test')
  async transcode() {
    const rand = Math.random();
    const jobId = 'audio.mp3' + rand;

    await this.audioQueue.add(
      {
        file: jobId,
      },
      // { repeat: { cron: '* * * * *' , limit: 50 }},
      { repeat: { every: 10000, limit: 5 }, jobId },
    );
  }

  @Get('clear')
  async clear() {
    await this.audioQueue.getRepeatableJobs().then((jobs) => {
      console.log('CLEARING REPEATABLE JOBS');
      jobs.forEach((job) => {
        this.audioQueue.removeRepeatableByKey(job.key);
      });
    });

    return 'cleared';
  }

  onModuleDestroy() {
    // console.log('DESTROY');
    // this.audioQueue.empty();
  }
}
