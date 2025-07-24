import { registerAs } from '@nestjs/config';

export default registerAs('openai', () => ({
  apiKey: process.env.OPENAI_API_KEY,
  apiBase: process.env.OPENAI_API_BASE,
  model: process.env.OPENAI_MODEL || 'gpt-4-vision-preview',
  maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS, 10) || 2000,
  temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.1,
}));

