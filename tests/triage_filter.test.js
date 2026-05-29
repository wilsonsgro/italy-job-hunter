import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { eseguiTriage } from '../src/triage_filter.js';

vi.mock('dotenv', () => ({ default: { config: vi.fn() } }));

const mockAnnuncio = {
  title: 'Full Stack Developer Vue.js + Node.js',
  content: 'Offerta per il mercato italiano. Stack richiesto: Node.js, Vue.js.',
};

const ollamaResponse = (content) => ({
  ok: true,
  json: async () => ({ message: { content } }),
});

describe('eseguiTriage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('returns true when Ollama responds with "SI"', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ollamaResponse('SI')));
    expect(await eseguiTriage(mockAnnuncio)).toBe(true);
  });

  it('returns false when Ollama responds with "NO"', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ollamaResponse('NO')));
    expect(await eseguiTriage(mockAnnuncio)).toBe(false);
  });

  it('returns true when response contains "SI" with trailing text', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ollamaResponse('SI, è valido')));
    expect(await eseguiTriage(mockAnnuncio)).toBe(true);
  });

  it('returns false on HTTP error without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    }));
    await expect(eseguiTriage(mockAnnuncio)).resolves.toBe(false);
  });

  it('returns false on network error without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));
    await expect(eseguiTriage(mockAnnuncio)).resolves.toBe(false);
  });
});
