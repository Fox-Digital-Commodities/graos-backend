import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { KanbanCard } from './kanban-card.entity';
import { User } from './user.entity';

export enum ActivityType {
  CREATED = 'created',
  UPDATED = 'updated',
  MOVED = 'moved',
  ASSIGNED = 'assigned',
  UNASSIGNED = 'unassigned',
  COMMENTED = 'commented',
  ATTACHMENT_ADDED = 'attachment_added',
  ATTACHMENT_REMOVED = 'attachment_removed',
  CHECKLIST_ITEM_ADDED = 'checklist_item_added',
  CHECKLIST_ITEM_COMPLETED = 'checklist_item_completed',
  CHECKLIST_ITEM_UNCOMPLETED = 'checklist_item_uncompleted',
  LABEL_ADDED = 'label_added',
  LABEL_REMOVED = 'label_removed',
  DUE_DATE_SET = 'due_date_set',
  DUE_DATE_CHANGED = 'due_date_changed',
  DUE_DATE_REMOVED = 'due_date_removed',
  PRIORITY_CHANGED = 'priority_changed',
  STATUS_CHANGED = 'status_changed',
  COMPLETED = 'completed',
  REOPENED = 'reopened',
  ARCHIVED = 'archived',
  UNARCHIVED = 'unarchived',
  BLOCKED = 'blocked',
  UNBLOCKED = 'unblocked',
  STARRED = 'starred',
  UNSTARRED = 'unstarred',
  TIME_LOGGED = 'time_logged',
  ESTIMATE_CHANGED = 'estimate_changed',
  LINK_ADDED = 'link_added',
  LINK_REMOVED = 'link_removed',
  CUSTOM_FIELD_CHANGED = 'custom_field_changed',
  CONVERSATION_LINKED = 'conversation_linked',
  CONVERSATION_UNLINKED = 'conversation_unlinked',
  MESSAGE_RECEIVED = 'message_received',
  MESSAGE_SENT = 'message_sent',
  CUSTOMER_RATING = 'customer_rating',
  AUTOMATION_TRIGGERED = 'automation_triggered'
}

