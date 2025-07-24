import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  Query,
  HttpStatus,
  HttpException
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { CardsService } from './cards.service';
import { CreateCardDto } from '../common/dto/create-card.dto';
import { ICardData } from '../common/interfaces/card-data.interface';

@ApiTags('cards')
@Controller('cards')
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar novo card de preços' })
  @ApiBody({ 
    description: 'Dados do card extraídos pelo ChatGPT',
    schema: {
      type: 'object',
      properties: {
        titulo: { type: 'string', example: 'Preços Grãos - 21/Jul' },
        dataReferencia: { type: 'string', format: 'date', example: '2024-07-21' },
        cotacaoDolar: { type: 'number', example: 5.56 },
        cbot: { type: 'number', example: -14.5 },
        observacoes: { type: 'string', example: 'Preços sujeitos a alterações' },
        produtos: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              nome: { type: 'string', example: 'SOJA' },
              safra: { type: 'string', example: '2024/2025' },
              modalidade: { type: 'string', example: 'FOB' },
              uf: { type: 'string', example: 'GO' },
              municipio: { type: 'string', example: 'PADRE BERNARDO' },
              precos: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    embarque: { type: 'string', example: 'SETEMBRO' },
                    pagamento: { type: 'string', format: 'date', example: '2025-09-22' },
                    precoUsd: { type: 'number', example: 21.70 },
                    precoBrl: { type: 'number', example: 122.55 }
                  }
                }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Card criado com sucesso',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        titulo: { type: 'string' },
        dataReferencia: { type: 'string', format: 'date-time' },
        createdAt: { type: 'string', format: 'date-time' }
      }
    }
  })
  async create(@Body() createCardDto: ICardData) {
    try {
      const card = await this.cardsService.create(createCardDto);
      
      return {
        id: card.id,
        titulo: card.titulo,
        dataReferencia: card.dataReferencia,
        cotacaoDolar: card.cotacaoDolar,
        cbot: card.cbot,
        totalProdutos: card.produtos?.length || 0,
        totalPrecos: card.produtos?.reduce((total, produto) => total + (produto.precos?.length || 0), 0) || 0,
        createdAt: card.createdAt,
        message: 'Card salvo com sucesso no banco de dados'
      };
    } catch (error) {
      throw new HttpException(
        `Erro ao salvar card: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os cards' })
  @ApiQuery({ name: 'produto', required: false, description: 'Filtrar por nome do produto' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Data inicial (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Data final (YYYY-MM-DD)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de cards',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          titulo: { type: 'string' },
          dataReferencia: { type: 'string', format: 'date-time' },
          produtos: { type: 'array' }
        }
      }
    }
  })
  async findAll(
    @Query('produto') produto?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      let cards;

      if (produto) {
        cards = await this.cardsService.findByProduct(produto);
      } else if (startDate && endDate) {
        cards = await this.cardsService.findByDateRange(
          new Date(startDate),
          new Date(endDate)
        );
      } else {
        cards = await this.cardsService.findAll();
      }

      return cards.map(card => ({
        id: card.id,
        titulo: card.titulo,
        dataReferencia: card.dataReferencia,
        cotacaoDolar: card.cotacaoDolar,
        cbot: card.cbot,
        observacoes: card.observacoes,
        totalProdutos: card.produtos?.length || 0,
        totalPrecos: card.produtos?.reduce((total, produto) => total + (produto.precos?.length || 0), 0) || 0,
        createdAt: card.createdAt,
        produtos: card.produtos?.map(produto => ({
          id: produto.id,
          nome: produto.nome,
          safra: produto.safra,
          modalidade: produto.modalidade,
          uf: produto.uf,
          municipio: produto.municipio,
          precos: produto.precos?.map(preco => ({
            id: preco.id,
            embarque: preco.embarque,
            pagamento: preco.pagamento,
            precoUsd: preco.precoUsd,
            precoBrl: preco.precoBrl
          }))
        }))
      }));
    } catch (error) {
      throw new HttpException(
        `Erro ao buscar cards: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Obter estatísticas gerais' })
  @ApiResponse({ 
    status: 200, 
    description: 'Estatísticas do sistema',
    schema: {
      type: 'object',
      properties: {
        totalCards: { type: 'number' },
        totalProdutos: { type: 'number' },
        totalPrecos: { type: 'number' },
        ultimaAtualizacao: { type: 'string', format: 'date-time' }
      }
    }
  })
  async getStatistics() {
    try {
      return await this.cardsService.getStatistics();
    } catch (error) {
      throw new HttpException(
        `Erro ao obter estatísticas: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar card por ID' })
  @ApiParam({ name: 'id', description: 'ID do card' })
  @ApiResponse({ 
    status: 200, 
    description: 'Card encontrado',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        titulo: { type: 'string' },
        produtos: { type: 'array' }
      }
    }
  })
  async findOne(@Param('id') id: string) {
    try {
      const card = await this.cardsService.findOne(id);
      
      return {
        id: card.id,
        titulo: card.titulo,
        dataReferencia: card.dataReferencia,
        cotacaoDolar: card.cotacaoDolar,
        cbot: card.cbot,
        observacoes: card.observacoes,
        createdAt: card.createdAt,
        updatedAt: card.updatedAt,
        produtos: card.produtos?.map(produto => ({
          id: produto.id,
          nome: produto.nome,
          safra: produto.safra,
          modalidade: produto.modalidade,
          uf: produto.uf,
          municipio: produto.municipio,
          precos: produto.precos?.map(preco => ({
            id: preco.id,
            embarque: preco.embarque,
            pagamento: preco.pagamento,
            precoUsd: preco.precoUsd,
            precoBrl: preco.precoBrl
          }))
        }))
      };
    } catch (error) {
      if (error.status === 404) {
        throw error;
      }
      throw new HttpException(
        `Erro ao buscar card: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar card' })
  @ApiParam({ name: 'id', description: 'ID do card' })
  @ApiResponse({ status: 200, description: 'Card atualizado com sucesso' })
  async update(@Param('id') id: string, @Body() updateCardDto: Partial<ICardData>) {
    try {
      const card = await this.cardsService.update(id, updateCardDto);
      
      return {
        id: card.id,
        titulo: card.titulo,
        dataReferencia: card.dataReferencia,
        updatedAt: card.updatedAt,
        message: 'Card atualizado com sucesso'
      };
    } catch (error) {
      if (error.status === 404) {
        throw error;
      }
      throw new HttpException(
        `Erro ao atualizar card: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover card' })
  @ApiParam({ name: 'id', description: 'ID do card' })
  @ApiResponse({ status: 200, description: 'Card removido com sucesso' })
  async remove(@Param('id') id: string) {
    try {
      await this.cardsService.remove(id);
      
      return {
        message: 'Card removido com sucesso'
      };
    } catch (error) {
      if (error.status === 404) {
        throw error;
      }
      throw new HttpException(
        `Erro ao remover card: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
