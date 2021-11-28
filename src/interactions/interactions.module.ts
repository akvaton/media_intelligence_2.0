import { Module } from '@nestjs/common';
import { InteractionsService } from './interactions.service';
import { InteractionsController } from './interactions.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Interaction } from './entities/interaction.entity';
import { BullModule } from '@nestjs/bull';
import { InteractionsProcessor } from './interactions.processor';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([Interaction]),
    BullModule.registerQueue({
      name: 'interactions',
      // limiter: {
      //   max: 200,
      //   duration: 1000 * 60 * 60,
      // },
    }),
  ],
  controllers: [InteractionsController],
  providers: [InteractionsService, InteractionsProcessor],
  exports: [InteractionsService],
})
export class InteractionsModule {}
