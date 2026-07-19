import { describe, expect, it } from 'vitest';
import { chunkMarkdown } from '../src/server/retrieval/chunker';

describe('chunkMarkdown', () => {
  it('returns no chunks for an empty or whitespace-only file', () => {
    expect(chunkMarkdown('empty.md', '')).toEqual([]);
    expect(chunkMarkdown('blank.md', '  \n\n\t')).toEqual([]);
  });

  it('splits a very long file into bounded, overlapping chunks', () => {
    const content = `# Long decision\n\n${'A detailed architecture sentence with useful context. '.repeat(80)}`;
    const chunks = chunkMarkdown('long.md', content, {
      maxCharacters: 300,
      overlapCharacters: 50,
    });

    expect(chunks.length).toBeGreaterThan(8);
    expect(chunks.every((chunk) => chunk.content.length <= 300)).toBe(true);
    expect(chunks.every((chunk) => chunk.heading === 'Long decision')).toBe(true);
    expect(chunks[1].startLine).toBeLessThanOrEqual(chunks[0].endLine);
  });

  it('preserves unusual formatting, Unicode, emoji, and non-Latin text', () => {
    const content = '# Café ☕\r\n\r\nValue:\tnaïve — مرحبا\r\n\r\n---\r\n\r\n## निर्णय\r\n✅ shipped';
    const chunks = chunkMarkdown('unicode.md', content, { maxCharacters: 140, overlapCharacters: 20 });
    const combined = chunks.map((chunk) => chunk.content).join('\n');

    expect(combined).toContain('Café ☕');
    expect(combined).toContain('مرحبا');
    expect(combined).toContain('निर्णय');
    expect(combined).not.toContain('\r');
  });
});
