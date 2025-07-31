import { IsString, IsOptional, IsBoolean, IsArray, IsObject, IsNumber, IsEnum } from 'class-validator';

export class CreateConversationDto {
  @IsString()
  whatsappId: string;

  @IsString()
  contactId: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isGroup?: boolean;

  @IsOptional()
  @IsBoolean()
  isMuted?: boolean;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;

  @IsOptional()
  @IsNumber()
  unreadCount?: number;

  @IsOptional()
  @IsNumber()
  participantCount?: number;

  @IsOptional()
  @IsArray()
  labels?: string[];

  @IsOptional()
  @IsObject()
  metadata?: {
    businessContext?: string;
    customerSegment?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    tags?: string[];
    notes?: string;
    assignedTo?: string;
    status?: 'open' | 'pending' | 'resolved' | 'closed';
    customFields?: Record<string, any>;
  };
}

export class UpdateConversationDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isMuted?: boolean;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;

  @IsOptional()
  @IsNumber()
  unreadCount?: number;

  @IsOptional()
  @IsNumber()
  participantCount?: number;

  @IsOptional()
  @IsArray()
  labels?: string[];

  @IsOptional()
  @IsObject()
  metadata?: {
    businessContext?: string;
    customerSegment?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    tags?: string[];
    notes?: string;
    assignedTo?: string;
    status?: 'open' | 'pending' | 'resolved' | 'closed';
    customFields?: Record<string, any>;
  };
}

export class SearchConversationsDto {
  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsBoolean()
  isGroup?: boolean;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;

  @IsOptional()
  @IsBoolean()
  unreadOnly?: boolean;

  @IsOptional()
  @IsEnum(['open', 'pending', 'resolved', 'closed'])
  status?: string;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'urgent'])
  priority?: string;

  @IsOptional()
  @IsArray()
  labels?: string[];

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

export class SetConversationPriorityDto {
  @IsEnum(['low', 'medium', 'high', 'urgent'])
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export class SetConversationStatusDto {
  @IsEnum(['open', 'pending', 'resolved', 'closed'])
  status: 'open' | 'pending' | 'resolved' | 'closed';
}

export class AddLabelDto {
  @IsString()
  label: string;
}

export class AddTagDto {
  @IsString()
  tag: string;
}

