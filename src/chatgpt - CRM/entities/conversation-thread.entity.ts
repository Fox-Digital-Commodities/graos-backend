import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  Index,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity('conversation_threads')
@Index(['conversationId']) // Índice para busca rápida por conversa
@Index(['threadId']) // Índice para busca rápida por thread
export class ConversationThread {
  @PrimaryColumn('uuid')
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }

  @Column({ name: 'conversation_id', nullable: false })
  conversationId: string;

  @Column({ name: 'thread_id', nullable: false })
  threadId: string;

  @Column({ name: 'assistant_id', nullable: false })
  assistantId: string;

  @Column({ name: 'last_message_count', default: 0 })
  lastMessageCount: number;

  @Column({ name: 'total_suggestions_generated', default: 0 })
  totalSuggestionsGenerated: number;

  @Column({ type: 'timestamp', name: 'last_used_at', nullable: true })
  lastUsedAt: Date;

  @Column({ type: 'json', nullable: true })
  metadata: {
    contactName?: string;
    contactPhone?: string;
    businessContext?: string;
    lastMessageType?: string;
    conversationTopic?: string;
  };

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Método para verificar se thread deve ser reutilizada
  canReuse(currentMessageCount: number): boolean {
    // Reutilizar se:
    // 1. Thread está ativa
    // 2. Não passou muito tempo desde último uso (24 horas)
    // 3. Número de mensagens não mudou drasticamente (diferença < 50)
    
    if (!this.isActive) return false;
    
    const now = new Date();
    const lastUsed = this.lastUsedAt || this.updatedAt;
    const hoursSinceLastUse = (now.getTime() - lastUsed.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceLastUse > 24) return false;
    
    const messageDifference = Math.abs(currentMessageCount - this.lastMessageCount);
    if (messageDifference > 50) return false;
    
    return true;
  }

  // Método para atualizar uso da thread
  updateUsage(messageCount: number, metadata?: any) {
    this.lastMessageCount = messageCount;
    this.lastUsedAt = new Date();
    this.totalSuggestionsGenerated += 1;
    
    if (metadata) {
      this.metadata = { ...this.metadata, ...metadata };
    }
  }
}