@Entity('card_activities')
@Index(['cardId'])
@Index(['userId'])
@Index(['type'])
@Index(['createdAt'])
export class CardActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  cardId: string;

  @Column()
  userId: string;

  @Column({
    type: 'enum',
    enum: ActivityType
  })
  type: ActivityType;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Dados específicos da atividade
  @Column({ type: 'json', nullable: true })
  data: {
    // Para movimentação de cards
    fromColumn?: string;
    toColumn?: string;
    fromPosition?: number;
    toPosition?: number;
    
    // Para atribuições
    previousAssignee?: string;
    newAssignee?: string;
    
    // Para comentários
    comment?: string;
    mentionedUsers?: string[];
    
    // Para anexos
    attachmentName?: string;
    attachmentUrl?: string;
    attachmentType?: string;
    attachmentSize?: number;
    
    // Para checklist
    checklistItemId?: string;
    checklistItemText?: string;
    
    // Para labels
    labelName?: string;
    labelColor?: string;
    
    // Para datas
    previousDueDate?: Date;
    newDueDate?: Date;
    
    // Para prioridade
    previousPriority?: string;
    newPriority?: string;
    
    // Para status
    previousStatus?: string;
    newStatus?: string;
    
    // Para tempo
    timeSpent?: number; // em horas
    timeDescription?: string;
    
    // Para estimativas
    previousEstimate?: number;
    newEstimate?: number;
    
    // Para links
    linkTitle?: string;
    linkUrl?: string;
    linkDescription?: string;
    
    // Para campos customizados
    fieldName?: string;
    previousValue?: any;
    newValue?: any;
    
    // Para conversas
    conversationId?: string;
    whatsappInstanceId?: string;
    contactName?: string;
    contactPhone?: string;
    
    // Para mensagens
    messageId?: string;
    messageText?: string;
    messageType?: string;
    messageUrl?: string;
    
    // Para avaliações
    rating?: number;
    feedback?: string;
    
    // Para automações
    automationRule?: string;
    automationTrigger?: string;
    automationResult?: string;
    
    // Dados gerais
    reason?: string;
    notes?: string;
    metadata?: Record<string, any>;
  };

  // Informações de contexto
  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  source: string; // web, mobile, api, automation, etc.

  @CreateDateColumn()
  createdAt: Date;

  // Relacionamentos
  @ManyToOne(() => KanbanCard, card => card.activities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cardId' })
  card: KanbanCard;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  // Métodos auxiliares
  getFormattedDescription(): string {
    if (this.description) return this.description;
    
    // Gerar descrição baseada no tipo de atividade
    switch (this.type) {
      case ActivityType.CREATED:
        return 'criou este card';
      
      case ActivityType.MOVED:
        return `moveu de "${this.data?.fromColumn}" para "${this.data?.toColumn}"`;
      
      case ActivityType.ASSIGNED:
        return `atribuiu para ${this.data?.newAssignee}`;
      
      case ActivityType.UNASSIGNED:
        return `removeu a atribuição de ${this.data?.previousAssignee}`;
      
      case ActivityType.COMMENTED:
        return 'adicionou um comentário';
      
      case ActivityType.ATTACHMENT_ADDED:
        return `anexou "${this.data?.attachmentName}"`;
      
      case ActivityType.ATTACHMENT_REMOVED:
        return `removeu o anexo "${this.data?.attachmentName}"`;
      
      case ActivityType.CHECKLIST_ITEM_ADDED:
        return `adicionou item: "${this.data?.checklistItemText}"`;
      
      case ActivityType.CHECKLIST_ITEM_COMPLETED:
        return `completou item: "${this.data?.checklistItemText}"`;
      
      case ActivityType.LABEL_ADDED:
        return `adicionou a label "${this.data?.labelName}"`;
      
      case ActivityType.LABEL_REMOVED:
        return `removeu a label "${this.data?.labelName}"`;
      
      case ActivityType.DUE_DATE_SET:
        return `definiu prazo para ${this.formatDate(this.data?.newDueDate)}`;
      
      case ActivityType.DUE_DATE_CHANGED:
        return `alterou prazo de ${this.formatDate(this.data?.previousDueDate)} para ${this.formatDate(this.data?.newDueDate)}`;
      
      case ActivityType.DUE_DATE_REMOVED:
        return 'removeu o prazo';
      
      case ActivityType.PRIORITY_CHANGED:
        return `alterou prioridade de "${this.data?.previousPriority}" para "${this.data?.newPriority}"`;
      
      case ActivityType.STATUS_CHANGED:
        return `alterou status de "${this.data?.previousStatus}" para "${this.data?.newStatus}"`;
      
      case ActivityType.COMPLETED:
        return 'marcou como concluído';
      
      case ActivityType.REOPENED:
        return 'reabriu este card';
      
      case ActivityType.ARCHIVED:
        return 'arquivou este card';
      
      case ActivityType.BLOCKED:
        return `bloqueou: ${this.data?.reason}`;
      
      case ActivityType.UNBLOCKED:
        return 'desbloqueou este card';
      
      case ActivityType.STARRED:
        return 'marcou como favorito';
      
      case ActivityType.TIME_LOGGED:
        return `registrou ${this.data?.timeSpent}h de trabalho`;
      
      case ActivityType.ESTIMATE_CHANGED:
        return `alterou estimativa de ${this.data?.previousEstimate}h para ${this.data?.newEstimate}h`;
      
      case ActivityType.CONVERSATION_LINKED:
        return `vinculou conversa com ${this.data?.contactName}`;
      
      case ActivityType.MESSAGE_RECEIVED:
        return `recebeu mensagem de ${this.data?.contactName}`;
      
      case ActivityType.MESSAGE_SENT:
        return `enviou mensagem para ${this.data?.contactName}`;
      
      case ActivityType.CUSTOMER_RATING:
        return `cliente avaliou com ${this.data?.rating} estrelas`;
      
      case ActivityType.AUTOMATION_TRIGGERED:
        return `automação "${this.data?.automationRule}" foi executada`;
      
      default:
        return `executou ação: ${this.type}`;
    }
  }

  private formatDate(date: Date | string): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('pt-BR');
  }

  isSystemActivity(): boolean {
    return [
      ActivityType.AUTOMATION_TRIGGERED,
      ActivityType.MESSAGE_RECEIVED,
      ActivityType.CUSTOMER_RATING
    ].includes(this.type);
  }

  isUserActivity(): boolean {
    return !this.isSystemActivity();
  }

  getActivityIcon(): string {
    switch (this.type) {
      case ActivityType.CREATED:
        return '➕';
      case ActivityType.MOVED:
        return '↔️';
      case ActivityType.ASSIGNED:
        return '👤';
      case ActivityType.COMMENTED:
        return '💬';
      case ActivityType.ATTACHMENT_ADDED:
        return '📎';
      case ActivityType.CHECKLIST_ITEM_COMPLETED:
        return '✅';
      case ActivityType.LABEL_ADDED:
        return '🏷️';
      case ActivityType.DUE_DATE_SET:
        return '📅';
      case ActivityType.PRIORITY_CHANGED:
        return '⚡';
      case ActivityType.COMPLETED:
        return '🎉';
      case ActivityType.BLOCKED:
        return '🚫';
      case ActivityType.STARRED:
        return '⭐';
      case ActivityType.TIME_LOGGED:
        return '⏱️';
      case ActivityType.MESSAGE_RECEIVED:
        return '📨';
      case ActivityType.MESSAGE_SENT:
        return '📤';
      case ActivityType.CUSTOMER_RATING:
        return '⭐';
      case ActivityType.AUTOMATION_TRIGGERED:
        return '🤖';
      default:
        return '📝';
    }
  }

  getActivityColor(): string {
    switch (this.type) {
      case ActivityType.CREATED:
        return '#10B981'; // green
      case ActivityType.COMPLETED:
        return '#059669'; // green-600
      case ActivityType.MOVED:
        return '#3B82F6'; // blue
      case ActivityType.ASSIGNED:
        return '#8B5CF6'; // purple
      case ActivityType.BLOCKED:
        return '#EF4444'; // red
      case ActivityType.PRIORITY_CHANGED:
        return '#F59E0B'; // amber
      case ActivityType.TIME_LOGGED:
        return '#06B6D4'; // cyan
      case ActivityType.MESSAGE_RECEIVED:
        return '#10B981'; // green
      case ActivityType.MESSAGE_SENT:
        return '#3B82F6'; // blue
      case ActivityType.AUTOMATION_TRIGGERED:
        return '#6B7280'; // gray
      default:
        return '#6B7280'; // gray
    }
  }

  // Métodos estáticos para criação de atividades
  static createMoveActivity(
    cardId: string,
    userId: string,
    fromColumn: string,
    toColumn: string,
    fromPosition: number,
    toPosition: number
  ): Partial<CardActivity> {
    return {
      cardId,
      userId,
      type: ActivityType.MOVED,
      data: {
        fromColumn,
        toColumn,
        fromPosition,
        toPosition
      }
    };
  }

  static createCommentActivity(
    cardId: string,
    userId: string,
    comment: string,
    mentionedUsers?: string[]
  ): Partial<CardActivity> {
    return {
      cardId,
      userId,
      type: ActivityType.COMMENTED,
      data: {
        comment,
        mentionedUsers
      }
    };
  }

  static createTimeLogActivity(
    cardId: string,
    userId: string,
    timeSpent: number,
    description?: string
  ): Partial<CardActivity> {
    return {
      cardId,
      userId,
      type: ActivityType.TIME_LOGGED,
      data: {
        timeSpent,
        timeDescription: description
      }
    };
  }

  static createMessageActivity(
    cardId: string,
    userId: string,
    messageType: 'received' | 'sent',
    messageData: {
      messageId: string;
      messageText: string;
      messageType: string;
      contactName: string;
      contactPhone: string;
      conversationId: string;
      whatsappInstanceId: string;
    }
  ): Partial<CardActivity> {
    return {
      cardId,
      userId,
      type: messageType === 'received' ? ActivityType.MESSAGE_RECEIVED : ActivityType.MESSAGE_SENT,
      data: messageData
    };
  }
}

