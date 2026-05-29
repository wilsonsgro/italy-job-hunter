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

/** Base URL of the local Ollama server. Override with OLLAMA_BASE_URL in .env. */
export const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://job-hunter-ollama:11434';

/** Local Ollama model used for both triage and analysis. */
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:3b-instruct';

/** Model used for the boolean triage filter (local Ollama). */
export const TRIAGE_MODEL = OLLAMA_MODEL;

/** Model used for CV match analysis and pitch generation (local Ollama). */
export const ANALYSIS_MODEL = OLLAMA_MODEL;

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
