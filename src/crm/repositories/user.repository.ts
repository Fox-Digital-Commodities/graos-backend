import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, FindManyOptions } from 'typeorm';
import { User, UserRole, UserStatus, UserAvailability } from '../entities/user.entity';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  async create(userData: Partial<User>): Promise<User> {
    const user = this.repository.create(userData);
    return await this.repository.save(user);
  }

  async findById(id: string): Promise<User | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['conversationAssignments']
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.repository.findOne({
      where: { email }
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return await this.repository.findOne({
      where: { username }
    });
  }

  async findAll(options?: FindManyOptions<User>): Promise<User[]> {
    return await this.repository.find({
      ...options,
      relations: ['conversationAssignments']
    });
  }

  async findByRole(role: UserRole): Promise<User[]> {
    return await this.repository.find({
      where: { role },
      relations: ['conversationAssignments']
    });
  }

  async findByStatus(status: UserStatus): Promise<User[]> {
    return await this.repository.find({
      where: { status },
      relations: ['conversationAssignments']
    });
  }

  async findByAvailability(availability: UserAvailability): Promise<User[]> {
    return await this.repository.find({
      where: { availability },
      relations: ['conversationAssignments']
    });
  }

  async findAvailableAgents(): Promise<User[]> {
    return await this.repository
      .createQueryBuilder('user')
      .where('user.status = :status', { status: UserStatus.ACTIVE })
      .andWhere('user.availability = :availability', { availability: UserAvailability.AVAILABLE })
      .andWhere('user.currentChatCount < user.maxConcurrentChats')
      .leftJoinAndSelect('user.conversationAssignments', 'assignments')
      .getMany();
  }

  async findByInstance(instanceId: string): Promise<User[]> {
    return await this.repository
      .createQueryBuilder('user')
      .where('user.status = :status', { status: UserStatus.ACTIVE })
      .andWhere('JSON_CONTAINS(user.permissions, :instance)', { 
        instance: JSON.stringify({ whatsappInstances: [instanceId] })
      })
      .leftJoinAndSelect('user.conversationAssignments', 'assignments')
      .getMany();
  }

  async findAvailableByInstance(instanceId: string): Promise<User[]> {
    return await this.repository
      .createQueryBuilder('user')
      .where('user.status = :status', { status: UserStatus.ACTIVE })
      .andWhere('user.availability = :availability', { availability: UserAvailability.AVAILABLE })
      .andWhere('user.currentChatCount < user.maxConcurrentChats')
      .andWhere('JSON_CONTAINS(user.permissions, :instance)', { 
        instance: JSON.stringify({ whatsappInstances: [instanceId] })
      })
      .leftJoinAndSelect('user.conversationAssignments', 'assignments')
      .getMany();
  }

  async findLeastBusyAgent(instanceId?: string): Promise<User | null> {
    let query = this.repository
      .createQueryBuilder('user')
      .where('user.status = :status', { status: UserStatus.ACTIVE })
      .andWhere('user.availability = :availability', { availability: UserAvailability.AVAILABLE })
      .andWhere('user.currentChatCount < user.maxConcurrentChats')
      .orderBy('user.currentChatCount', 'ASC')
      .addOrderBy('user.lastActivityAt', 'DESC');

    if (instanceId) {
      query = query.andWhere('JSON_CONTAINS(user.permissions, :instance)', { 
        instance: JSON.stringify({ whatsappInstances: [instanceId] })
      });
    }

    return await query.getOne();
  }

  async update(id: string, updateData: Partial<User>): Promise<User | null> {
    await this.repository.update(id, updateData);
    return await this.findById(id);
  }

  async updateAvailability(id: string, availability: UserAvailability): Promise<User | null> {
    await this.repository.update(id, { 
      availability,
      lastActivityAt: new Date()
    });
    return await this.findById(id);
  }

  async updateChatCount(id: string, increment: number): Promise<User | null> {
    await this.repository
      .createQueryBuilder()
      .update(User)
      .set({ 
        currentChatCount: () => `currentChatCount + ${increment}`,
        lastActivityAt: new Date()
      })
      .where('id = :id', { id })
      .execute();
    
    return await this.findById(id);
  }

  async updateLastActivity(id: string): Promise<void> {
    await this.repository.update(id, { 
      lastActivityAt: new Date()
    });
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.repository.update(id, { 
      lastLoginAt: new Date(),
      lastActivityAt: new Date()
    });
  }

  async updateMetrics(
    id: string, 
    totalChats: number, 
    avgResponseTime: number, 
    satisfactionScore: number
  ): Promise<User | null> {
    await this.repository.update(id, {
      totalChatsHandled: totalChats,
      averageResponseTime: avgResponseTime,
      customerSatisfactionScore: satisfactionScore
    });
    return await this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async softDelete(id: string): Promise<User | null> {
    await this.repository.update(id, { 
      status: UserStatus.INACTIVE,
      availability: UserAvailability.OFFLINE
    });
    return await this.findById(id);
  }

  async count(where?: FindOptionsWhere<User>): Promise<number> {
    return await this.repository.count({ where });
  }

  async getStatistics(): Promise<{
    total: number;
    active: number;
    available: number;
    busy: number;
    offline: number;
    byRole: Record<UserRole, number>;
  }> {
    const [
      total,
      active,
      available,
      busy,
      offline,
      admins,
      supervisors,
      agents,
      viewers
    ] = await Promise.all([
      this.count(),
      this.count({ status: UserStatus.ACTIVE }),
      this.count({ availability: UserAvailability.AVAILABLE }),
      this.count({ availability: UserAvailability.BUSY }),
      this.count({ availability: UserAvailability.OFFLINE }),
      this.count({ role: UserRole.ADMIN }),
      this.count({ role: UserRole.SUPERVISOR }),
      this.count({ role: UserRole.AGENT }),
      this.count({ role: UserRole.VIEWER })
    ]);

    return {
      total,
      active,
      available,
      busy,
      offline,
      byRole: {
        [UserRole.ADMIN]: admins,
        [UserRole.SUPERVISOR]: supervisors,
        [UserRole.AGENT]: agents,
        [UserRole.VIEWER]: viewers
      }
    };
  }

  async search(query: string): Promise<User[]> {
    return await this.repository
      .createQueryBuilder('user')
      .where('user.fullName LIKE :query', { query: `%${query}%` })
      .orWhere('user.username LIKE :query', { query: `%${query}%` })
      .orWhere('user.email LIKE :query', { query: `%${query}%` })
      .leftJoinAndSelect('user.conversationAssignments', 'assignments')
      .getMany();
  }

  async findOnlineUsers(): Promise<User[]> {
    return await this.repository.find({
      where: [
        { availability: UserAvailability.AVAILABLE },
        { availability: UserAvailability.BUSY },
        { availability: UserAvailability.AWAY }
      ],
      relations: ['conversationAssignments']
    });
  }

  async findUsersWithCapacity(): Promise<User[]> {
    return await this.repository
      .createQueryBuilder('user')
      .where('user.status = :status', { status: UserStatus.ACTIVE })
      .andWhere('user.currentChatCount < user.maxConcurrentChats')
      .leftJoinAndSelect('user.conversationAssignments', 'assignments')
      .getMany();
  }
}

