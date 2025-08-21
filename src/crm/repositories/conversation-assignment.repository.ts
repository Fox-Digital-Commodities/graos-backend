import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, FindManyOptions, Between } from 'typeorm';
import { ConversationAssignment, AssignmentStatus, AssignmentPriority } from '../entities/conversation-assignment.entity';

@Injectable()
export class ConversationAssignmentRepository {
  constructor(
    @InjectRepository(ConversationAssignment)
    private readonly repository: Repository<ConversationAssignment>,
  ) {}

  async create(assignmentData: Partial<ConversationAssignment>): Promise<ConversationAssignment> {
    const assignment = this.repository.create({
      ...assignmentData,
      assignedAt: new Date()
    });
    return await this.repository.save(assignment);
  }

  async findById(id: string): Promise<ConversationAssignment | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['user']
    });
  }

  async findByConversationId(conversationId: string): Promise<ConversationAssignment[]> {
    return await this.repository.find({
      where: { conversationId },
      relations: ['user'],
      order: { assignedAt: 'DESC' }
    });
  }

  async findActiveByConversationId(conversationId: string): Promise<ConversationAssignment | null> {
    return await this.repository.findOne({
      where: { 
        conversationId,
        status: AssignmentStatus.ACTIVE
      },
      relations: ['user']
    });
  }

  async findByUserId(userId: string, status?: AssignmentStatus): Promise<ConversationAssignment[]> {
    const where: FindOptionsWhere<ConversationAssignment> = { userId };
    if (status) where.status = status;

    return await this.repository.find({
      where,
      relations: ['user'],
      order: { assignedAt: 'DESC' }
    });
  }

  async findActiveByUserId(userId: string): Promise<ConversationAssignment[]> {
    return await this.repository.find({
      where: { 
        userId,
        status: AssignmentStatus.ACTIVE
      },
      relations: ['user'],
      order: { assignedAt: 'DESC' }
    });
  }

  async findByInstance(instanceId: string, status?: AssignmentStatus): Promise<ConversationAssignment[]> {
    const where: FindOptionsWhere<ConversationAssignment> = { whatsappInstanceId: instanceId };
    if (status) where.status = status;

    return await this.repository.find({
      where,
      relations: ['user'],
      order: { assignedAt: 'DESC' }
    });
  }

  async findByPriority(priority: AssignmentPriority): Promise<ConversationAssignment[]> {
    return await this.repository.find({
      where: { priority },
      relations: ['user'],
      order: { assignedAt: 'DESC' }
    });
  }

  async findPendingAssignments(): Promise<ConversationAssignment[]> {
    return await this.repository.find({
      where: { status: AssignmentStatus.ACTIVE },
      relations: ['user'],
      order: { priority: 'DESC', assignedAt: 'ASC' }
    });
  }

  async findOverdueAssignments(timeoutMinutes: number = 30): Promise<ConversationAssignment[]> {
    const timeoutDate = new Date();
    timeoutDate.setMinutes(timeoutDate.getMinutes() - timeoutMinutes);

    return await this.repository
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.user', 'user')
      .where('assignment.status = :status', { status: AssignmentStatus.ACTIVE })
      .andWhere('assignment.assignedAt < :timeoutDate', { timeoutDate })
      .andWhere('assignment.firstResponseAt IS NULL')
      .orderBy('assignment.assignedAt', 'ASC')
      .getMany();
  }

  async findAll(options?: FindManyOptions<ConversationAssignment>): Promise<ConversationAssignment[]> {
    return await this.repository.find({
      ...options,
      relations: ['user']
    });
  }

  async update(id: string, updateData: Partial<ConversationAssignment>): Promise<ConversationAssignment | null> {
    await this.repository.update(id, updateData);
    return await this.findById(id);
  }

  async updateStatus(id: string, status: AssignmentStatus): Promise<ConversationAssignment | null> {
    const updateData: Partial<ConversationAssignment> = { status };
    
    if (status === AssignmentStatus.COMPLETED) {
      updateData.completedAt = new Date();
    }

    await this.repository.update(id, updateData);
    return await this.findById(id);
  }

  async recordResponse(id: string, responseTime?: number): Promise<ConversationAssignment | null> {
    const assignment = await this.findById(id);
    if (!assignment) return null;

    const updateData: Partial<ConversationAssignment> = {
      responseCount: assignment.responseCount + 1,
      lastResponseAt: new Date()
    };

    // Se é a primeira resposta
    if (!assignment.firstResponseAt) {
      updateData.firstResponseAt = new Date();
      updateData.responseTimeMinutes = assignment.calculateResponseTime();
    }

    // Atualizar tempo médio de resposta se fornecido
    if (responseTime !== undefined) {
      if (assignment.responseTimeMinutes) {
        updateData.responseTimeMinutes = (assignment.responseTimeMinutes + responseTime) / 2;
      } else {
        updateData.responseTimeMinutes = responseTime;
      }
    }

    await this.repository.update(id, updateData);
    return await this.findById(id);
  }

  async complete(
    id: string, 
    rating?: number, 
    feedback?: string,
    supervisorRating?: number,
    supervisorFeedback?: string
  ): Promise<ConversationAssignment | null> {
    const assignment = await this.findById(id);
    if (!assignment) return null;

    const updateData: Partial<ConversationAssignment> = {
      status: AssignmentStatus.COMPLETED,
      completedAt: new Date(),
      resolutionTimeMinutes: assignment.calculateResolutionTime()
    };

    if (rating) updateData.customerRating = rating;
    if (feedback) updateData.customerFeedback = feedback;
    if (supervisorRating) updateData.supervisorRating = supervisorRating;
    if (supervisorFeedback) updateData.supervisorFeedback = supervisorFeedback;

    await this.repository.update(id, updateData);
    return await this.findById(id);
  }

  async transfer(id: string, toUserId: string, reason?: string): Promise<ConversationAssignment | null> {
    const assignment = await this.findById(id);
    if (!assignment) return null;

    // Completar atribuição atual
    await this.repository.update(id, {
      status: AssignmentStatus.TRANSFERRED,
      transferredTo: toUserId,
      assignmentReason: reason,
      completedAt: new Date()
    });

    // Criar nova atribuição
    const newAssignment = await this.create({
      conversationId: assignment.conversationId,
      whatsappInstanceId: assignment.whatsappInstanceId,
      userId: toUserId,
      priority: assignment.priority,
      assignmentType: 'transfer',
      transferredFrom: assignment.userId,
      assignmentReason: reason,
      contactName: assignment.contactName,
      contactPhone: assignment.contactPhone,
      contactType: assignment.contactType,
      category: assignment.category,
      subcategory: assignment.subcategory,
      tags: assignment.tags
    });

    return newAssignment;
  }

  async escalate(id: string, toUserId: string, reason?: string): Promise<ConversationAssignment | null> {
    const assignment = await this.findById(id);
    if (!assignment) return null;

    // Completar atribuição atual
    await this.repository.update(id, {
      status: AssignmentStatus.ESCALATED,
      transferredTo: toUserId,
      assignmentReason: reason,
      completedAt: new Date()
    });

    // Criar nova atribuição com prioridade alta
    const newAssignment = await this.create({
      conversationId: assignment.conversationId,
      whatsappInstanceId: assignment.whatsappInstanceId,
      userId: toUserId,
      priority: AssignmentPriority.HIGH,
      assignmentType: 'escalation',
      transferredFrom: assignment.userId,
      assignmentReason: reason,
      contactName: assignment.contactName,
      contactPhone: assignment.contactPhone,
      contactType: assignment.contactType,
      category: assignment.category,
      subcategory: assignment.subcategory,
      tags: assignment.tags
    });

    return newAssignment;
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async count(where?: FindOptionsWhere<ConversationAssignment>): Promise<number> {
    return await this.repository.count({ where });
  }

  async getStatistics(userId?: string, instanceId?: string): Promise<{
    total: number;
    active: number;
    completed: number;
    transferred: number;
    escalated: number;
    abandoned: number;
    averageResponseTime: number;
    averageResolutionTime: number;
    averageRating: number;
  }> {
    const where: FindOptionsWhere<ConversationAssignment> = {};
    if (userId) where.userId = userId;
    if (instanceId) where.whatsappInstanceId = instanceId;

    const [
      total,
      active,
      completed,
      transferred,
      escalated,
      abandoned
    ] = await Promise.all([
      this.count(where),
      this.count({ ...where, status: AssignmentStatus.ACTIVE }),
      this.count({ ...where, status: AssignmentStatus.COMPLETED }),
      this.count({ ...where, status: AssignmentStatus.TRANSFERRED }),
      this.count({ ...where, status: AssignmentStatus.ESCALATED }),
      this.count({ ...where, status: AssignmentStatus.ABANDONED })
    ]);

    // Calcular médias
    const completedAssignments = await this.repository.find({
      where: { ...where, status: AssignmentStatus.COMPLETED },
      select: ['responseTimeMinutes', 'resolutionTimeMinutes', 'customerRating']
    });

    let averageResponseTime = 0;
    let averageResolutionTime = 0;
    let averageRating = 0;

    if (completedAssignments.length > 0) {
      const validResponseTimes = completedAssignments
        .filter(a => a.responseTimeMinutes !== null)
        .map(a => a.responseTimeMinutes);
      
      const validResolutionTimes = completedAssignments
        .filter(a => a.resolutionTimeMinutes !== null)
        .map(a => a.resolutionTimeMinutes);
      
      const validRatings = completedAssignments
        .filter(a => a.customerRating !== null)
        .map(a => a.customerRating);

      if (validResponseTimes.length > 0) {
        averageResponseTime = validResponseTimes.reduce((sum, time) => sum + time, 0) / validResponseTimes.length;
      }

      if (validResolutionTimes.length > 0) {
        averageResolutionTime = validResolutionTimes.reduce((sum, time) => sum + time, 0) / validResolutionTimes.length;
      }

      if (validRatings.length > 0) {
        averageRating = validRatings.reduce((sum, rating) => sum + rating, 0) / validRatings.length;
      }
    }

    return {
      total,
      active,
      completed,
      transferred,
      escalated,
      abandoned,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      averageResolutionTime: Math.round(averageResolutionTime * 100) / 100,
      averageRating: Math.round(averageRating * 100) / 100
    };
  }

  async getAssignmentsByDateRange(
    startDate: Date,
    endDate: Date,
    userId?: string,
    instanceId?: string
  ): Promise<ConversationAssignment[]> {
    const where: FindOptionsWhere<ConversationAssignment> = {
      assignedAt: Between(startDate, endDate)
    };
    
    if (userId) where.userId = userId;
    if (instanceId) where.whatsappInstanceId = instanceId;

    return await this.repository.find({
      where,
      relations: ['user'],
      order: { assignedAt: 'DESC' }
    });
  }

  async getUserWorkload(userId: string): Promise<{
    activeChats: number;
    totalChatsToday: number;
    averageResponseTime: number;
    completionRate: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [activeChats, todayAssignments] = await Promise.all([
      this.count({ userId, status: AssignmentStatus.ACTIVE }),
      this.repository.find({
        where: {
          userId,
          assignedAt: Between(today, tomorrow)
        }
      })
    ]);

    const completedToday = todayAssignments.filter(a => a.status === AssignmentStatus.COMPLETED);
    const completionRate = todayAssignments.length > 0 ? 
      (completedToday.length / todayAssignments.length) * 100 : 0;

    const responseTimes = completedToday
      .filter(a => a.responseTimeMinutes !== null)
      .map(a => a.responseTimeMinutes);
    
    const averageResponseTime = responseTimes.length > 0 ?
      responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0;

    return {
      activeChats,
      totalChatsToday: todayAssignments.length,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      completionRate: Math.round(completionRate * 100) / 100
    };
  }
}

