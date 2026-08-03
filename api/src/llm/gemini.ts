/**
 * Cliente Gemini com timeout, retry com backoff e classificação de erro.
 * Toda chamada de texto/JSON estruturado do sistema passa por aqui.
 */
import { GoogleGenAI } from '@google/genai';
import { config } from '../config.js';
import { LlmError } from './errors.js';
import { callWithRetry } from './retry.js';

export const MODEL = 'gemini-2.5-flash';

const client = config.geminiApiKey ? new GoogleGenAI({ apiKey: config.geminiApiKey }) : null;

function requireClient(): GoogleGenAI {
  if (!client) {
    throw new LlmError('config', 'GEMINI_API_KEY não configurada no servidor (api/.env).');
  }
  return client;
}

interface GenerateJsonParams {
  systemInstruction: string;
  prompt: string;
  responseSchema: object;
}

/** Chama o Gemini pedindo saída estruturada (JSON) validada contra responseSchema. */
export async function generateJson<T>(params: GenerateJsonParams): Promise<T> {
  const ai = requireClient();
  const text = await callWithRetry(
    'gemini.generateJson',
    async (signal) => {
      const result = await ai.models.generateContent({
        model: MODEL,
        contents: params.prompt,
        config: {
          systemInstruction: params.systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: params.responseSchema,
          abortSignal: signal,
        },
      });
      if (!result.text) throw new LlmError('bad_response', 'Resposta vazia do Gemini.');
      return result.text;
    },
    'Falha ao falar com o Gemini.',
  );

  try {
    return JSON.parse(text) as T;
  } catch (err) {
    throw new LlmError('bad_response', 'O Gemini retornou JSON inválido.', { cause: err });
  }
}

interface GenerateTextParams {
  systemInstruction: string;
  prompt: string;
  /** Imagens anexadas pelo usuário (chat multimodal): vão inline junto do prompt. */
  images?: { mimeType: string; dataBase64: string }[];
}

/** Chama o Gemini pedindo texto livre (usado pelo chat, que não precisa de JSON). */
export async function generateText(params: GenerateTextParams): Promise<string> {
  const ai = requireClient();
  const images = params.images ?? [];
  // Sem imagens o prompt vai como string simples (comportamento original);
  // com imagens vira uma lista de parts multimodal.
  const contents =
    images.length === 0
      ? params.prompt
      : [
          {
            role: 'user',
            parts: [
              ...images.map((image) => ({
                inlineData: { mimeType: image.mimeType, data: image.dataBase64 },
              })),
              { text: params.prompt },
            ],
          },
        ];

  return callWithRetry(
    'gemini.generateText',
    async (signal) => {
      const result = await ai.models.generateContent({
        model: MODEL,
        contents,
        config: {
          systemInstruction: params.systemInstruction,
          abortSignal: signal,
        },
      });
      if (!result.text) throw new LlmError('bad_response', 'Resposta vazia do Gemini.');
      return result.text;
    },
    'Falha ao falar com o Gemini.',
  );
}
