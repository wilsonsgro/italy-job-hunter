import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { analizzaConOllama } from '../src/ollama_analyzer.js';

vi.mock('dotenv', () => ({ default: { config: vi.fn() } }));
vi.mock('fs');

import fs from 'fs';

const mockAnnuncio = {
  title: 'Full Stack Developer',
  url: 'https://example.com/job/123',
  content: 'Node.js backend, Vue.js frontend, Italian market.',
};

describe('analizzaConOllama', () => {
  beforeEach(() => {
    vi.mocked(fs.readFileSync).mockReturnValue('# My CV\n## Skills\nNode.js, Vue.js');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the report string on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: 'Match score: 85%' } }),
    }));
    const result = await analizzaConOllama(mockAnnuncio);
    expect(result).toBe('Match score: 85%');
  });

  it('returns an error string when the CV file cannot be read', async () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw new Error('ENOENT: no such file or directory');
    });
    const result = await analizzaConOllama(mockAnnuncio);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns an error string on HTTP error without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'Too Many Requests',
    }));
    const result = await analizzaConOllama(mockAnnuncio);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
