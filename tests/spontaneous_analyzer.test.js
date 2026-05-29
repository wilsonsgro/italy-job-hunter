import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { analizzaPerCandidaturaSpontanea } from '../src/spontaneous_analyzer.js';

vi.mock('dotenv', () => ({ default: { config: vi.fn() } }));
vi.mock('fs');

import fs from 'fs';

const mockAzienda = {
  name: 'SmartRetail Srl',
  url: 'https://smartretail.it',
  content: 'Software house specializzata in soluzioni per la GDO.',
};

describe('analizzaPerCandidaturaSpontanea', () => {
  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('# My CV');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the pitch string on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: 'Pitch content here' } }),
    }));
    const result = await analizzaPerCandidaturaSpontanea(mockAzienda);
    expect(result).toBe('Pitch content here');
  });

  it('returns error string when content is missing from response without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ error: 'model not found' }),
    }));
    const result = await analizzaPerCandidaturaSpontanea(mockAzienda);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns error string on HTTP error without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    }));
    const result = await analizzaPerCandidaturaSpontanea(mockAzienda);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
