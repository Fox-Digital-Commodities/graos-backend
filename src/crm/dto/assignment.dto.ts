import { IsString, IsEnum, IsOptional, IsInt, IsArray, MinLength, MaxLength, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AssignmentStatus, AssignmentPriority, AssignmentType } from '../entities/conversation-assignment.entity';

export class CreateAssignmentDto {
  @ApiProperty({ description: 'ID da conversa do WhatsApp' })
  @IsString()
  conversationId: string;

  @ApiProperty({ description: 'ID da instância do WhatsApp' })
  @IsString()
  whatsappInstanceId: string;

  @ApiProperty({ description: 'ID do usuário/agente' })
  @IsString()
  userId: string;

  @ApiProperty({ 
    description: 'Prioridade da atribuição',
    enum: AssignmentPriority,
    default: AssignmentPriority.NORMAL
  })
  @IsOptional()
  @IsEnum(AssignmentPriority)
  priority?: AssignmentPriority;

  @ApiProperty({ 
    description: 'Tipo de atribuição',
    enum: AssignmentType,
    default: AssignmentType.AUTO
  })
  @IsOptional()
  @IsEnum(AssignmentType)
  assignmentType?: AssignmentType;

  @ApiProperty({ description: 'ID do usuário que fez a atribuição', required: false })
  @IsOptional()
  @IsString()
  assignedBy?: string;

  @ApiProperty({ description: 'Motivo da atribuição', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  assignmentReason?: string;

  @ApiProperty({ description: 'Nome do contato', required: false })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiProperty({ description: 'Telefone do contato', required: false })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiProperty({ description: 'Tipo do contato', required: false })
  @IsOptional()
  @IsString()
  contactType?: string;

  @ApiProperty({ description: 'Categoria da conversa', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: 'Subcategoria da conversa', required: false })
  @IsOptional()
  @IsString()
  subcategory?: string;

  @ApiProperty({ description: 'Tags da conversa', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Notas sobre a atribuição', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateAssignmentDto {
  @ApiProperty({ 
    description: 'Status da atribuição',
    enum: AssignmentStatus,
    required: false
  })
  @IsOptional()
  @IsEnum(AssignmentStatus)
  status?: AssignmentStatus;

  @ApiProperty({ 
    description: 'Prioridade da atribuição',
    enum: AssignmentPriority,
    required: false
  })
  @IsOptional()
  @IsEnum(AssignmentPriority)
  priority?: AssignmentPriority;

  @ApiProperty({ description: 'Nome do contato', required: false })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiProperty({ description: 'Telefone do contato', required: false })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiProperty({ description: 'Tipo do contato', required: false })
  @IsOptional()
  @IsString()
  contactType?: string;

  @ApiProperty({ description: 'Categoria da conversa', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: 'Subcategoria da conversa', required: false })
  @IsOptional()
  @IsString()
  subcategory?: string;

  @ApiProperty({ description: 'Tags da conversa', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Notas sobre a atribuição', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class TransferAssignmentDto {
  @ApiProperty({ description: 'ID do usuário para quem transferir' })
  @IsString()
  toUserId: string;

  @ApiProperty({ description: 'Motivo da transferência', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiProperty({ description: 'Notas sobre a transferência', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class EscalateAssignmentDto {
  @ApiProperty({ description: 'ID do usuário para quem escalar', required: false })
  @IsOptional()
  @IsString()
  toUserId?: string;

  @ApiProperty({ description: 'Motivo da escalação', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiProperty({ description: 'Notas sobre a escalação', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class CompleteAssignmentDto {
  @ApiProperty({ description: 'Avaliação do cliente (1-5)', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  customerRating?: number;

  @ApiProperty({ description: 'Feedback do cliente', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  customerFeedback?: string;

  @ApiProperty({ description: 'Avaliação do supervisor (1-5)', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  supervisorRating?: number;

  @ApiProperty({ description: 'Feedback do supervisor', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  supervisorFeedback?: string;

  @ApiProperty({ description: 'Notas finais', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class BulkAssignDto {
  @ApiProperty({ 
    description: 'IDs das conversas para atribuir',
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  conversationIds: string[];

  @ApiProperty({ description: 'ID da instância do WhatsApp' })
  @IsString()
  whatsappInstanceId: string;

  @ApiProperty({ description: 'ID do usuário/agente', required: false })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ description: 'ID da equipe', required: false })
  @IsOptional()
  @IsString()
  teamId?: string;

  @ApiProperty({ 
    description: 'Prioridade da atribuição',
    enum: AssignmentPriority,
    default: AssignmentPriority.NORMAL
  })
  @IsOptional()
  @IsEnum(AssignmentPriority)
  priority?: AssignmentPriority;

  @ApiProperty({ description: 'Motivo da atribuição em lote', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  assignmentReason?: string;
}

export class AutoAssignDto {
  @ApiProperty({ description: 'ID da conversa do WhatsApp' })
  @IsString()
  conversationId: string;

  @ApiProperty({ description: 'ID da instância do WhatsApp' })
  @IsString()
  whatsappInstanceId: string;

  @ApiProperty({ 
    description: 'Prioridade da atribuição',
    enum: AssignmentPriority,
    default: AssignmentPriority.NORMAL
  })
  @IsOptional()
  @IsEnum(AssignmentPriority)
  priority?: AssignmentPriority;

  @ApiProperty({ description: 'Nome do contato', required: false })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiProperty({ description: 'Telefone do contato', required: false })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiProperty({ description: 'Tipo do contato', required: false })
  @IsOptional()
  @IsString()
  contactType?: string;

  @ApiProperty({ description: 'Categoria da conversa', required: false })
  @IsOptional()
  @IsString()
  category?: string;
}

