import { scoutAziendeRetailTech } from './src/company_scouter.js';
import { eseguiTriageAzienda } from './src/triage_filter.js';
import { analizzaPerCandidaturaSpontanea } from './src/spontaneous_analyzer.js';
import { inviaATelegram } from './src/telegram_sender.js';
import { API_DELAY_MS, TELEGRAM_MAX_CHARS } from './src/config.js';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runScouting() {
  console.log('=====================================================');
  console.log(`🔍 COMPANY MAPPING STARTED: ${new Date().toLocaleString('it-IT')}`);
  console.log('=====================================================');

  console.log('📡 Scanning the web for Retail-Tech companies in Italy...');
  const companies = await scoutAziendeRetailTech();
  console.log(`📊 Found ${companies.length} potential target companies.`);

  if (companies.length === 0) {
    console.log('🏁 No companies found in this session.');
    return;
  }

  // Run as two batches (all triage, then all analysis) so only one model is resident
  // per phase — one swap between groq-ollama and deepseek-ollama instead of per company.

  // Triage every company on groq-ollama
  console.log(`🧭 Triaging ${companies.length} company(ies) with groq-ollama...`);
  const italianCompanies = [];

  for (const company of companies) {
    const isItalian = await eseguiTriageAzienda(company);
    if (isItalian) {
      italianCompanies.push(company);
    } else {
      console.log(`❌ [REJECTED] "${company.name}" — not an Italian company.`);
    }
    await wait(API_DELAY_MS);
  }

  // Generate a pitch for each Italian company on deepseek-ollama
  console.log(`✍️  Generating ${italianCompanies.length} pitch(es) with deepseek-ollama...`);
  const pitchCards = [];

  for (const company of italianCompanies) {
    console.log(`\n🏢 Analyzing positioning for: "${company.name}"...`);
    const report = await analizzaPerCandidaturaSpontanea(company);

    const card = `🏢 <b>COMPANY: ${company.name.toUpperCase()}</b>\n🌐 <a href="${company.url}">Visit website</a>\n\n${report}`;
    pitchCards.push(card);

    await wait(API_DELAY_MS);
  }

  console.log('\n-----------------------------------------------------');
  console.log('📬 Assembling and sending Spontaneous Applications Dossier...');

  let buffer = `🚀 <b>SPONTANEOUS APPLICATIONS DOSSIER</b>\n`;
  buffer += `Target companies identified today with their strategic pitches.\n\n`;
  buffer += `═`.repeat(15) + `\n\n`;

  let sentCount = 0;

  for (const card of pitchCards) {
    // Chunk messages to stay safely below Telegram's 4096-character hard limit
    if ((buffer + card).length > TELEGRAM_MAX_CHARS) {
      const sent = await inviaATelegram(buffer);
      if (sent) sentCount++;
      buffer = `📦 <b>SPONTANEOUS DOSSIER (Continued...)</b>\n\n`;
    }
    buffer += card + `\n\n` + `═`.repeat(15) + `\n\n`;
  }

  if (buffer.trim() !== '') {
    const sent = await inviaATelegram(buffer);
    if (sent) sentCount++;
  }

  console.log(`✅ Dossier sent to Telegram! Total messages: ${sentCount}`);
  console.log('=====================================================');
}

runScouting();