import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, FindManyOptions } from 'typeorm';
import { Team, TeamStatus } from '../entities/team.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class TeamRepository {
  constructor(
    @InjectRepository(Team)
    private readonly repository: Repository<Team>,
  ) {}

  async create(teamData: Partial<Team>): Promise<Team> {
    const team = this.repository.create(teamData);
    return await this.repository.save(team);
  }

  async findById(id: string): Promise<Team | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['supervisor', 'members']
    });
  }

  async findByName(name: string): Promise<Team | null> {
    return await this.repository.findOne({
      where: { name },
      relations: ['supervisor', 'members']
    });
  }

  async findAll(options?: FindManyOptions<Team>): Promise<Team[]> {
    return await this.repository.find({
      ...options,
      relations: ['supervisor', 'members']
    });
  }

  async findByStatus(status: TeamStatus): Promise<Team[]> {
    return await this.repository.find({
      where: { status },
      relations: ['supervisor', 'members']
    });
  }

  async findBySupervisor(supervisorId: string): Promise<Team[]> {
    return await this.repository.find({
      where: { supervisorId },
      relations: ['supervisor', 'members']
    });
  }

  async findByInstance(instanceId: string): Promise<Team[]> {
    return await this.repository
      .createQueryBuilder('team')
      .where('team.status = :status', { status: TeamStatus.ACTIVE })
      .andWhere('JSON_CONTAINS(team.whatsappInstances, :instance)', { 
        instance: JSON.stringify([instanceId])
      })
      .leftJoinAndSelect('team.supervisor', 'supervisor')
      .leftJoinAndSelect('team.members', 'members')
      .getMany();
  }

  async findActiveTeams(): Promise<Team[]> {
    return await this.repository.find({
      where: { status: TeamStatus.ACTIVE },
      relations: ['supervisor', 'members']
    });
  }

  async findTeamsWithCapacity(instanceId?: string): Promise<Team[]> {
    let query = this.repository
      .createQueryBuilder('team')
      .leftJoinAndSelect('team.members', 'members')
      .leftJoinAndSelect('team.supervisor', 'supervisor')
      .where('team.status = :status', { status: TeamStatus.ACTIVE })
      .andWhere('members.status = :memberStatus', { memberStatus: 'active' })
      .andWhere('members.currentChatCount < members.maxConcurrentChats');

    if (instanceId) {
      query = query.andWhere('JSON_CONTAINS(team.whatsappInstances, :instance)', { 
        instance: JSON.stringify([instanceId])
      });
    }

    return await query.getMany();
  }

  async addMembers(teamId: string, userIds: string[]): Promise<Team | null> {
    const team = await this.repository.findOne({
      where: { id: teamId },
      relations: ['members']
    });

    if (!team) return null;

    // Buscar usuários para adicionar
    const users = await this.repository.manager.find(User, {
      where: userIds.map(id => ({ id }))
    });

    // Adicionar apenas usuários que não estão na equipe
    const existingMemberIds = team.members.map(member => member.id);
    const newMembers = users.filter(user => !existingMemberIds.includes(user.id));

    team.members = [...team.members, ...newMembers];
    await this.repository.save(team);

    return await this.findById(teamId);
  }

  async removeMembers(teamId: string, userIds: string[]): Promise<Team | null> {
    const team = await this.repository.findOne({
      where: { id: teamId },
      relations: ['members']
    });

    if (!team) return null;

    // Remover usuários da equipe
    team.members = team.members.filter(member => !userIds.includes(member.id));
    await this.repository.save(team);

    return await this.findById(teamId);
  }

  async setMembers(teamId: string, userIds: string[]): Promise<Team | null> {
    const team = await this.repository.findOne({
      where: { id: teamId },
      relations: ['members']
    });

    if (!team) return null;

    // Buscar novos membros
    const users = await this.repository.manager.find(User, {
      where: userIds.map(id => ({ id }))
    });

    team.members = users;
    await this.repository.save(team);

    return await this.findById(teamId);
  }

  async update(id: string, updateData: Partial<Team>): Promise<Team | null> {
    await this.repository.update(id, updateData);
    return await this.findById(id);
  }

  async updateMetrics(
    id: string,
    totalChats: number,
    avgResponseTime: number,
    avgResolutionTime: number,
    satisfactionScore: number
  ): Promise<Team | null> {
    await this.repository.update(id, {
      totalChatsHandled: totalChats,
      averageResponseTime: avgResponseTime,
      averageResolutionTime: avgResolutionTime,
      customerSatisfactionScore: satisfactionScore
    });
    return await this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async softDelete(id: string): Promise<Team | null> {
    await this.repository.update(id, { 
      status: TeamStatus.INACTIVE
    });
    return await this.findById(id);
  }

  async count(where?: FindOptionsWhere<Team>): Promise<number> {
    return await this.repository.count({ where });
  }

  async getStatistics(): Promise<{
    total: number;
    active: number;
    inactive: number;
    totalMembers: number;
    averageMembersPerTeam: number;
    teamsWithSupervisor: number;
  }> {
    const [
      total,
      active,
      inactive,
      teamsWithSupervisor
    ] = await Promise.all([
      this.count(),
      this.count({ status: TeamStatus.ACTIVE }),
      this.count({ status: TeamStatus.INACTIVE }),
      this.repository.count({ where: { supervisorId: { $ne: null } } })
    ]);

    // Calcular total de membros
    const teamsWithMembers = await this.repository
      .createQueryBuilder('team')
      .leftJoinAndSelect('team.members', 'members')
      .getMany();

    const totalMembers = teamsWithMembers.reduce((sum, team) => 
      sum + (team.members?.length || 0), 0
    );

    const averageMembersPerTeam = total > 0 ? totalMembers / total : 0;

    return {
      total,
      active,
      inactive,
      totalMembers,
      averageMembersPerTeam: Math.round(averageMembersPerTeam * 100) / 100,
      teamsWithSupervisor
    };
  }

  async search(query: string): Promise<Team[]> {
    return await this.repository
      .createQueryBuilder('team')
      .where('team.name LIKE :query', { query: `%${query}%` })
      .orWhere('team.description LIKE :query', { query: `%${query}%` })
      .leftJoinAndSelect('team.supervisor', 'supervisor')
      .leftJoinAndSelect('team.members', 'members')
      .getMany();
  }

  async findTeamsByMember(userId: string): Promise<Team[]> {
    return await this.repository
      .createQueryBuilder('team')
      .leftJoinAndSelect('team.members', 'members')
      .leftJoinAndSelect('team.supervisor', 'supervisor')
      .where('members.id = :userId', { userId })
      .getMany();
  }

  async getTeamCapacity(teamId: string): Promise<{
    totalCapacity: number;
    usedCapacity: number;
    availableCapacity: number;
    memberCount: number;
    activeMemberCount: number;
  }> {
    const team = await this.repository.findOne({
      where: { id: teamId },
      relations: ['members']
    });

    if (!team || !team.members) {
      return {
        totalCapacity: 0,
        usedCapacity: 0,
        availableCapacity: 0,
        memberCount: 0,
        activeMemberCount: 0
      };
    }

    const totalCapacity = team.members.reduce((sum, member) => 
      sum + member.maxConcurrentChats, 0
    );

    const usedCapacity = team.members.reduce((sum, member) => 
      sum + member.currentChatCount, 0
    );

    const activeMemberCount = team.members.filter(member => 
      member.status === 'active' && member.availability !== 'offline'
    ).length;

    return {
      totalCapacity,
      usedCapacity,
      availableCapacity: totalCapacity - usedCapacity,
      memberCount: team.members.length,
      activeMemberCount
    };
  }

  async findBestTeamForAssignment(instanceId: string): Promise<Team | null> {
    const teams = await this.findTeamsWithCapacity(instanceId);
    
    if (teams.length === 0) return null;

    // Encontrar equipe com maior capacidade disponível
    let bestTeam = teams[0];
    let bestCapacity = 0;

    for (const team of teams) {
      const capacity = await this.getTeamCapacity(team.id);
      if (capacity.availableCapacity > bestCapacity) {
        bestCapacity = capacity.availableCapacity;
        bestTeam = team;
      }
    }

    return bestCapacity > 0 ? bestTeam : null;
  }
}

