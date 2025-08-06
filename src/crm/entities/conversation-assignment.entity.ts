import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';

export enum AssignmentStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  TRANSFERRED = 'transferred',
  ESCALATED = 'escalated',
  ABANDONED = 'abandoned'
}

export enum AssignmentPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum AssignmentType {
  AUTO = 'auto',        // Atribuição automática
  MANUAL = 'manual',    // Atribuição manual
  TRANSFER = 'transfer', // Transferência entre agentes
  ESCALATION = 'escalation' // Escalação para supervisor
}

@Entity('conversation_assignments')
@Index(['conversationId'])
@Index(['userId'])
@Index(['status'])
@Index(['priority'])
@Index(['assignedAt'])
@Index(['whatsappInstanceId'])
export class ConversationAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  conversationId: string; // ID da conversa do WhatsApp

  @Column()
  whatsappInstanceId: string; // ID da instância do WhatsApp

  @Column()
  userId: string;

  @Column({
    type: 'enum',
    enum: AssignmentStatus,
    default: AssignmentStatus.ACTIVE
  })
  status: AssignmentStatus;

  @Column({
    type: 'enum',
    enum: AssignmentPriority,
    default: AssignmentPriority.NORMAL
  })
  priority: AssignmentPriority;

  @Column({
    type: 'enum',
    enum: AssignmentType,
    default: AssignmentType.AUTO
  })
  assignmentType: AssignmentType;

  @Column({ nullable: true })
  assignedBy: string; // ID do usuário que fez a atribuição

  @Column({ nullable: true })
  transferredFrom: string; // ID do usuário anterior (em caso de transferência)

  @Column({ nullable: true })
  transferredTo: string; // ID do usuário para quem foi transferido

  @Column({ type: 'text', nullable: true })
  assignmentReason: string; // Motivo da atribuição/transferência

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Métricas de tempo
  @Column({ type: 'timestamp' })
  assignedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  firstResponseAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastResponseAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'int', default: 0 })
  responseCount: number; // Número de respostas do agente

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  responseTimeMinutes: number; // Tempo médio de resposta em minutos

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  resolutionTimeMinutes: number; // Tempo total para resolução

  // Avaliação do atendimento
  @Column({ type: 'int', nullable: true })
  customerRating: number; // 1-5

  @Column({ type: 'text', nullable: true })
  customerFeedback: string;

  @Column({ type: 'int', nullable: true })
  supervisorRating: number; // 1-5

  @Column({ type: 'text', nullable: true })
  supervisorFeedback: string;

  // Informações do contato
  @Column({ nullable: true })
  contactName: string;

  @Column({ nullable: true })
  contactPhone: string;

  @Column({ nullable: true })
  contactType: string; // cliente, fornecedor, motorista, etc.

  // Tags e categorização
  @Column({ type: 'json', nullable: true })
  tags: string[];

  @Column({ nullable: true })
  category: string; // vendas, suporte, logística, etc.

  @Column({ nullable: true })
  subcategory: string;

  // Informações adicionais
  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relacionamentos
  @ManyToOne(() => User, user => user.conversationAssignments)
  @JoinColumn({ name: 'userId' })
  user: User;

  // Métodos auxiliares
  isActive(): boolean {
    return this.status === AssignmentStatus.ACTIVE;
  }

  isCompleted(): boolean {
    return this.status === AssignmentStatus.COMPLETED;
  }

  calculateResponseTime(): number {
    if (!this.firstResponseAt || !this.assignedAt) return 0;
    return (this.firstResponseAt.getTime() - this.assignedAt.getTime()) / (1000 * 60);
  }

  calculateResolutionTime(): number {
    if (!this.completedAt || !this.assignedAt) return 0;
    return (this.completedAt.getTime() - this.assignedAt.getTime()) / (1000 * 60);
  }

  updateResponseMetrics(responseTime: number): void {
    this.responseCount++;
    this.lastResponseAt = new Date();
    
    if (!this.firstResponseAt) {
      this.firstResponseAt = new Date();
      this.responseTimeMinutes = this.calculateResponseTime();
    }
    
    // Atualizar tempo médio de resposta
    if (this.responseTimeMinutes) {
      this.responseTimeMinutes = (this.responseTimeMinutes + responseTime) / 2;
    } else {
      this.responseTimeMinutes = responseTime;
    }
  }

  complete(rating?: number, feedback?: string): void {
    this.status = AssignmentStatus.COMPLETED;
    this.completedAt = new Date();
    this.resolutionTimeMinutes = this.calculateResolutionTime();
    
    if (rating) this.customerRating = rating;
    if (feedback) this.customerFeedback = feedback;
  }

  transfer(toUserId: string, reason?: string): void {
    this.status = AssignmentStatus.TRANSFERRED;
    this.transferredTo = toUserId;
    this.assignmentReason = reason;
    this.completedAt = new Date();
  }

  escalate(toUserId: string, reason?: string): void {
    this.status = AssignmentStatus.ESCALATED;
    this.transferredTo = toUserId;
    this.assignmentReason = reason;
    this.priority = AssignmentPriority.HIGH;
  }
}

