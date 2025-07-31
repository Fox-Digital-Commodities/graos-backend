import { IsString, IsOptional, IsBoolean, IsArray, IsObject, IsNumber, IsEnum, IsDateString } from 'class-validator';
import { MessageType, MessageStatus } from '../entities/message.entity';

export class CreateMessageDto {
  @IsString()
  whatsappId: string;

  @IsString()
  conversationId: string;

  @IsOptional()
  @IsBoolean()
  fromMe?: boolean;

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsDateString()
  timestamp?: string;

  @IsOptional()
  @IsEnum(MessageStatus)
  status?: MessageStatus;

  @IsOptional()
  @IsBoolean()
  isForwarded?: boolean;

  @IsOptional()
  @IsNumber()
  forwardCount?: number;

  @IsOptional()
  @IsBoolean()
  isStarred?: boolean;

  @IsOptional()
  @IsBoolean()
  isBroadcast?: boolean;

  @IsOptional()
  @IsString()
  quotedMessageId?: string;

  @IsOptional()
  @IsString()
  quotedMessageBody?: string;

  // Campos de mídia
  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  mediaMimeType?: string;

  @IsOptional()
  @IsNumber()
  mediaSize?: number;

  @IsOptional()
  @IsString()
  mediaFilename?: string;

  @IsOptional()
  @IsNumber()
  mediaDuration?: number;

  @IsOptional()
  @IsNumber()
  mediaWidth?: number;

  @IsOptional()
  @IsNumber()
  mediaHeight?: number;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  // Campos de localização
  @IsOptional()
  @IsNumber()
  locationLatitude?: number;

  @IsOptional()
  @IsNumber()
  locationLongitude?: number;

  @IsOptional()
  @IsString()
  locationDescription?: string;

  // Campos de contato
  @IsOptional()
  @IsString()
  contactVcard?: string;

  // Campos de transcrição
  @IsOptional()
  @IsString()
  transcription?: string;

  @IsOptional()
  @IsNumber()
  transcriptionConfidence?: number;

  @IsOptional()
  @IsString()
  transcriptionLanguage?: string;

  @IsOptional()
  @IsObject()
  metadata?: {
    reactions?: {
      emoji: string;
      author: string;
      timestamp: Date;
    }[];
    mentions?: string[];
    links?: {
      url: string;
      title?: string;
      description?: string;
      image?: string;
    }[];
    businessContext?: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
    urgency?: 'low' | 'medium' | 'high' | 'urgent';
    tags?: string[];
    customFields?: Record<string, any>;
  };
}

export class UpdateMessageDto {
  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsEnum(MessageStatus)
  status?: MessageStatus;

  @IsOptional()
  @IsBoolean()
  isStarred?: boolean;

  @IsOptional()
  @IsString()
  transcription?: string;

  @IsOptional()
  @IsNumber()
  transcriptionConfidence?: number;

  @IsOptional()
  @IsString()
  transcriptionLanguage?: string;

  @IsOptional()
  @IsObject()
  metadata?: {
    reactions?: {
      emoji: string;
      author: string;
      timestamp: Date;
    }[];
    mentions?: string[];
    links?: {
      url: string;
      title?: string;
      description?: string;
      image?: string;
    }[];
    businessContext?: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
    urgency?: 'low' | 'medium' | 'high' | 'urgent';
    tags?: string[];
    customFields?: Record<string, any>;
  };
}

export class SearchMessagesDto {
  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @IsOptional()
  @IsBoolean()
  fromMe?: boolean;

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsBoolean()
  isStarred?: boolean;

  @IsOptional()
  @IsBoolean()
  isForwarded?: boolean;

  @IsOptional()
  @IsBoolean()
  hasTranscription?: boolean;

  @IsOptional()
  @IsEnum(['positive', 'negative', 'neutral'])
  sentiment?: string;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'urgent'])
  urgency?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  offset?: string;
}

export class AddReactionDto {
  @IsString()
  emoji: string;

  @IsString()
  author: string;
}

export class SetTranscriptionDto {
  @IsString()
  transcription: string;

  @IsNumber()
  confidence: number;

  @IsOptional()
  @IsString()
  language?: string;
}

export class SetSentimentDto {
  @IsEnum(['positive', 'negative', 'neutral'])
  sentiment: 'positive' | 'negative' | 'neutral';
}

export class SetUrgencyDto {
  @IsEnum(['low', 'medium', 'high', 'urgent'])
  urgency: 'low' | 'medium' | 'high' | 'urgent';
}

export class BulkSaveDto {
  @IsOptional()
  @IsArray()
  contacts?: any[];

  @IsOptional()
  @IsArray()
  conversations?: any[];

  @IsOptional()
  @IsArray()
  messages?: any[];
}

