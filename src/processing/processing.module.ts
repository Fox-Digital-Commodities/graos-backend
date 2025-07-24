import { Module } from '@nestjs/common';
import { ProcessingController } from './processing.controller';
import { ProcessingService } from './processing.service';
import { ChatGPTService } from './chatgpt.service';

@Module({
  controllers: [ProcessingController],
  providers: [ProcessingService, ChatGPTService],
  exports: [ProcessingService, ChatGPTService],
})
export class ProcessingModule {}
