import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query,
  HttpCode,
  HttpStatus 
} from '@nestjs/common';
import { KanbanService } from '../services/kanban.service';
import { KanbanBoard } from '../entities/kanban-board.entity';
import { KanbanColumn } from '../entities/kanban-column.entity';
import { KanbanCard } from '../entities/kanban-card.entity';

@Controller('api/crm/kanban')
export class KanbanController {
  constructor(private readonly kanbanService: KanbanService) {}

  // Boards
  @Get('boards')
  async getAllBoards(@Query('instanceId') instanceId?: string) {
    return await this.kanbanService.getAllBoards(instanceId);
  }

  @Get('boards/:boardId')
  async getBoardById(@Param('boardId') boardId: string) {
    return await this.kanbanService.getBoardById(boardId);
  }

  @Post('boards')
  async createBoard(@Body() boardData: Partial<KanbanBoard>) {
    return await this.kanbanService.createBoard(boardData);
  }

  @Put('boards/:boardId')
  async updateBoard(
    @Param('boardId') boardId: string,
    @Body() boardData: Partial<KanbanBoard>
  ) {
    return await this.kanbanService.updateBoard(boardId, boardData);
  }

  @Delete('boards/:boardId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBoard(@Param('boardId') boardId: string) {
    return await this.kanbanService.deleteBoard(boardId);
  }

  @Get('boards/:boardId/stats')
  async getBoardStats(@Param('boardId') boardId: string) {
    return await this.kanbanService.getBoardStats(boardId);
  }

  // Columns
  @Post('columns')
  async createColumn(@Body() columnData: Partial<KanbanColumn>) {
    return await this.kanbanService.createColumn(columnData);
  }

  @Put('columns/:columnId')
  async updateColumn(
    @Param('columnId') columnId: string,
    @Body() columnData: Partial<KanbanColumn>
  ) {
    return await this.kanbanService.updateColumn(columnId, columnData);
  }

  @Delete('columns/:columnId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteColumn(@Param('columnId') columnId: string) {
    return await this.kanbanService.deleteColumn(columnId);
  }

  // Cards
  @Get('cards/:cardId')
  async getCardById(@Param('cardId') cardId: string) {
    return await this.kanbanService.getCardById(cardId);
  }

  @Post('cards')
  async createCard(@Body() cardData: Partial<KanbanCard>) {
    return await this.kanbanService.createCard(cardData);
  }

  @Put('cards/:cardId')
  async updateCard(
    @Param('cardId') cardId: string,
    @Body() cardData: Partial<KanbanCard>
  ) {
    return await this.kanbanService.updateCard(cardId, cardData);
  }

  @Put('cards/:cardId/move')
  async moveCard(
    @Param('cardId') cardId: string,
    @Body() moveData: { columnId: string; position: number }
  ) {
    return await this.kanbanService.moveCard(cardId, moveData.columnId, moveData.position);
  }

  @Delete('cards/:cardId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCard(@Param('cardId') cardId: string) {
    return await this.kanbanService.deleteCard(cardId);
  }

  @Get('cards/:cardId/activities')
  async getCardActivities(@Param('cardId') cardId: string) {
    return await this.kanbanService.getCardActivities(cardId);
  }

  @Post('cards/:cardId/activities')
  async createCardActivity(
    @Param('cardId') cardId: string,
    @Body() activityData: { type: string; description: string; data?: any }
  ) {
    return await this.kanbanService.createCardActivity({
      cardId,
      userId: 'system', // TODO: Pegar do contexto de autenticação
      ...activityData,
    });
  }
}

