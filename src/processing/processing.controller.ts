import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  Param, 
  HttpStatus, 
  HttpException,
  Delete
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { ProcessingService } from './processing.service';
import { ProcessingStatusDto } from '../common/dto/upload.dto';

class ProcessTextDto {
  @ApiProperty({
    description: 'Texto do card de preços para processamento',
    example: 'SOJA 2024/2025 FOB - GO PADRE BERNARDO\nSetembro: R$ 122,55 (US$ 21,70) - Pagamento 22/09/2025'
  })
  @IsString()
  @IsNotEmpty()
  text: string;
}

class ProcessFileDto {
  @ApiProperty({
    description: 'ID do arquivo enviado'
  })
  @IsString()
  @IsNotEmpty()
  fileId: string;

  @ApiProperty({
    description: 'Caminho do arquivo no servidor'
  })
  @IsString()
  filePath: string;
}

@ApiTags('processing')
@Controller('processing')
export class ProcessingController {
  constructor(private readonly processingService: ProcessingService) {}

  @Post('analyze-file')
  @ApiOperation({ summary: 'Processar arquivo com ChatGPT' })
  @ApiBody({ type: ProcessFileDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Processamento iniciado',
    schema: {
      type: 'object',
      properties: {
        jobId: { type: 'string' },
        message: { type: 'string' }
      }
    }
  })
  async analyzeFile(@Body() body: ProcessFileDto) {
    try {
      const jobId = await this.processingService.processFile(body.fileId, body.filePath);
      
      return {
        jobId,
        message: 'Processamento iniciado com sucesso'
      };
    } catch (error) {
      throw new HttpException(
        `Erro ao iniciar processamento: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('analyze-text')
  @ApiOperation({ summary: 'Processar texto direto com ChatGPT' })
  @ApiBody({ 
    type: ProcessTextDto,
    description: 'Texto do card de preços para processamento'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Processamento de texto iniciado',
    schema: {
      type: 'object',
      properties: {
        jobId: { type: 'string' },
        message: { type: 'string' }
      }
    }
  })
  async analyzeText(@Body() body: ProcessTextDto) {
    try {
      if (!body.text || body.text.trim().length === 0) {
        throw new HttpException(
          'Conteúdo de texto é obrigatório',
          HttpStatus.BAD_REQUEST
        );
      }

      const jobId = await this.processingService.processText(body.text);
      
      return {
        jobId,
        message: 'Processamento de texto iniciado com sucesso'
      };
    } catch (error) {
      throw new HttpException(
        `Erro ao processar texto: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('status/:jobId')
  @ApiOperation({ summary: 'Verificar status do processamento' })
  @ApiParam({ name: 'jobId', description: 'ID do job de processamento' })
  @ApiResponse({ 
    status: 200, 
    description: 'Status do processamento',
    type: ProcessingStatusDto
  })
  async getStatus(@Param('jobId') jobId: string) {
    try {
      const job = await this.processingService.getProcessingStatus(jobId);
      
      return {
        id: job.id,
        status: job.status,
        progress: job.progress,
        message: this.getStatusMessage(job.status, job.progress),
        result: job.result,
        error: job.error,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt
      };
    } catch (error) {
      throw new HttpException(
        error.message,
        HttpStatus.NOT_FOUND
      );
    }
  }

  @Get('jobs')
  @ApiOperation({ summary: 'Listar todos os jobs de processamento' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de jobs de processamento',
    schema: {
      type: 'array',
      items: { $ref: '#/components/schemas/ProcessingStatusDto' }
    }
  })
  async getAllJobs() {
    try {
      const jobs = await this.processingService.getAllJobs();
      
      return jobs.map(job => ({
        id: job.id,
        status: job.status,
        progress: job.progress,
        message: this.getStatusMessage(job.status, job.progress),
        result: job.result,
        error: job.error,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt
      }));
    } catch (error) {
      throw new HttpException(
        `Erro ao listar jobs: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete('jobs/:jobId')
  @ApiOperation({ summary: 'Remover job de processamento' })
  @ApiParam({ name: 'jobId', description: 'ID do job a ser removido' })
  @ApiResponse({ 
    status: 200, 
    description: 'Job removido com sucesso'
  })
  async removeJob(@Param('jobId') jobId: string) {
    try {
      await this.processingService.removeJob(jobId);
      
      return {
        message: 'Job removido com sucesso'
      };
    } catch (error) {
      throw new HttpException(
        `Erro ao remover job: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('test-connection')
  @ApiOperation({ summary: 'Testar conexão com ChatGPT' })
  @ApiResponse({ 
    status: 200, 
    description: 'Resultado do teste de conexão',
    schema: {
      type: 'object',
      properties: {
        connected: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  })
  async testConnection() {
    try {
      const connected = await this.processingService.testChatGPTConnection();
      
      return {
        connected,
        message: connected 
          ? 'Conexão com ChatGPT estabelecida com sucesso' 
          : 'Falha na conexão com ChatGPT'
      };
    } catch (error) {
      throw new HttpException(
        `Erro ao testar conexão: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('cleanup')
  @ApiOperation({ summary: 'Limpar jobs antigos (mais de 24h)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Limpeza realizada',
    schema: {
      type: 'object',
      properties: {
        cleaned: { type: 'number' },
        message: { type: 'string' }
      }
    }
  })
  async cleanupJobs() {
    try {
      const cleaned = await this.processingService.cleanupOldJobs();
      
      return {
        cleaned,
        message: `${cleaned} jobs antigos foram removidos`
      };
    } catch (error) {
      throw new HttpException(
        `Erro na limpeza: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Gera mensagem de status baseada no estado atual
   */
  private getStatusMessage(status: string, progress: number): string {
    switch (status) {
      case 'pending':
        return 'Aguardando processamento...';
      case 'processing':
        if (progress < 30) return 'Preparando arquivo...';
        if (progress < 70) return 'Processando com ChatGPT...';
        if (progress < 90) return 'Finalizando extração...';
        return 'Quase concluído...';
      case 'completed':
        return 'Processamento concluído com sucesso';
      case 'error':
        return 'Erro no processamento';
      default:
        return 'Status desconhecido';
    }
  }
}
