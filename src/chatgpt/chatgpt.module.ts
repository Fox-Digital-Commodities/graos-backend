import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatGPTController } from './chatgpt.controller';
import { ChatGPTService } from './chatgpt.service';

@Module({
  imports: [ConfigModule],
  controllers: [ChatGPTController],
  providers: [ChatGPTService],
  exports: [ChatGPTService],
})
export class ChatGPTModule {}

