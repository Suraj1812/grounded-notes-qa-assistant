import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AnswerText } from '../src/client/components/AnswerText';
import { MarkdownInline } from '../src/client/components/MarkdownInline';
import { parseMarkdown } from '../src/client/markdown/parse-markdown';

describe('parseMarkdown', () => {
  it('turns common Markdown into structured blocks with source lines', () => {
    const blocks = parseMarkdown('# Plan\n\n**Date:** Today\n\n- First\n- Second');

    expect(blocks).toEqual([
      { type: 'heading', level: 1, text: 'Plan', startLine: 1, endLine: 1 },
      { type: 'paragraph', text: '**Date:** Today', startLine: 3, endLine: 3 },
      {
        type: 'unordered-list',
        items: [{ text: 'First' }, { text: 'Second' }],
        startLine: 5,
        endLine: 6,
      },
    ]);
  });

  it('parses tables and fenced code blocks', () => {
    const blocks = parseMarkdown('| Name | Status |\n| --- | --- |\n| Index | Ready |\n\n```ts\nconst ready = true;\n```');

    expect(blocks[0]).toMatchObject({
      type: 'table',
      headers: ['Name', 'Status'],
      rows: [['Index', 'Ready']],
      startLine: 1,
      endLine: 3,
    });
    expect(blocks[1]).toMatchObject({
      type: 'code',
      language: 'ts',
      text: 'const ready = true;',
      startLine: 5,
      endLine: 7,
    });
  });

  it('supports setext headings, quotes, ordered lists, and tasks', () => {
    const blocks = parseMarkdown('Overview\n========\n\n> A grounded note\n\n1. Ask\n2. Cite\n\n- [x] Indexed\n- [ ] Reviewed');

    expect(blocks.map((block) => block.type)).toEqual([
      'heading',
      'blockquote',
      'ordered-list',
      'unordered-list',
    ]);
    expect(blocks[3]).toMatchObject({
      items: [
        { text: 'Indexed', checked: true },
        { text: 'Reviewed', checked: false },
      ],
    });
  });

  it('preserves Markdown hard line breaks inside paragraphs', () => {
    const blocks = parseMarkdown('First line  \nSecond line');

    expect(blocks[0]).toMatchObject({ type: 'paragraph', text: 'First line\nSecond line' });
  });

  it('structures safe GitHub-style HTML wrappers, images, and alerts', () => {
    const blocks = parseMarkdown([
      '<div align="center">',
      '  <img src="src/client/public/grounded-logo.svg" alt="Grounded logo" width="76" height="76" />',
      '',
      '  # Grounded',
      '</div>',
      '',
      '> [!IMPORTANT]',
      '> Indexed notes only.',
    ].join('\n'));

    expect(blocks[0]).toMatchObject({
      type: 'image',
      src: 'src/client/public/grounded-logo.svg',
      alt: 'Grounded logo',
      width: 76,
      height: 76,
      align: 'center',
      startLine: 2,
    });
    expect(blocks[1]).toMatchObject({ type: 'heading', text: 'Grounded', align: 'center', startLine: 4 });
    expect(blocks[2]).toMatchObject({ type: 'blockquote', alert: 'important', text: 'Indexed notes only.' });
  });

  it('renders linked badges and images instead of showing their Markdown syntax', () => {
    const markup = renderToStaticMarkup(createElement(MarkdownInline, {
      text: '[![Tests](https://img.shields.io/badge/tests-passing-green)](https://example.com)',
    }));

    expect(markup).toContain('<a href="https://example.com"');
    expect(markup).toContain('<img class="markdown-image markdown-image-badge"');
    expect(markup).not.toContain('[![');

    const unsafeMarkup = renderToStaticMarkup(createElement(MarkdownInline, {
      text: '![Unsafe](javascript:evil)',
    }));
    expect(unsafeMarkup).not.toContain('<img');
  });

  it('renders assistant Markdown as structured content with clickable citations', () => {
    const markup = renderToStaticMarkup(createElement(AnswerText, {
      answer: '**Summary**\n\n- First point [1]\n- Run `npm test`',
      citations: [{
        filename: 'plan.md',
        heading: 'Plan',
        snippet: 'First point',
        score: 0.8,
        startLine: 1,
        endLine: 3,
      }],
      onCitation: () => undefined,
    }));

    expect(markup).toContain('<strong>Summary</strong>');
    expect(markup).toContain('<ul>');
    expect(markup).toContain('<code>npm test</code>');
    expect(markup).toContain('aria-label="Open citation 1"');
  });
});
