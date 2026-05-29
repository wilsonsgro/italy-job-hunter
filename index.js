import http from 'node:http';
import { cercaLavoriItalia } from './src/search_engine.js';
import { eseguiTriage } from './src/triage_filter.js';
import { analizzaConOllama } from './src/ollama_analyzer.js';
import { inviaATelegram } from './src/telegram_sender.js';
import { loadSeen, saveSeen } from './src/seen_store.js';
import { API_DELAY_MS, TELEGRAM_MAX_CHARS, MIN_MATCH_SCORE } from './src/config.js';

/**
 * Extracts the numeric match score from the analysis report string. Returns null if not found.
 * Tolerant of the formats the local model emits: "80%", "[80]", "[80]%" or a bare "80".
 */
function parseMatchScore(report) {
  const match = report.match(/MATCH SCORE[^:]*:\s*\[?\s*(\d+)\s*\]?\s*%?/i);
  return match ? parseInt(match[1], 10) : null;
}

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const cliArgs = new Set(process.argv.slice(2));
const isOneShotMode = cliArgs.has('--once');
const hunterHost = process.env.HUNTER_HOST || '0.0.0.0';
const hunterPort = Number.parseInt(process.env.HUNTER_PORT || '3000', 10);
const runOnStartup = (process.env.HUNTER_RUN_ON_STARTUP || 'true').toLowerCase() !== 'false';
const hunterIntervalMs = Number.parseInt(process.env.HUNTER_INTERVAL_MS || '0', 10);

let activeRunPromise = null;
const runState = {
  status: 'idle',
  source: null,
  lastStartedAt: null,
  lastFinishedAt: null,
  lastError: null
};

async function runHunter() {
  console.log('=====================================================');
  console.log(`🚀 ITALY-JOB-HUNTER LIVE: ${new Date().toLocaleString('it-IT')}`);
  console.log('=====================================================');

  // Stage 1: web search
  console.log('🔍 [STAGE 1] Scanning the web with Tavily...');
  const rawListings = await cercaLavoriItalia();
  console.log(`📊 Found ${rawListings.length} raw listings.`);

  if (rawListings.length === 0) {
    console.log('🏁 No listings found. Ending run.');
    return;
  }

  // Skip URLs already processed in previous runs to avoid duplicate notifications
  const seen = loadSeen();
  const newListings = rawListings.filter(a => !seen.has(a.url));
  console.log(`🗂  ${newListings.length} new listings after deduplication (${rawListings.length - newListings.length} skipped).`);

  if (newListings.length === 0) {
    console.log('🏁 All listings already processed. Ending run.');
    return;
  }

  // The two stages run as separate batches (all triage, then all analysis) instead of
  // interleaving per listing. This keeps a single model resident per phase: on a small
  // GPU only one of groq-ollama / deepseek-ollama is loaded at a time, with one swap
  // between phases rather than a reload on every listing.

  // Stage 2: triage every new listing on groq-ollama
  console.log('-----------------------------------------------------');
  console.log(`🧠 [STAGE 2] Triage ${newListings.length} listing(s) with groq-ollama...`);

  const approvedListings = [];

  for (const listing of newListings) {
    const passed = await eseguiTriage(listing);

    if (passed) {
      console.log(`🔥 [APPROVED] Match found: "${listing.title}"`);
      approvedListings.push(listing);
    } else {
      console.log(`❌ [REJECTED] "${listing.title}" does not match.`);
    }

    // Mark URL as seen and add courtesy delay between calls
    seen.add(listing.url);
    await wait(API_DELAY_MS);
  }

  // Persist the updated seen set before the (slower) analysis phase
  saveSeen(seen);

  // Stage 3: analyze every approved listing on deepseek-ollama
  console.log('-----------------------------------------------------');
  console.log(`🤖 [STAGE 3] Analyzing ${approvedListings.length} match(es) with deepseek-ollama...`);

  const approvedCards = [];

  for (const listing of approvedListings) {
    const report = await analizzaConOllama(listing);
    const score = parseMatchScore(report);

    if (score !== null && score < MIN_MATCH_SCORE) {
      console.log(`📉 [FILTERED] "${listing.title}" — score ${score}% below threshold (${MIN_MATCH_SCORE}%).`);
    } else {
      const card = `💼 <b>${listing.title.toUpperCase()}</b>\n\n${report}\n\n🔗 <a href="${listing.url}">View original listing</a>`;
      approvedCards.push(card);
    }

    await wait(API_DELAY_MS);
  }

  // Stage 4: send accumulated report to Telegram
  console.log('-----------------------------------------------------');
  if (approvedCards.length === 0) {
    console.log('🏁 Zero matches today. No notification sent.');
    console.log('=====================================================');
    return;
  }

  console.log(`📬 Sending report for ${approvedCards.length} position(s)...`);

  let buffer = `🔔 <b>ITALY-JOB-HUNTER - OPPORTUNITY REPORT</b>\n\n`;
  buffer += `${approvedCards.length} match(es) found in the last 24 hours.\n\n`;
  buffer += `═`.repeat(15) + `\n\n`;

  let sentCount = 0;

  for (const card of approvedCards) {
    // Chunk messages to stay safely below Telegram's 4096-character hard limit
    if ((buffer + card).length > TELEGRAM_MAX_CHARS) {
      const sent = await inviaATelegram(buffer);
      if (sent) sentCount++;
      buffer = `📦 <b>OPPORTUNITY REPORT (Continued...)</b>\n\n`;
    }
    buffer += card + `\n\n` + `═`.repeat(15) + `\n\n`;
  }

  if (buffer.trim() !== '') {
    const sent = await inviaATelegram(buffer);
    if (sent) sentCount++;
  }

  console.log(`✅ Report delivered! Total messages sent: ${sentCount}`);
  console.log('=====================================================');
}

