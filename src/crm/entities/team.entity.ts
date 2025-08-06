import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';

export enum TeamStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive'
}

@Entity('teams')
@Index(['name'], { unique: true })
@Index(['status'])
@Index(['supervisorId'])
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: TeamStatus,
    default: TeamStatus.ACTIVE
  })
  status: TeamStatus;

  @Column({ nullable: true })
  supervisorId: string;

  // Configurações da equipe
  @Column({ type: 'json', nullable: true })
  workingHours: {
    monday?: { start: string; end: string; active: boolean };
    tuesday?: { start: string; end: string; active: boolean };
    wednesday?: { start: string; end: string; active: boolean };
    thursday?: { start: string; end: string; active: boolean };
    friday?: { start: string; end: string; active: boolean };
    saturday?: { start: string; end: string; active: boolean };
    sunday?: { start: string; end: string; active: boolean };
  };

  // Instâncias do WhatsApp que a equipe gerencia
  @Column({ type: 'json', nullable: true })
  whatsappInstances: string[];

  // Configurações de distribuição
  @Column({ type: 'json', nullable: true })
  distributionSettings: {
    method: 'round_robin' | 'least_busy' | 'random' | 'manual';
    autoAssign: boolean;
    maxChatsPerAgent: number;
    priorityHandling: boolean;
  };

  // Configurações de escalação
  @Column({ type: 'json', nullable: true })
  escalationSettings: {
    enabled: boolean;
    timeoutMinutes: number;
    escalateTo: 'supervisor' | 'senior_agent' | 'specific_user';
    escalateToUserId?: string;
  };

  // Métricas da equipe
  @Column({ type: 'int', default: 0 })
  totalChatsHandled: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  averageResponseTime: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  averageResolutionTime: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  customerSatisfactionScore: number;

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
  @ManyToOne(() => User)
  @JoinColumn({ name: 'supervisorId' })
  supervisor: User;

  @ManyToMany(() => User)
  @JoinTable({
    name: 'team_members',
    joinColumn: { name: 'teamId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' }
  })
  members: User[];

  // Métodos auxiliares
  isActive(): boolean {
    return this.status === TeamStatus.ACTIVE;
  }

  canHandleInstance(instanceId: string): boolean {
    return this.whatsappInstances?.includes(instanceId) || false;
  }

  getAvailableMembers(): User[] {
    return this.members?.filter(member => member.isAvailable()) || [];
  }

  getMemberCount(): number {
    return this.members?.length || 0;
  }

  getActiveMemberCount(): number {
    return this.members?.filter(member => 
      member.status === 'active' && member.availability !== 'offline'
    ).length || 0;
  }

  calculateTeamCapacity(): number {
    if (!this.members) return 0;
    return this.members.reduce((total, member) => {
      return total + (member.maxConcurrentChats - member.currentChatCount);
    }, 0);
  }

  getNextAgentByMethod(method: string = 'round_robin'): User | null {
    const availableMembers = this.getAvailableMembers();
    if (availableMembers.length === 0) return null;

    switch (method) {
      case 'least_busy':
        return availableMembers.reduce((least, current) => 
          current.currentChatCount < least.currentChatCount ? current : least
        );
      
      case 'random':
        return availableMembers[Math.floor(Math.random() * availableMembers.length)];
      
      case 'round_robin':
      default:
        // Implementação simples de round robin baseada no último agente usado
        // Em uma implementação real, você manteria um contador persistente
        return availableMembers[0];
    }
  }

  updateMetrics(
    chatsHandled: number,
    responseTime: number,
    resolutionTime: number,
    satisfactionScore: number
  ): void {
    this.totalChatsHandled += chatsHandled;
    
    // Calcular médias ponderadas
    const totalChats = this.totalChatsHandled;
    if (totalChats > 0) {
      this.averageResponseTime = (
        (this.averageResponseTime * (totalChats - chatsHandled)) + 
        (responseTime * chatsHandled)
      ) / totalChats;
      
      this.averageResolutionTime = (
        (this.averageResolutionTime * (totalChats - chatsHandled)) + 
        (resolutionTime * chatsHandled)
      ) / totalChats;
      
      this.customerSatisfactionScore = (
        (this.customerSatisfactionScore * (totalChats - chatsHandled)) + 
        (satisfactionScore * chatsHandled)
      ) / totalChats;
    }
  }
}

