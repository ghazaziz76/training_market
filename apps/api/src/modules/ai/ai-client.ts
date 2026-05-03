import { env } from '../../config/env.js';

// ============================================================
// AI Client Abstraction — supports OpenAI and Anthropic
// ============================================================

interface EmbeddingResult {
  embedding: number[];
  model: string;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatResult {
  content: string;
  model: string;
}

// ---- OpenAI Client ----

async function openaiEmbedding(text: string): Promise<EmbeddingResult> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI embedding error: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as any;
  return {
    embedding: data.data[0].embedding,
    model: 'text-embedding-3-small',
  };
}

async function openaiChat(messages: ChatMessage[], jsonMode: boolean = false): Promise<ChatResult> {
  const body: any = {
    model: 'gpt-4o-mini',
    messages,
    max_tokens: 1000,
  };
  if (jsonMode) body.response_format = { type: 'json_object' };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`OpenAI chat error: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as any;
  return {
    content: data.choices[0].message.content,
    model: data.model,
  };
}

// ---- Anthropic Client ----

async function anthropicChat(messages: ChatMessage[], jsonMode: boolean = false): Promise<ChatResult> {
  const systemMsg = messages.find((m) => m.role === 'system');
  const userMessages = messages.filter((m) => m.role !== 'system');

  const body: any = {
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    messages: userMessages.map((m) => ({ role: m.role, content: m.content })),
  };
  if (systemMsg) body.system = systemMsg.content;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Anthropic chat error: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as any;
  return {
    content: data.content[0].text,
    model: data.model,
  };
}

// ---- Exported Interface ----

export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  // Embeddings always use OpenAI (Anthropic doesn't have embeddings API)
  return openaiEmbedding(text);
}

export async function chat(
  messages: ChatMessage[],
  jsonMode: boolean = false,
): Promise<ChatResult> {
  if (env.AI_PROVIDER === 'anthropic' && env.ANTHROPIC_API_KEY) {
    return anthropicChat(messages, jsonMode);
  }
  return openaiChat(messages, jsonMode);
}

export function isAIConfigured(): boolean {
  if (env.AI_PROVIDER === 'anthropic') return !!env.ANTHROPIC_API_KEY;
  return !!env.OPENAI_API_KEY;
}
