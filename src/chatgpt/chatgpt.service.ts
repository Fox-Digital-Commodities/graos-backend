import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { GenerateSuggestionDto, MessageDto } from './dto/generate-suggestion.dto';

@Injectable()
export class ChatGPTService {
  private openai: OpenAI;
  private readonly assistantId = 'asst_3pb74nkgV1OLF8s9OL7LxuYX';

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_API_BASE,
    });
  }

  async generateResponseSuggestions(dto: GenerateSuggestionDto) {
    try {
      console.log('Gerando sugestões com assistente:', this.assistantId);
      console.log('Dados recebidos:', JSON.stringify(dto, null, 2));

      // Criar thread
      const thread = await this.openai.beta.threads.create();

      // Preparar contexto da conversa
      const conversationContext = this.formatConversationContext(dto);

      // Adicionar mensagem ao thread
      await this.openai.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: conversationContext,
      });

      // Executar assistente
      const run = await this.openai.beta.threads.runs.create(thread.id, {
        assistant_id: this.assistantId,
      });

      // Aguardar conclusão
      let runStatus = await this.openai.beta.threads.runs.retrieve(thread.id, run.id);
      
      while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await this.openai.beta.threads.runs.retrieve(thread.id, run.id);
      }

      if (runStatus.status === 'completed') {
        // Obter mensagens do thread
        const messages = await this.openai.beta.threads.messages.list(thread.id);
        const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
        
        if (assistantMessage && assistantMessage.content[0].type === 'text') {
          const response = assistantMessage.content[0].text.value;
          console.log('Resposta do assistente:', response);
          
          const suggestions = this.parseResponseSuggestions(response);
          console.log('Sugestões parseadas:', suggestions);
          
          return {
            suggestions,
            conversationAnalysis: {
              topic: 'Conversa de negócios',
              sentiment: 'neutro',
              urgency: 'média',
              summary: 'Análise via assistente',
              keyPoints: []
            }
          };
        }
      }

      throw new Error(`Assistente falhou com status: ${runStatus.status}`);

    } catch (error) {
      console.error('Erro ao gerar sugestões:', error);
      throw new Error(`Falha ao gerar sugestões: ${error.message}`);
    }
  }

  private formatConversationContext(dto: GenerateSuggestionDto): string {
    const { messages, businessContext, contactInfo } = dto;
    
    let context = `Contexto do negócio: ${businessContext}\n\n`;
    
    if (contactInfo) {
      context += `Informações do contato:\n`;
      context += `- Nome: ${contactInfo.name}\n`;
      if (contactInfo.company) context += `- Empresa: ${contactInfo.company}\n`;
      if (contactInfo.relationship) context += `- Relacionamento: ${contactInfo.relationship}\n`;
      context += '\n';
    }
    
    context += 'Histórico da conversa:\n';
    
    const recentMessages = messages.slice(-10); // Últimas 10 mensagens
    recentMessages.forEach((msg, index) => {
      const sender = msg.fromMe ? 'Eu' : (contactInfo?.name || 'Cliente');
      const timestamp = msg.timestamp ? new Date(msg.timestamp * 1000).toLocaleString('pt-BR') : '';
      
      if (msg.text) {
        context += `${sender} (${timestamp}): ${msg.text}\n`;
      } else if (msg.type === 'audio' || msg.type === 'ptt') {
        context += `${sender} (${timestamp}): [Mensagem de áudio]\n`;
      } else if (msg.type === 'image') {
        context += `${sender} (${timestamp}): [Imagem enviada]\n`;
      } else if (msg.type === 'document') {
        context += `${sender} (${timestamp}): [Documento enviado]\n`;
      }
    });
    
    context += '\nPor favor, gere 3 sugestões de resposta profissionais e adequadas ao contexto.';
    
    return context;
  }

  private parseResponseSuggestions(response: string) {
    const suggestions: Array<{text: string, tone: string, confidence: number}> = [];
    const lines = response.split('\n');
    let currentSuggestion: {text: string, tone: string, confidence: number} | null = null;

    for (const line of lines) {
      if (line.startsWith('SUGESTÃO') || line.match(/^\d+\./)) {
        if (currentSuggestion) {
          suggestions.push(currentSuggestion);
        }
        currentSuggestion = {
          text: '',
          tone: 'profissional',
          confidence: 0.8
        };
      } else if (line.startsWith('Texto:') && currentSuggestion) {
        currentSuggestion.text = line.replace('Texto:', '').trim().replace(/"/g, '');
      } else if (line.startsWith('Tom:') && currentSuggestion) {
        currentSuggestion.tone = line.replace('Tom:', '').trim();
      } else if (line.startsWith('Confiança:') && currentSuggestion) {
        const confidenceMatch = line.match(/(\d+\.?\d*)/);
        if (confidenceMatch) {
          currentSuggestion.confidence = parseFloat(confidenceMatch[1]);
        }
      } else if (currentSuggestion && line.trim() && !line.includes(':')) {
        // Se não tem formato específico, assume que é o texto da sugestão
        if (!currentSuggestion.text) {
          currentSuggestion.text = line.trim().replace(/"/g, '');
        }
      }
    }

    if (currentSuggestion) {
      suggestions.push(currentSuggestion);
    }

    // Fallback: se não conseguiu parsear, cria sugestões básicas
    if (suggestions.length === 0) {
      const lines = response.split('\n').filter(line => line.trim());
      for (let i = 0; i < Math.min(3, lines.length); i++) {
        if (lines[i].trim()) {
          suggestions.push({
            text: lines[i].trim().replace(/^\d+\.?\s*/, '').replace(/"/g, ''),
            tone: 'profissional',
            confidence: 0.7
          });
        }
      }
    }

    return suggestions.filter(s => s.text && s.text.length > 10);
  }

  async analyzeConversation(messages: MessageDto[]) {
    try {
      // Análise simplificada para o assistente
      return {
        topic: 'Conversa de negócios',
        sentiment: 'neutro',
        urgency: 'média',
        summary: 'Análise via assistente personalizado',
        keyPoints: []
      };
    } catch (error) {
      console.error('Erro ao analisar conversa:', error);
      return {
        topic: 'Conversa de negócios',
        sentiment: 'neutro',
        urgency: 'média',
        summary: 'Análise não disponível',
        keyPoints: []
      };
    }
  }
}

