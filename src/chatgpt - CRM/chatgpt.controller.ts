import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ChatGPTService } from './chatgpt.service';
import { GenerateSuggestionDto } from './dto/generate-suggestion.dto';

@ApiTags('ChatGPT')
@Controller('chatgpt')
export class ChatGPTController {
  constructor(private readonly chatgptService: ChatGPTService) {}

  @Post('suggest-response')
  @ApiOperation({
    summary: 'Gerar sugestão de resposta baseada nas mensagens',
    description:
      'Analisa o contexto da conversa e gera sugestões inteligentes de resposta usando ChatGPT',
  })
  @ApiResponse({
    status: 200,
    description: 'Sugestões geradas com sucesso',
    schema: {
      type: 'object',
      properties: {
        suggestions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string', description: 'Texto da sugestão' },
              tone: {
                type: 'string',
                description: 'Tom da mensagem (formal, informal, etc.)',
              },
              confidence: {
                type: 'number',
                description: 'Nível de confiança (0-1)',
              },
            },
          },
        },
        context: {
          type: 'object',
          properties: {
            lastMessage: {
              type: 'string',
              description: 'Última mensagem recebida',
            },
            messageType: {
              type: 'string',
              description: 'Tipo da mensagem (texto, áudio, etc.)',
            },
            conversationTopic: {
              type: 'string',
              description: 'Tópico identificado da conversa',
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 500, description: 'Erro interno do servidor' })
  async generateSuggestion(
    @Body() generateSuggestionDto: GenerateSuggestionDto,
  ) {
    try {
      const result = await this.chatgptService.generateResponseSuggestions(
        generateSuggestionDto,
      );
      return result;
    } catch (error) {
      console.error('Erro ao gerar sugestão:', error);
      throw new HttpException(
        'Erro ao gerar sugestão de resposta',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('analyze-conversation')
  @ApiOperation({
    summary: 'Analisar contexto da conversa',
    description:
      'Analisa o histórico de mensagens para identificar tópicos e contexto',
  })
  @ApiResponse({
    status: 200,
    description: 'Análise realizada com sucesso',
    schema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'Tópico principal da conversa' },
        sentiment: {
          type: 'string',
          description: 'Sentimento geral (positivo, neutro, negativo)',
        },
        urgency: {
          type: 'string',
          description: 'Nível de urgência (baixa, média, alta)',
        },
        summary: { type: 'string', description: 'Resumo da conversa' },
        keyPoints: {
          type: 'array',
          items: { type: 'string' },
          description: 'Pontos principais da conversa',
        },
      },
    },
  })
  async analyzeConversation(@Body() data: { messages: any[] }) {
    try {
      const result = await this.chatgptService.analyzeConversation(
        data.messages,
      );
      return result;
    } catch (error) {
      console.error('Erro ao analisar conversa:', error);
      throw new HttpException(
        'Erro ao analisar conversa',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
