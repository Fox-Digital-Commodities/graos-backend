import { IsString, IsEnum, IsOptional, IsObject, IsArray, IsBoolean, IsInt, MinLength, MaxLength, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TeamStatus } from '../entities/team.entity';

export class CreateTeamDto {
  @ApiProperty({ description: 'Nome único da equipe' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Descrição da equipe', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ 
    description: 'Status da equipe',
    enum: TeamStatus,
    default: TeamStatus.ACTIVE
  })
  @IsOptional()
  @IsEnum(TeamStatus)
  status?: TeamStatus;

  @ApiProperty({ description: 'ID do supervisor da equipe', required: false })
  @IsOptional()
  @IsString()
  supervisorId?: string;

  @ApiProperty({ 
    description: 'Horário de funcionamento da equipe',
    required: false,
    example: {
      monday: { start: '08:00', end: '17:00', active: true },
      tuesday: { start: '08:00', end: '17:00', active: true }
    }
  })
  @IsOptional()
  @IsObject()
  workingHours?: {
    monday?: { start: string; end: string; active: boolean };
    tuesday?: { start: string; end: string; active: boolean };
    wednesday?: { start: string; end: string; active: boolean };
    thursday?: { start: string; end: string; active: boolean };
    friday?: { start: string; end: string; active: boolean };
    saturday?: { start: string; end: string; active: boolean };
    sunday?: { start: string; end: string; active: boolean };
  };

  @ApiProperty({ 
    description: 'IDs das instâncias do WhatsApp que a equipe gerencia',
    type: [String],
    required: false,
    example: ['42102', '23183']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  whatsappInstances?: string[];

  @ApiProperty({ 
    description: 'Configurações de distribuição de conversas',
    required: false,
    example: {
      method: 'round_robin',
      autoAssign: true,
      maxChatsPerAgent: 5,
      priorityHandling: true
    }
  })
  @IsOptional()
  @IsObject()
  distributionSettings?: {
    method: 'round_robin' | 'least_busy' | 'random' | 'manual';
    autoAssign: boolean;
    maxChatsPerAgent: number;
    priorityHandling: boolean;
  };

  @ApiProperty({ 
    description: 'Configurações de escalação',
    required: false,
    example: {
      enabled: true,
      timeoutMinutes: 30,
      escalateTo: 'supervisor'
    }
  })
  @IsOptional()
  @IsObject()
  escalationSettings?: {
    enabled: boolean;
    timeoutMinutes: number;
    escalateTo: 'supervisor' | 'senior_agent' | 'specific_user';
    escalateToUserId?: string;
  };

  @ApiProperty({ description: 'IDs dos membros da equipe', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  memberIds?: string[];

  @ApiProperty({ description: 'Notas sobre a equipe', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiProperty({ description: 'Metadados adicionais', required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateTeamDto {
  @ApiProperty({ description: 'Nome único da equipe', required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiProperty({ description: 'Descrição da equipe', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ 
    description: 'Status da equipe',
    enum: TeamStatus,
    required: false
  })
  @IsOptional()
  @IsEnum(TeamStatus)
  status?: TeamStatus;

  @ApiProperty({ description: 'ID do supervisor da equipe', required: false })
  @IsOptional()
  @IsString()
  supervisorId?: string;

  @ApiProperty({ description: 'Horário de funcionamento da equipe', required: false })
  @IsOptional()
  @IsObject()
  workingHours?: {
    monday?: { start: string; end: string; active: boolean };
    tuesday?: { start: string; end: string; active: boolean };
    wednesday?: { start: string; end: string; active: boolean };
    thursday?: { start: string; end: string; active: boolean };
    friday?: { start: string; end: string; active: boolean };
    saturday?: { start: string; end: string; active: boolean };
    sunday?: { start: string; end: string; active: boolean };
  };

  @ApiProperty({ 
    description: 'IDs das instâncias do WhatsApp que a equipe gerencia',
    type: [String],
    required: false
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  whatsappInstances?: string[];

  @ApiProperty({ description: 'Configurações de distribuição de conversas', required: false })
  @IsOptional()
  @IsObject()
  distributionSettings?: {
    method: 'round_robin' | 'least_busy' | 'random' | 'manual';
    autoAssign: boolean;
    maxChatsPerAgent: number;
    priorityHandling: boolean;
  };

  @ApiProperty({ description: 'Configurações de escalação', required: false })
  @IsOptional()
  @IsObject()
  escalationSettings?: {
    enabled: boolean;
    timeoutMinutes: number;
    escalateTo: 'supervisor' | 'senior_agent' | 'specific_user';
    escalateToUserId?: string;
  };

  @ApiProperty({ description: 'Notas sobre a equipe', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiProperty({ description: 'Metadados adicionais', required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class AddTeamMembersDto {
  @ApiProperty({ 
    description: 'IDs dos usuários para adicionar à equipe',
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  userIds: string[];
}

export class RemoveTeamMembersDto {
  @ApiProperty({ 
    description: 'IDs dos usuários para remover da equipe',
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  userIds: string[];
}

export class AssignTeamInstancesDto {
  @ApiProperty({ 
    description: 'IDs das instâncias do WhatsApp para atribuir à equipe',
    type: [String],
    example: ['42102', '23183']
  })
  @IsArray()
  @IsString({ each: true })
  whatsappInstances: string[];
}

