import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatGPTController } from './chatgpt.controller';
import { ChatGPTService } from './chatgpt.service';
import { TranscriptionModule } from '../transcription/transcription.module';

@Module({
  imports: [ConfigModule, TranscriptionModule],
  controllers: [ChatGPTController],
  providers: [ChatGPTService],
  exports: [ChatGPTService],
})
export class ChatGPTModule {}

