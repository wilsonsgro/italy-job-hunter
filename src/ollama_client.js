import dotenv from 'dotenv';
dotenv.config();

/**
 * Sends a chat completion request to a local Ollama service.
 * The pipeline runs two specialized services — groq-ollama (triage) and
 * deepseek-ollama (analysis) — so the target endpoint and model are passed per call.
 *
 * @param {{
 *   baseUrl: string,
 *   model: string,
 *   messages: Array<{ role: string, content: string }>,
 *   temperature?: number,
 *   maxTokens?: number,
 * }} params
 * @returns {Promise<string>} the assistant message content (empty string if none)
 */
export async function chatOllama({ baseUrl, model, messages, temperature = 0.3, maxTokens = 1000 }) {
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
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
