import dotenv from 'dotenv';
dotenv.config();

/** Tavily search query for Full Stack job listings in Italy. */
export const SEARCH_QUERY =
  '"Full Stack Developer" (Vue.js OR Nuxt) Node.js (Italia OR remoto) ("offerte di lavoro" OR "assunzione" OR "candidati")';

/** Maximum number of raw results to fetch from Tavily per hunt run. */
export const SEARCH_MAX_RESULTS = 20;

/** Tavily search query for Retail-Tech companies in Italy. */
export const SCOUT_QUERY =
  '("software house" OR "tech company" OR "digital agency") (retail OR logistica OR "punti vendita" OR e-commerce) Italia';

/** Maximum number of companies to fetch per scouting run. */
export const SCOUT_MAX_RESULTS = 6;

/** Base URL of the groq-ollama service — local model dedicated to boolean triage. */
export const GROQ_OLLAMA_URL = process.env.GROQ_OLLAMA_URL || 'http://groq-ollama:11435';

/** Base URL of the deepseek-ollama service — local model dedicated to CV analysis. */
export const DEEPSEEK_OLLAMA_URL = process.env.DEEPSEEK_OLLAMA_URL || 'http://deepseek-ollama:11434';

/** Specialized model served by groq-ollama for the boolean triage filter. */
export const TRIAGE_MODEL = process.env.TRIAGE_MODEL || 'ollama-groq';

/** Specialized model served by deepseek-ollama for CV match analysis and pitches. */
export const ANALYSIS_MODEL = process.env.ANALYSIS_MODEL || 'ollama-deepseek';

/**
 * Delay in milliseconds between consecutive model calls.
 * Serializes requests to the single local Ollama instance (OLLAMA_NUM_PARALLEL=1).
 */
export const API_DELAY_MS = 2500;

/**
 * Maximum character count per Telegram message chunk.
 * Telegram's hard limit is 4096; this value gives a safety buffer.
 */
export const TELEGRAM_MAX_CHARS = 4000;

/**
 * Minimum match score (0–100) required to include a listing in the Telegram report.
 * Listings analysed by the model but scoring below this threshold are silently dropped.
 */
export const MIN_MATCH_SCORE = 65;
