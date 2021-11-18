import { Module } from '@nestjs/common';
import { InteractionsService } from './interactions.service';
import { InteractionsController } from './interactions.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Interaction } from './entities/interaction.entity';
import { BullModule } from '@nestjs/bull';
import { InteractionsProcessor } from './interactions.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Interaction]),
    BullModule.registerQueue({
      name: 'interactions',
    }),
  ],
  controllers: [InteractionsController],
  providers: [InteractionsService, InteractionsProcessor],
  exports: [InteractionsService],
})
export class InteractionsModule {}
