import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { GenerateSuggestionDto, MessageDto } from './dto/generate-suggestion.dto';

@Injectable()
export class ChatGPTService {
  private openai: OpenAI;
  private assistantId: string;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
      baseURL: this.configService.get<string>('OPENAI_API_BASE'),
    });
    this.assistantId = 'asst_3pb74nkgV1OLF8s9OL7LxuYX';
  }

  async generateResponseSuggestions(data: GenerateSuggestionDto) {
    try {
      // Criar thread
      const thread = await this.openai.beta.threads.create();

      // Preparar contexto da conversa
      const conversationContext = this.buildConversationContext(data);
      
      // Adicionar mensagem ao thread
      await this.openai.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: `Contexto da conversa:\n${conversationContext}\n\nGere ${data.suggestionCount || 3} sugestões de resposta apropriadas para o contexto de ${data.businessContext || 'logística e transporte de grãos'}.`
      });

      // Executar assistente
      const run = await this.openai.beta.threads.runs.create(thread.id, {
        assistant_id: this.assistantId
      });

      // Aguardar conclusão
      let runStatus = await this.openai.beta.threads.runs.retrieve(thread.id, run.id);
      while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await this.openai.beta.threads.runs.retrieve(thread.id, run.id);
      }

      if (runStatus.status !== 'completed') {
        throw new Error(`Assistente falhou: ${runStatus.status}`);
      }

      // Obter resposta
      const messages = await this.openai.beta.threads.messages.list(thread.id);
      const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
      
      if (!assistantMessage || !assistantMessage.content[0]) {
        throw new Error('Resposta vazia do assistente');
      }

      const response = assistantMessage.content[0].type === 'text' 
        ? assistantMessage.content[0].text.value 
        : '';

      // Processar resposta e extrair sugestões
      const suggestions = this.parseResponseSuggestions(response);
      
      // Analisar contexto da última mensagem
      const lastMessage = data.messages[data.messages.length - 1];
      const context = {
        lastMessage: lastMessage?.text || '',
        messageType: lastMessage?.type || 'text',
        conversationTopic: await this.identifyConversationTopic(data.messages),
      };

      return {
        suggestions,
        context,
        generatedAt: new Date().toISOString(),
      };

    } catch (error) {
      console.error('Erro ao gerar sugestões:', error);
      throw new Error(`Falha ao gerar sugestões: ${error.message}`);
    }
  }

  async analyzeConversation(messages: any[]) {
    try {
      const conversationText = messages
        .filter(msg => msg.text && msg.text.trim())
        .map(msg => {
          // Usar role se disponível, senão usar fromMe como fallback
          const role = msg.role || (msg.fromMe ? 'assistant' : 'user');
          const sender = role === 'assistant' ? 'Agente' : 'Cliente';
          return `${sender}: ${msg.text}`;
        })
        .join('\n');

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Você é um assistente especializado em análise de conversas de negócios na área de logística e transporte de grãos.
            
Analise a conversa e forneça:
1. Tópico principal
2. Sentimento geral (positivo, neutro, negativo)
3. Nível de urgência (baixa, média, alta)
4. Resumo conciso
5. Pontos principais (máximo 5)

Responda em formato JSON válido.`
          },
          {
            role: 'user',
            content: `Analise esta conversa:\n\n${conversationText}`
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      const response = completion.choices[0]?.message?.content;
      
      if (!response) {
        // Fallback se não conseguir parsear JSON
        return {
          topic: 'Conversa de negócios',
          sentiment: 'neutro',
          urgency: 'média',
          summary: 'Análise não disponível',
          keyPoints: []
        };
      }
      
      try {
        return JSON.parse(response);
      } catch {
        // Fallback se não conseguir parsear JSON
        return {
          topic: 'Conversa de negócios',
          sentiment: 'neutro',
          urgency: 'média',
          summary: 'Análise não disponível',
          keyPoints: []
        };
      }

    } catch (error) {
      console.error('Erro ao analisar conversa:', error);
      throw new Error(`Falha ao analisar conversa: ${error.message}`);
    }
  }

  private buildConversationContext(data: GenerateSuggestionDto): string {
    const recentMessages = data.messages.slice(-10); // Últimas 10 mensagens
    
    return recentMessages
      .map(msg => {
        // Usar role se disponível, senão usar fromMe como fallback
        const role = msg.role || (msg.fromMe ? 'assistant' : 'user');
        const sender = role === 'assistant' ? 'Agente' : 'Cliente';
        const messageType = msg.type !== 'text' ? ` [${msg.type.toUpperCase()}]` : '';
        return `${sender}${messageType}: ${msg.text || '[Mídia]'}`;
      })
      .join('\n');
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

  private async identifyConversationTopic(messages: MessageDto[]): Promise<string> {
    const recentTexts = messages
      .filter(msg => msg.text && msg.text.trim())
      .slice(-5)
      .map(msg => msg.text)
      .join(' ');

    // Identificação simples baseada em palavras-chave
    const keywords = {
      'transporte': ['frete', 'transporte', 'caminhão', 'entrega', 'carga'],
      'preço': ['preço', 'valor', 'custo', 'cotação', 'orçamento'],
      'prazo': ['prazo', 'data', 'quando', 'urgente', 'rápido'],
      'documentação': ['documento', 'nota', 'cte', 'comprovante'],
      'pagamento': ['pagamento', 'pagar', 'receber', 'dinheiro', 'valor']
    };

    for (const [topic, words] of Object.entries(keywords)) {
      if (words.some(word => recentTexts.toLowerCase().includes(word))) {
        return topic;
      }
    }

    return 'conversa geral';
  }
}

