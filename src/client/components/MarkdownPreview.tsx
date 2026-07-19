import type { RefObject } from 'react';
import { parseMarkdown } from '../markdown/parse-markdown';
import { MarkdownBlockContent } from './MarkdownBlockContent';

type MarkdownPreviewProps = {
  content: string;
  citedStartLine: number;
  citedEndLine: number;
  firstCitedRef: RefObject<HTMLDivElement | null>;
};

function headingSlug(text: string): string {
  return text
    .replace(/!?\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/[`*_~]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
}

export function MarkdownPreview({ content, citedStartLine, citedEndLine, firstCitedRef }: MarkdownPreviewProps) {
  const blocks = parseMarkdown(content);
  const firstCitedIndex = blocks.findIndex((block) => block.startLine <= citedEndLine && block.endLine >= citedStartLine);
  const slugCounts = new Map<string, number>();
  const headingIds = blocks.map((block) => {
    if (block.type !== 'heading') return undefined;
    const slug = headingSlug(block.text) || `section-${block.startLine}`;
    const count = slugCounts.get(slug) ?? 0;
    slugCounts.set(slug, count + 1);
    return count === 0 ? slug : `${slug}-${count}`;
  });

  return (
    <article className="markdown-preview">
      {blocks.map((block, index) => {
        const cited = block.startLine <= citedEndLine && block.endLine >= citedStartLine;
        return (
          <div
            className={[
              'markdown-block',
              block.align ? `align-${block.align}` : '',
              cited ? 'cited' : '',
            ].filter(Boolean).join(' ')}
            data-source-lines={`${block.startLine}-${block.endLine}`}
            key={`${block.type}-${block.startLine}`}
            ref={index === firstCitedIndex ? firstCitedRef : undefined}
          >
            <MarkdownBlockContent block={block} headingId={headingIds[index]} />
          </div>
        );
      })}
    </article>
  );
}
