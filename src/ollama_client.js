import dotenv from 'dotenv';
import { OLLAMA_BASE_URL, OLLAMA_MODEL } from './config.js';
dotenv.config();

/**
 * Sends a chat completion request to the local Ollama server.
 * Both the triage filter and the analysis stages run on the same local model.
 *
 * @param {Array<{ role: string, content: string }>} messages
 * @param {{ temperature?: number, maxTokens?: number }} [options]
 * @returns {Promise<string>} the assistant message content (empty string if none)
 */
export async function chatOllama(messages, { temperature = 0.3, maxTokens = 1000 } = {}) {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      stream: false,
      options: {
        temperature,
        num_predict: maxTokens,
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(`Ollama API Error: ${response.status} - ${detail}`);
  }

  const data = await response.json();
  return data.message?.content ?? '';
}