async function triggerHunter(source = 'manual') {
  if (activeRunPromise) {
    return activeRunPromise;
  }

  runState.status = 'running';
  runState.source = source;
  runState.lastStartedAt = new Date().toISOString();
  runState.lastError = null;

  activeRunPromise = runHunter()
    .then(() => {
      runState.status = 'idle';
    })
    .catch((error) => {
      runState.status = 'error';
      runState.lastError = error instanceof Error ? error.message : String(error);
      console.error('❌ Hunter run failed:', error);
    })
    .finally(() => {
      runState.lastFinishedAt = new Date().toISOString();
      activeRunPromise = null;
    });

  return activeRunPromise;
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function startHunterServer() {
  const server = http.createServer((req, res) => {
    if (!req.url) {
      sendJson(res, 400, { ok: false, error: 'Missing request URL.' });
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
      sendJson(res, 200, {
        ok: true,
        service: 'italy-job-hunter',
        pid: process.pid,
        uptimeSeconds: Math.round(process.uptime()),
        runState: {
          ...runState,
          isRunning: Boolean(activeRunPromise)
        }
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/run') {
      if (activeRunPromise) {
        sendJson(res, 409, { ok: false, error: 'Hunter is already running.', runState });
        return;
      }

      triggerHunter('http').catch(() => {});
      sendJson(res, 202, { ok: true, message: 'Hunter run started.', runState });
      return;
    }

    sendJson(res, 404, { ok: false, error: 'Not found.' });
  });

  server.listen(hunterPort, hunterHost, () => {
    console.log(`🌐 Hunter server listening on http://${hunterHost}:${hunterPort}`);
  });

  if (runOnStartup) {
    triggerHunter('startup').catch(() => {});
  }

  if (Number.isFinite(hunterIntervalMs) && hunterIntervalMs > 0) {
    console.log(`⏱️  Scheduled hunter run every ${hunterIntervalMs} ms.`);
    setInterval(() => {
      if (!activeRunPromise) {
        triggerHunter('interval').catch(() => {});
      }
    }, hunterIntervalMs);
  }
}

if (isOneShotMode) {
  triggerHunter('cli-once')
    .then(() => {
      if (runState.status === 'error') {
        process.exitCode = 1;
      }
    })
    .catch(() => {
      process.exitCode = 1;
    });
} else {
  startHunterServer();
}
