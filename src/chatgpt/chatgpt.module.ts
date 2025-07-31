import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatGPTController } from './chatgpt.controller';
import { ChatGPTService } from './chatgpt.service';
import { TranscriptionModule } from '../transcription/transcription.module';
import { ConversationThread } from './entities/conversation-thread.entity';
import { ConversationThreadRepository } from './repositories/conversation-thread.repository';

@Module({
  imports: [
    ConfigModule, 
    TranscriptionModule,
    TypeOrmModule.forFeature([ConversationThread])
  ],
  controllers: [ChatGPTController],
  providers: [ChatGPTService, ConversationThreadRepository],
  exports: [ChatGPTService],
})
export class ChatGPTModule {}

