import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

@Injectable()
export class TranscriptionService {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
      baseURL: this.configService.get<string>('OPENAI_API_BASE'),
    });
  }

  /**
   * Transcrever áudio usando Whisper API
   */
  async transcribeAudio(audioUrl: string, duration?: number): Promise<{
    transcription: string;
    duration: number;
    language: string;
    confidence: number;
  }> {
    try {
      // Verificar se o áudio é menor que 30 segundos
      if (duration && duration > 30) {
        throw new Error('Áudio muito longo para transcrição automática (>30s)');
      }

      // Download do arquivo de áudio
      const audioBuffer = await this.downloadAudio(audioUrl);
      
      // Salvar temporariamente para enviar à API Whisper
      const tempFilePath = await this.saveTemporaryFile(audioBuffer, audioUrl);

      try {
        // Transcrever usando Whisper API
        const transcription = await this.openai.audio.transcriptions.create({
          file: fs.createReadStream(tempFilePath),
          model: 'whisper-1',
          language: 'pt', // Português brasileiro
          response_format: 'verbose_json',
          temperature: 0.2, // Baixa temperatura para maior precisão
        });

        // Limpar arquivo temporário
        fs.unlinkSync(tempFilePath);

        return {
          transcription: transcription.text || '',
          duration: transcription.duration || duration || 0,
          language: transcription.language || 'pt',
          confidence: this.calculateConfidence(transcription.text)
        };

      } catch (whisperError) {
        // Limpar arquivo temporário em caso de erro
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
        throw whisperError;
      }

    } catch (error) {
      console.error('Erro ao transcrever áudio:', error);
      throw new Error(`Falha na transcrição: ${error.message}`);
    }
  }

  /**
   * Download do arquivo de áudio
   */
  private async downloadAudio(audioUrl: string): Promise<Buffer> {
    try {
      const response = await axios.get(audioUrl, {
        responseType: 'arraybuffer',
        timeout: 30000, // 30 segundos timeout
        headers: {
          'User-Agent': 'WhatsApp-Audio-Transcriber/1.0'
        }
      });

      return Buffer.from(response.data);
    } catch (error) {
      console.error('Erro ao baixar áudio:', error);
      throw new Error(`Falha no download do áudio: ${error.message}`);
    }
  }

  /**
   * Salvar arquivo temporário para Whisper API
   */
  private async saveTemporaryFile(audioBuffer: Buffer, originalUrl: string): Promise<string> {
    // Detectar extensão do arquivo baseado na URL ou usar .oga como padrão
    const urlPath = new URL(originalUrl).pathname;
    const extension = path.extname(urlPath) || '.oga';
    
    // Criar nome único para arquivo temporário
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const tempFileName = `audio_${timestamp}_${randomId}${extension}`;
    const tempFilePath = path.join('/tmp', tempFileName);

    // Salvar buffer no arquivo temporário
    fs.writeFileSync(tempFilePath, audioBuffer);

    return tempFilePath;
  }

  /**
   * Calcular confiança baseado no texto transcrito
   */
  private calculateConfidence(text: string): number {
    if (!text || text.trim().length === 0) {
      return 0.0;
    }

    // Fatores que indicam boa transcrição
    let confidence = 0.5; // Base

    // Texto com pontuação adequada
    if (/[.!?]/.test(text)) {
      confidence += 0.1;
    }

    // Palavras comuns em português
    const commonWords = ['o', 'a', 'de', 'que', 'e', 'do', 'da', 'em', 'um', 'para', 'é', 'com', 'não', 'uma', 'os'];
    const words = text.toLowerCase().split(/\s+/);
    const commonWordCount = words.filter(word => commonWords.includes(word)).length;
    const commonWordRatio = commonWordCount / words.length;
    confidence += commonWordRatio * 0.3;

    // Penalizar textos muito curtos ou muito repetitivos
    if (words.length < 3) {
      confidence -= 0.2;
    }

    // Verificar repetição excessiva
    const uniqueWords = new Set(words);
    const uniqueRatio = uniqueWords.size / words.length;
    if (uniqueRatio < 0.5) {
      confidence -= 0.1;
    }

    // Garantir que está entre 0 e 1
    return Math.max(0.0, Math.min(1.0, confidence));
  }

  /**
   * Verificar se áudio deve ser transcrito automaticamente
   */
  shouldTranscribeAutomatically(messageType: string, duration?: number): boolean {
    // Tipos de mensagem que são áudio
    const audioTypes = ['audio', 'ptt', 'voice', 'Áudio'];
    
    if (!audioTypes.includes(messageType)) {
      return false;
    }

    // Se não temos duração, assumir que deve transcrever
    if (!duration) {
      return true;
    }

    // Transcrever apenas se menor que 30 segundos
    return duration <= 30;
  }
}

