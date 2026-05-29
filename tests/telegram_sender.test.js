import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { inviaATelegram, convertiMarkdownInHtml } from '../src/telegram_sender.js';

vi.mock('dotenv', () => ({ default: { config: vi.fn() } }));

describe('convertiMarkdownInHtml', () => {
  it('converts **bold** to <b>bold</b>', () => {
    expect(convertiMarkdownInHtml('**hello**')).toBe('<b>hello</b>');
  });

  it('converts [text](url) to an HTML anchor', () => {
    expect(convertiMarkdownInHtml('[click here](https://example.com)')).toBe(
      '<a href="https://example.com">click here</a>'
    );
  });

  it('escapes & to &amp;', () => {
    expect(convertiMarkdownInHtml('a & b')).toBe('a &amp; b');
  });

  it('escapes < to &lt;', () => {
    expect(convertiMarkdownInHtml('a < b')).toBe('a &lt; b');
  });

  it('escapes > to &gt;', () => {
    expect(convertiMarkdownInHtml('a > b')).toBe('a &gt; b');
  });
});

describe('inviaATelegram', () => {
  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    process.env.TELEGRAM_CHAT_ID = '12345';
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
    vi.restoreAllMocks();
  });

  it('returns true on a successful send', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    const result = await inviaATelegram('Hello!');
    expect(result).toBe(true);
  });

  it('returns false when bot token is missing', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    const result = await inviaATelegram('Hello!');
    expect(result).toBe(false);
  });

  it('returns false when chat ID is missing', async () => {
    delete process.env.TELEGRAM_CHAT_ID;
    const result = await inviaATelegram('Hello!');
    expect(result).toBe(false);
  });

  it('returns false when Telegram API returns an error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ description: 'Bad Request' }),
    }));
    const result = await inviaATelegram('Hello!');
    expect(result).toBe(false);
  });
});
