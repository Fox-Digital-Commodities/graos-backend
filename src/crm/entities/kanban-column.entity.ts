import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { KanbanBoard } from './kanban-board.entity';
import { KanbanCard } from './kanban-card.entity';

export enum ColumnType {
  BACKLOG = 'backlog',
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  DONE = 'done',
  ARCHIVED = 'archived',
  CUSTOM = 'custom'
}

@Entity('kanban_columns')
@Index(['boardId'])
@Index(['position'])
@Index(['type'])
export class KanbanColumn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  boardId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ColumnType,
    default: ColumnType.TODO
  })
  type: ColumnType;

  @Column({ type: 'int' })
  position: number;

  @Column({ type: 'varchar', length: 7, default: '#6B7280' })
  color: string;

  // Configurações da coluna
  @Column({ type: 'json', nullable: true })
  settings: {
    maxCards?: number;
    autoAssign?: boolean;
    autoComplete?: boolean;
    requireApproval?: boolean;
    hideFromBoard?: boolean;
    collapsible?: boolean;
    wipLimit?: number; // Work In Progress limit
    defaultAssignee?: string;
    defaultPriority?: string;
    defaultLabels?: string[];
  };

  // Regras de automação
  @Column({ type: 'json', nullable: true })
  automationRules: {
    onCardEnter?: {
      assignTo?: string;
      addLabels?: string[];
      setPriority?: string;
      setDueDate?: string;
      sendNotification?: boolean;
      runWebhook?: string;
    };
    onCardExit?: {
      markComplete?: boolean;
      archiveCard?: boolean;
      sendNotification?: boolean;
      runWebhook?: string;
    };
    timeBasedRules?: {
      escalateAfterHours?: number;
      escalateTo?: string;
      autoMoveAfterHours?: number;
      moveToColumn?: string;
    };
  };

  // Métricas da coluna
  @Column({ type: 'int', default: 0 })
  cardCount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  averageTimeInColumn: number; // em horas

  @Column({ type: 'timestamp', nullable: true })
  lastActivityAt: Date;

  // Informações adicionais
  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relacionamentos
  @ManyToOne(() => KanbanBoard, board => board.columns, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'boardId' })
  board: KanbanBoard;

  @OneToMany(() => KanbanCard, card => card.column, { cascade: true })
  cards: KanbanCard[];

  // Métodos auxiliares
  isAtWipLimit(): boolean {
    if (!this.settings?.wipLimit) return false;
    return this.cardCount >= this.settings.wipLimit;
  }

  canAcceptCard(): boolean {
    if (this.settings?.maxCards && this.cardCount >= this.settings.maxCards) {
      return false;
    }
    return !this.isAtWipLimit();
  }

  getCardsByPriority(): { high: number; medium: number; low: number } {
    if (!this.cards) return { high: 0, medium: 0, low: 0 };
    
    return this.cards.reduce((acc, card) => {
      switch (card.priority) {
        case 'high':
        case 'urgent':
          acc.high++;
          break;
        case 'medium':
        case 'normal':
          acc.medium++;
          break;
        case 'low':
          acc.low++;
          break;
      }
      return acc;
    }, { high: 0, medium: 0, low: 0 });
  }

  getOverdueCards(): KanbanCard[] {
    if (!this.cards) return [];
    const now = new Date();
    return this.cards.filter(card => card.dueDate && card.dueDate < now);
  }

  updateMetrics(): void {
    this.cardCount = this.cards?.length || 0;
    this.lastActivityAt = new Date();
    
    // Calcular tempo médio na coluna
    if (this.cards && this.cards.length > 0) {
      const totalTime = this.cards.reduce((sum, card) => {
        if (card.timeInColumn) {
          return sum + card.timeInColumn;
        }
        return sum;
      }, 0);
      this.averageTimeInColumn = totalTime / this.cards.length;
    }
  }

  executeAutomationOnEnter(card: KanbanCard): void {
    const rules = this.automationRules?.onCardEnter;
    if (!rules) return;

    if (rules.assignTo) {
      card.assigneeId = rules.assignTo;
    }

    if (rules.addLabels) {
      card.labels = [...(card.labels || []), ...rules.addLabels];
    }

    if (rules.setPriority) {
      card.priority = rules.setPriority;
    }

    if (rules.setDueDate) {
      // Implementar lógica de data baseada na string (ex: "+3d", "+1w")
      const dueDate = this.parseDueDateString(rules.setDueDate);
      if (dueDate) card.dueDate = dueDate;
    }

    card.movedToColumnAt = new Date();
  }

  executeAutomationOnExit(card: KanbanCard): void {
    const rules = this.automationRules?.onCardExit;
    if (!rules) return;

    if (rules.markComplete) {
      card.status = 'completed';
      card.completedAt = new Date();
    }

    if (rules.archiveCard) {
      card.archived = true;
      card.archivedAt = new Date();
    }
  }

  private parseDueDateString(dueDateStr: string): Date | null {
    const now = new Date();
    const match = dueDateStr.match(/^([+-])(\d+)([dwmh])$/);
    
    if (!match) return null;
    
    const [, sign, amount, unit] = match;
    const multiplier = sign === '+' ? 1 : -1;
    const value = parseInt(amount) * multiplier;
    
    switch (unit) {
      case 'h': // horas
        return new Date(now.getTime() + value * 60 * 60 * 1000);
      case 'd': // dias
        return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
      case 'w': // semanas
        return new Date(now.getTime() + value * 7 * 24 * 60 * 60 * 1000);
      case 'm': // meses (aproximado)
        return new Date(now.getTime() + value * 30 * 24 * 60 * 60 * 1000);
      default:
        return null;
    }
  }

  moveToPosition(newPosition: number): void {
    this.position = newPosition;
    this.lastActivityAt = new Date();
  }

  clone(newBoardId: string, newPosition: number): Partial<KanbanColumn> {
    return {
      boardId: newBoardId,
      name: this.name,
      description: this.description,
      type: this.type,
      position: newPosition,
      color: this.color,
      settings: { ...this.settings },
      automationRules: { ...this.automationRules },
      notes: this.notes,
      metadata: { ...this.metadata }
    };
  }
}

