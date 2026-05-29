import { chatOllama } from './ollama_client.js';
import { GROQ_OLLAMA_URL, TRIAGE_MODEL } from './config.js';

/**
 * Runs a boolean triage on a single job listing using the groq-ollama service.
 * Sends the listing to the specialized triage model, which responds only "SI" or "NO"
 * based on whether it matches the Italian market and the target tech stack.
 *
 * @param {{ title: string, content: string }} annuncio
 * @returns {Promise<boolean>} true if the listing passes the filter, false otherwise
 */
export async function eseguiTriage(annuncio) {
  const systemPrompt = `You are a ruthless boolean logic filter for job listings.
Your ONLY job is to respond "SI" or "NO". Do not add explanations, greetings, or punctuation.

Criteria to respond "SI":
1. The offer must be explicitly for the ITALIAN market (work in Italy or Full Remote open to Italian residents).
2. The tech stack must include JavaScript/TypeScript and at least one of: Node.js, Vue.js, or Nuxt.
3. It must be a real job offer (discard freelancer profiles, forum posts, social posts, or help requests).

Mandatory criteria to respond "NO":
- If the position is clearly abroad (Canada, India, USA, UK, etc.) and not open to Italy.
- If the listing is in English and contains no mention of Italy, Italian cities (Milano, Roma, Torino, Napoli, etc.), or explicit acceptance of Italian/European candidates.
- If it is a "Senior" role requiring more than 6-8 years of experience, or a Lead/Director role.
- If the stack focuses only on other languages (pure Java, pure PHP, C#) without Node/Vue/Nuxt.

If the listing is valid respond: SI
If the listing is NOT valid respond: NO`;

  const userContent = `Title: ${annuncio.title}\nJob listing text: ${annuncio.content}`;

  try {
    const content = await chatOllama({
      baseUrl: GROQ_OLLAMA_URL,
      model: TRIAGE_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      // temperature 0 for deterministic output; only "SI"/"NO" expected
      temperature: 0.0,
      maxTokens: 5,
    });
    return content.trim().toUpperCase().includes('SI');

  } catch (error) {
    console.error('❌ Error during Ollama triage:', error.message);
    return false;
  }
}

/**
 * Checks whether a scouted company is based in Italy.
 * Rejects foreign companies before spending an analysis call on them.
 *
 * @param {{ name: string, url: string, content: string }} azienda
 * @returns {Promise<boolean>} true if the company appears to be Italian, false otherwise
 */
export async function eseguiTriageAzienda(azienda) {
  const systemPrompt = `You are a boolean filter. Respond only "SI" or "NO". No explanations.

Respond "SI" if the company is based in Italy or operates primarily in the Italian market.
Respond "NO" if the company is foreign (USA, UK, India, etc.) with no clear Italian presence.`;

  const userContent = `Company: ${azienda.name}\nURL: ${azienda.url}\nDescription: ${azienda.content}`;

  try {
    const content = await chatOllama({
      baseUrl: GROQ_OLLAMA_URL,
      model: TRIAGE_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.0,
      maxTokens: 5,
    });
    return content.trim().toUpperCase().includes('SI');

  } catch (error) {
    console.error('❌ Error during company triage:', error.message);
    return false;
  }
}
