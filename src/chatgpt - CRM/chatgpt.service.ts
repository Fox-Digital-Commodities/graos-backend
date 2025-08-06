import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { GenerateSuggestionDto, MessageDto } from './dto/generate-suggestion.dto';
import { TranscriptionService } from '../transcription/transcription.service';
import { ConversationThreadRepository } from './repositories/conversation-thread.repository';

@Injectable()
export class ChatGPTService {
  private readonly logger = new Logger(ChatGPTService.name);
  private openai: OpenAI;
  private assistantId: string;

  constructor(
    private configService: ConfigService,
    private transcriptionService: TranscriptionService,
    private conversationThreadRepository: ConversationThreadRepository,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
      baseURL: this.configService.get<string>('OPENAI_API_BASE'),
    });

    this.assistantId =
      this.configService.get<string>('OPENAI_ASSISTANT_ID') ||
      'asst_3pb74nkgV1OLF8s9OL7LxuYX';
    this.validateAssistant();
  }

  private async validateAssistant() {
    try {
      const assistant = await this.openai.beta.assistants.retrieve(
        this.assistantId,
      );
      this.logger.log(`✅ Assistant carregado: ${assistant.name}`);
    } catch (err) {
      this.logger.error(`❌ Assistant ID inválido: ${this.assistantId}`);
      throw new Error(
        `ID de assistant inválido: ${this.assistantId}. Verifique se ele existe ou crie um novo assistant no painel do OpenAI.`,
      );
    }
  }

  async generateResponseSuggestions(data: GenerateSuggestionDto) {
    try {
      // Processar mensagens de áudio automaticamente
      const processedMessages = await this.processAudioMessages(data.messages);
      
      // Buscar ou criar thread para a conversa
      const { thread, conversationThread, isReused } = await this.getOrCreateThread(
        data.conversationId || `temp_${Date.now()}`,
        processedMessages.length,
        data.contactInfo
      );

      this.logger.log(`Thread ${isReused ? 'reutilizada' : 'criada'}: ${thread.id} para conversa: ${data.conversationId}`);

      // Se thread foi reutilizada, adicionar apenas mensagens novas
      // Se thread é nova, adicionar todas as mensagens
      const messagesToAdd = isReused 
        ? this.getNewMessages(processedMessages, conversationThread.lastMessageCount)
        : processedMessages;

      // Adicionar mensagens ao thread
      for (const msg of messagesToAdd) {
        await this.openai.beta.threads.messages.create(thread.id, {
          role: msg.fromMe ? 'assistant' : 'user',
          content: msg.text,
        });
      }

      // Executar assistant
      const run = await this.openai.beta.threads.runs.create(thread.id, {
        assistant_id: this.assistantId,
      });

      if (!run?.id) {
        throw new Error('Falha ao criar execução do assistant: run.id indefinido');
      }

      const runStatus = await this.pollRunUntilComplete(thread.id, run.id);
      if (runStatus.status !== 'completed') {
        throw new Error(`Assistente falhou: ${runStatus.status}`);
      }

      // Obter a última mensagem da resposta
      const messages = await this.openai.beta.threads.messages.list(thread.id);
      const assistantMessage = messages.data.find((msg) => msg.role === 'assistant');
      const response =
        assistantMessage?.content[0]?.type === 'text'
          ? assistantMessage.content[0].text.value
          : '';

      const suggestions = [
        {
          text: response,
          tone: 'profissional',
          confidence: 0.8,
        },
      ];

      // Atualizar thread no banco de dados
      await this.conversationThreadRepository.updateThread(
        conversationThread.id,
        processedMessages.length,
        {
          contactName: data.contactInfo?.name,
          contactPhone: data.contactInfo?.company,
          businessContext: data.businessContext,
          lastMessageType: processedMessages[processedMessages.length - 1]?.type,
          conversationTopic: await this.identifyConversationTopic(processedMessages),
        }
      );

      const lastMessage = processedMessages[processedMessages.length - 1];
      const context = {
        lastMessage: lastMessage?.text || '',
        messageType: lastMessage?.type || 'text',
        conversationTopic: await this.identifyConversationTopic(processedMessages),
      };

      return {
        suggestions,
        context,
        generatedAt: new Date().toISOString(),
        model: 'assistant-v2',
        assistantId: this.assistantId,
        transcriptionsProcessed: processedMessages.filter(msg => msg.transcription).length,
        threadInfo: {
          threadId: thread.id,
          conversationThreadId: conversationThread.id,
          isReused,
          totalSuggestions: conversationThread.totalSuggestionsGenerated + 1,
          messagesAdded: messagesToAdd.length
        }
      };
    } catch (error) {
      this.logger.error('Erro ao gerar sugestões:', error);
      throw new Error(`Falha ao gerar sugestões: ${error.message}`);
    }
  }

  /**
   * Processar mensagens de áudio automaticamente
   */
  private async processAudioMessages(
    messages: MessageDto[],
  ): Promise<MessageDto[]> {
    const processedMessages: MessageDto[] = [];

    for (const message of messages) {
      let processedMessage = { ...message };

      // Verificar se é mensagem de áudio que deve ser transcrita
      if (
        this.transcriptionService.shouldTranscribeAutomatically(
          message.type,
          message.duration,
        )
      ) {
        try {
          this.logger.log(
            `Transcrevendo áudio: ${message.type}, duração: ${message.duration}s`,
          );

          // Usar URL da mídia se disponível, senão usar text como fallback
          const audioUrl = message.mediaUrl || message.text;

          if (audioUrl && audioUrl.startsWith('http')) {
            const transcriptionResult =
              await this.transcriptionService.transcribeAudio(
                audioUrl,
                message.duration,
              );

            // Atualizar mensagem com transcrição
            processedMessage = {
              ...message,
              text: transcriptionResult.transcription,
              transcription: {
                original: transcriptionResult.transcription,
                confidence: transcriptionResult.confidence,
                language: transcriptionResult.language,
                duration: transcriptionResult.duration,
              },
              type: 'audio_transcribed', // Marcar como áudio transcrito
            };

            this.logger.log(
              `Áudio transcrito com sucesso: "${transcriptionResult.transcription.substring(0, 50)}..."`,
            );
          } else {
            this.logger.warn(
              `URL de áudio inválida para mensagem: ${message.id || 'sem ID'}`,
            );
            // Manter mensagem original com indicação de áudio
            processedMessage.text =
              processedMessage.text || '[Áudio não transcrito]';
          }
        } catch (error) {
          this.logger.error(`Erro ao transcrever áudio: ${error.message}`);
          // Em caso de erro, manter mensagem original com indicação
          processedMessage.text =
            processedMessage.text || '[Áudio - falha na transcrição]';
        }
      } else if (processedMessage.type !== 'text') {
        processedMessage.text = '[' + processedMessage.type.toUpperCase() + ']';
      }

      processedMessages.push(processedMessage);
    }

    return processedMessages;
  }

  private async pollRunUntilComplete(threadId: string, runId: string) {
    let status = await this.openai.beta.threads.runs.retrieve(runId, {
      thread_id: threadId,
    });
    while (status.status === 'queued' || status.status === 'in_progress') {
      await new Promise((res) => setTimeout(res, 1000));
      status = await this.openai.beta.threads.runs.retrieve(runId, {
        thread_id: threadId,
      });
    }
    return status;
  }

  async analyzeConversation(messages: any[]) {
    try {
      const conversationText = messages
        .filter((msg) => msg.text?.trim())
        .map((msg) => {
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

Responda em formato JSON válido.`,
          },
          {
            role: 'user',
            content: `Analise esta conversa:\n\n${conversationText}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      const response = completion.choices[0]?.message?.content || '';
      return JSON.parse(response);
    } catch (err) {
      this.logger.warn('Falha ao analisar conversa, retornando fallback.', err);
      return {
        topic: 'Conversa de negócios',
        sentiment: 'neutro',
        urgency: 'média',
        summary: 'Análise não disponível',
        keyPoints: [],
      };
    }
  }

  private parseResponseSuggestions(response: string) {
    const suggestions: Array<{
      text: string;
      tone: string;
      confidence: number;
    }> = [];
    const lines = response.split('\n');
    let current = { text: '', tone: 'profissional', confidence: 0.8 };

    for (const line of lines) {
      if (line.match(/^\d+\.|^SUGESTÃO/i)) {
        if (current.text) suggestions.push(current);
        current = { text: '', tone: 'profissional', confidence: 0.8 };
      } else if (line.startsWith('Texto:')) {
        current.text = line.replace('Texto:', '').trim();
      } else if (line.startsWith('Tom:')) {
        current.tone = line.replace('Tom:', '').trim();
      } else if (line.startsWith('Confiança:')) {
        const match = line.match(/(\d+\.?\d*)/);
        if (match) current.confidence = parseFloat(match[1]);
      } else if (line.trim() && !line.includes(':') && !current.text) {
        current.text = line.trim();
      }
    }
    if (current.text) suggestions.push(current);

    if (suggestions.length === 0) {
      return response
        .split('\n')
        .filter((l) => l.trim())
        .slice(0, 3)
        .map((text) => ({
          text: text.replace(/^\d+\.\s*/, ''),
          tone: 'profissional',
          confidence: 0.7,
        }));
    }

    return suggestions.filter((s: { text: string }) => s.text.length > 10);
  }

  /**
   * Buscar ou criar thread para conversa
   */
  private async getOrCreateThread(
    conversationId: string | undefined,
    currentMessageCount: number,
    contactInfo?: any,
  ): Promise<{
    thread: any;
    conversationThread: any;
    isReused: boolean;
  }> {
    // Se não temos conversationId, criar thread temporária
    if (!conversationId || conversationId.startsWith('temp_')) {
      this.logger.warn('ConversationId não fornecido ou temporário, criando thread temporária');
      const thread = await this.openai.beta.threads.create();
      
      // Criar registro temporário no banco
      const conversationThread = await this.conversationThreadRepository.createForConversation(
        conversationId || `temp_${Date.now()}`,
        thread.id,
        this.assistantId,
        { temporary: true, contactInfo }
      );

      return { thread, conversationThread, isReused: false };
    }

    // Buscar thread existente para a conversa
    const existingThread = await this.conversationThreadRepository.findActiveByConversationId(conversationId);

    if (existingThread && existingThread.canReuse(currentMessageCount)) {
      this.logger.log(`Reutilizando thread existente: ${existingThread.threadId}`);
      
      // Verificar se thread ainda existe no OpenAI
      try {
        const thread = await this.openai.beta.threads.retrieve(existingThread.threadId);
        return { thread, conversationThread: existingThread, isReused: true };
      } catch (error) {
        this.logger.warn(`Thread ${existingThread.threadId} não encontrada no OpenAI, criando nova`);
        // Desativar thread inválida
        await this.conversationThreadRepository.deactivateThread(existingThread.id);
      }
    }

    // Criar nova thread
    this.logger.log(`Criando nova thread para conversa: ${conversationId}`);
    const thread = await this.openai.beta.threads.create();
    
    // Desativar threads antigas da conversa
    await this.conversationThreadRepository.deactivateAllForConversation(conversationId);
    
    // Criar novo registro no banco
    const conversationThread = await this.conversationThreadRepository.createForConversation(
      conversationId,
      thread.id,
      this.assistantId,
      { contactInfo }
    );

    return { thread, conversationThread, isReused: false };
  }

  /**
   * Obter apenas mensagens novas baseado no último count
   */
  private getNewMessages(allMessages: MessageDto[], lastMessageCount: number): MessageDto[] {
    // Se temos mais mensagens que o último count, pegar apenas as novas
    if (allMessages.length > lastMessageCount) {
      const newMessages = allMessages.slice(lastMessageCount);
      this.logger.log(`Adicionando ${newMessages.length} mensagens novas (total: ${allMessages.length}, último: ${lastMessageCount})`);
      return newMessages;
    }
    
    // Se o count é igual ou mr4enor, adicionar apenas a última mensagem para contexto
    const lastMessage = allMessages[allMessages.length - 1];
    if (lastMessage) {
      this.logger.log('Adicionando apenas última mensagem para contexto');
      return [lastMessage];
    }
    
    return [];
  }

  private async identifyConversationTopic(messages: any[]): Promise<string> {
    const combined = messages
      .filter((m) => m.text?.trim())
      .slice(-5)
      .map((m) => m.text)
      .join(' ')
      .toLowerCase();

    const keywords = {
      transporte: ['frete', 'transporte', 'caminhão', 'entrega', 'carga'],
      preço: ['preço', 'valor', 'custo', 'cotação', 'orçamento'],
      prazo: ['prazo', 'data', 'quando', 'urgente', 'rápido'],
      documentação: ['documento', 'nota', 'cte', 'comprovante'],
      pagamento: ['pagamento', 'pagar', 'receber', 'dinheiro'],
    };

    for (const [topic, keys] of Object.entries(keywords)) {
      if (keys.some((k) => combined.includes(k))) return topic;
    }

    return 'conversa geral';
  }
}
