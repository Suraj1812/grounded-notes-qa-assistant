export type MarkdownListItem = {
  text: string;
  checked?: boolean;
};

type MarkdownSourceRange = {
  startLine: number;
  endLine: number;
  align?: 'center' | 'left' | 'right';
};

export type MarkdownBlock = MarkdownSourceRange & (
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'unordered-list' | 'ordered-list'; items: MarkdownListItem[] }
  | { type: 'blockquote'; text: string; alert?: string }
  | { type: 'code'; language: string; text: string }
  | { type: 'image'; src: string; alt: string; title?: string; width?: number; height?: number }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'rule' }
);

const headingPattern = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/;
const unorderedListPattern = /^\s*[-+*]\s+(.+)$/;
const orderedListPattern = /^\s*\d+[.)]\s+(.+)$/;
const quotePattern = /^\s*>\s?(.*)$/;
const fencePattern = /^\s*(`{3,}|~{3,})\s*([\w+-]*)\s*$/;
const rulePattern = /^\s{0,3}(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/;
const setextPattern = /^\s*(=+|-+)\s*$/;
const htmlContainerStartPattern = /^\s*<(?:div|p)\b([^>]*)>\s*/i;
const htmlContainerEndPattern = /\s*<\/(?:div|p)>\s*$/i;
const htmlImagePattern = /^\s*<img\b([^>]*)\/?\s*>\s*$/i;
const htmlAttributePattern = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;

type NormalizedMarkdown = {
  lines: string[];
  alignments: Array<MarkdownSourceRange['align']>;
};

function htmlAttributes(source: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const match of source.matchAll(htmlAttributePattern)) {
    attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return attributes;
}

function alignmentFromAttributes(source: string): MarkdownSourceRange['align'] {
  const align = htmlAttributes(source).align?.toLowerCase();
  return align === 'center' || align === 'left' || align === 'right' ? align : undefined;
}

function normalizeHtmlContainers(content: string): NormalizedMarkdown {
  const rawLines = content.replace(/\r\n?/g, '\n').split('\n');
  const alignments: NormalizedMarkdown['alignments'] = [];
  let activeAlignment: MarkdownSourceRange['align'];

  const lines = rawLines.map((rawLine, index) => {
    let line = rawLine;
    const opening = line.match(htmlContainerStartPattern);
    if (opening) {
      activeAlignment = alignmentFromAttributes(opening[1]) ?? activeAlignment;
      line = line.slice(opening[0].length);
    }

    alignments[index] = activeAlignment;
    if (htmlContainerEndPattern.test(line)) {
      line = line.replace(htmlContainerEndPattern, '');
      activeAlignment = undefined;
    }
    return line;
  });

  return { lines, alignments };
}

function positiveDimension(value: string | undefined): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const dimension = Number(value);
  return dimension > 0 && dimension <= 4096 ? dimension : undefined;
}

function imageFromHtml(line: string): Omit<Extract<MarkdownBlock, { type: 'image' }>, keyof MarkdownSourceRange> | null {
  const match = line.match(htmlImagePattern);
  if (!match) return null;
  const attributes = htmlAttributes(match[1]);
  if (!attributes.src) return null;
  return {
    type: 'image',
    src: attributes.src,
    alt: attributes.alt ?? '',
    title: attributes.title,
    width: positiveDimension(attributes.width),
    height: positiveDimension(attributes.height),
  };
}

function withAlignment<T extends MarkdownBlock>(
  block: T,
  alignment: MarkdownSourceRange['align'],
): T {
  return alignment ? { ...block, align: alignment } : block;
}

function tableCells(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, '|'));
}

function isTableDivider(line: string): boolean {
  const cells = tableCells(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, '')));
}

function isTableStart(lines: string[], index: number): boolean {
  return lines[index].includes('|') && index + 1 < lines.length && isTableDivider(lines[index + 1]);
}

function startsBlock(lines: string[], index: number): boolean {
  const line = lines[index];
  return Boolean(
    headingPattern.test(line)
      || unorderedListPattern.test(line)
      || orderedListPattern.test(line)
      || quotePattern.test(line)
      || fencePattern.test(line)
      || htmlImagePattern.test(line)
      || rulePattern.test(line)
      || isTableStart(lines, index)
      || (index + 1 < lines.length && line.trim() && setextPattern.test(lines[index + 1])),
  );
}

function listItem(text: string): MarkdownListItem {
  const task = text.match(/^\[([ xX])\]\s+(.+)$/);
  return task ? { text: task[2], checked: task[1].toLowerCase() === 'x' } : { text };
}

function paragraphText(lines: string[]): string {
  return lines.map((line, index) => {
    const separator = index === lines.length - 1 ? '' : line.endsWith('  ') ? '\n' : ' ';
    return `${line.trim()}${separator}`;
  }).join('');
}

export function parseMarkdown(content: string): MarkdownBlock[] {
  const { lines, alignments } = normalizeHtmlContainers(content);
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const heading = line.match(headingPattern);
    if (heading) {
      blocks.push(withAlignment(
        { type: 'heading', level: heading[1].length, text: heading[2], startLine: index + 1, endLine: index + 1 },
        alignments[index],
      ));
      index += 1;
      continue;
    }

    if (index + 1 < lines.length && setextPattern.test(lines[index + 1])) {
      const underline = lines[index + 1].match(setextPattern);
      blocks.push(withAlignment({
        type: 'heading',
        level: underline?.[1].startsWith('=') ? 1 : 2,
        text: line.trim(),
        startLine: index + 1,
        endLine: index + 2,
      }, alignments[index]));
      index += 2;
      continue;
    }

    const htmlImage = imageFromHtml(line);
    if (htmlImage) {
      blocks.push(withAlignment(
        { ...htmlImage, startLine: index + 1, endLine: index + 1 },
        alignments[index],
      ));
      index += 1;
      continue;
    }

    const fence = line.match(fencePattern);
    if (fence) {
      const start = index;
      const marker = fence[1];
      const code: string[] = [];
      index += 1;
      while (index < lines.length) {
        const closing = lines[index].trim();
        if (closing.length >= marker.length && closing.split('').every((character) => character === marker[0])) {
          index += 1;
          break;
        }
        code.push(lines[index]);
        index += 1;
      }
      blocks.push(withAlignment({
        type: 'code',
        language: fence[2],
        text: code.join('\n'),
        startLine: start + 1,
        endLine: index,
      }, alignments[start]));
      continue;
    }

    if (isTableStart(lines, index)) {
      const start = index;
      const headers = tableCells(lines[index]);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && lines[index].trim() && lines[index].includes('|')) {
        rows.push(tableCells(lines[index]));
        index += 1;
      }
      blocks.push(withAlignment(
        { type: 'table', headers, rows, startLine: start + 1, endLine: index },
        alignments[start],
      ));
      continue;
    }

    const unordered = line.match(unorderedListPattern);
    if (unordered) {
      const start = index;
      const items: MarkdownListItem[] = [];
      while (index < lines.length) {
        const match = lines[index].match(unorderedListPattern);
        if (!match) break;
        items.push(listItem(match[1]));
        index += 1;
      }
      blocks.push(withAlignment(
        { type: 'unordered-list', items, startLine: start + 1, endLine: index },
        alignments[start],
      ));
      continue;
    }

    const ordered = line.match(orderedListPattern);
    if (ordered) {
      const start = index;
      const items: MarkdownListItem[] = [];
      while (index < lines.length) {
        const match = lines[index].match(orderedListPattern);
        if (!match) break;
        items.push(listItem(match[1]));
        index += 1;
      }
      blocks.push(withAlignment(
        { type: 'ordered-list', items, startLine: start + 1, endLine: index },
        alignments[start],
      ));
      continue;
    }

    const quote = line.match(quotePattern);
    if (quote) {
      const start = index;
      const quoteLines: string[] = [];
      while (index < lines.length) {
        const match = lines[index].match(quotePattern);
        if (!match) break;
        quoteLines.push(match[1]);
        index += 1;
      }
      const alert = quoteLines[0]?.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/i);
      if (alert) quoteLines.shift();
      blocks.push(withAlignment({
        type: 'blockquote',
        text: paragraphText(quoteLines),
        alert: alert?.[1].toLowerCase(),
        startLine: start + 1,
        endLine: index,
      }, alignments[start]));
      continue;
    }

    if (rulePattern.test(line)) {
      blocks.push(withAlignment(
        { type: 'rule', startLine: index + 1, endLine: index + 1 },
        alignments[index],
      ));
      index += 1;
      continue;
    }

    const start = index;
    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim() && (index === start || !startsBlock(lines, index))) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push(withAlignment(
      { type: 'paragraph', text: paragraphText(paragraph), startLine: start + 1, endLine: index },
      alignments[start],
    ));
  }

  return blocks;
}
