import { createHash } from 'node:crypto';
import type { NoteChunk } from '../types/domain';

export type ChunkOptions = {
  maxCharacters?: number;
  overlapCharacters?: number;
};

type Section = {
  heading: string | null;
  start: number;
  end: number;
};

const HEADING = /^ {0,3}#{1,6}\s+(.+?)\s*#*$/;

function sectionsOf(content: string): Section[] {
  const lines = content.split('\n');
  const offsets: number[] = [];
  let offset = 0;

  for (const line of lines) {
    offsets.push(offset);
    offset += line.length + 1;
  }

  const sections: Section[] = [];
  let current: Section = { heading: null, start: 0, end: content.length };

  lines.forEach((line, index) => {
    const match = line.match(HEADING);
    if (!match) return;

    const headingStart = offsets[index];
    if (headingStart > current.start && content.slice(current.start, headingStart).trim()) {
      current.end = headingStart;
      sections.push(current);
    }
    current = { heading: match[1].trim(), start: headingStart, end: content.length };
  });

  if (content.slice(current.start).trim()) sections.push(current);
  return sections;
}

function preferredBoundary(text: string, start: number, hardEnd: number): number {
  if (hardEnd >= text.length) return text.length;
  const minimum = start + Math.floor((hardEnd - start) * 0.6);
  const window = text.slice(minimum, hardEnd);
  const paragraph = window.lastIndexOf('\n\n');
  if (paragraph >= 0) return minimum + paragraph;
  const newline = window.lastIndexOf('\n');
  if (newline >= 0) return minimum + newline;
  const whitespace = Math.max(window.lastIndexOf(' '), window.lastIndexOf('\t'));
  return whitespace >= 0 ? minimum + whitespace : hardEnd;
}

function lineAt(content: string, offset: number): number {
  return content.slice(0, Math.max(0, offset)).split('\n').length;
}

export function chunkMarkdown(
  filename: string,
  rawContent: string,
  options: ChunkOptions = {},
): NoteChunk[] {
  const maxCharacters = options.maxCharacters ?? 900;
  const overlapCharacters = options.overlapCharacters ?? 120;

  if (maxCharacters < 100) throw new Error('maxCharacters must be at least 100');
  if (overlapCharacters < 0 || overlapCharacters >= maxCharacters) {
    throw new Error('overlapCharacters must be non-negative and smaller than maxCharacters');
  }

  const content = rawContent.replace(/\r\n?/g, '\n').trimEnd();
  if (!content.trim()) return [];

  const chunks: NoteChunk[] = [];

  for (const section of sectionsOf(content)) {
    let cursor = section.start;
    while (cursor < section.end) {
      while (cursor < section.end && /\s/.test(content[cursor])) cursor += 1;
      if (cursor >= section.end) break;

      const hardEnd = Math.min(cursor + maxCharacters, section.end);
      let end = preferredBoundary(content.slice(0, section.end), cursor, hardEnd);
      if (end <= cursor) end = hardEnd;

      const chunkContent = content.slice(cursor, end).trim();
      if (chunkContent) {
        const index = chunks.length;
        chunks.push({
          id: createHash('sha1').update(`${filename}:${index}:${chunkContent}`).digest('hex'),
          filename,
          chunkIndex: index,
          heading: section.heading,
          content: chunkContent,
          startLine: lineAt(content, cursor),
          endLine: lineAt(content, Math.max(cursor, end - 1)),
        });
      }

      if (end >= section.end) break;
      const next = Math.max(cursor + 1, end - overlapCharacters);
      const whitespace = content.slice(next, end).search(/\s/);
      cursor = whitespace >= 0 ? next + whitespace + 1 : next;
    }
  }

  return chunks;
}
