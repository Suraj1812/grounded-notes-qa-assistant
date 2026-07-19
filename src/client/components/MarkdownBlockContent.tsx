import type { MarkdownBlock } from '../markdown/parse-markdown';
import { MarkdownImage } from './MarkdownImage';
import { MarkdownInline, type CitationRenderer } from './MarkdownInline';

type MarkdownBlockContentProps = {
  block: MarkdownBlock;
  renderCitation?: CitationRenderer;
  headingId?: string;
};

function heading(
  block: Extract<MarkdownBlock, { type: 'heading' }>,
  renderCitation?: CitationRenderer,
  headingId?: string,
) {
  const content = <MarkdownInline text={block.text} renderCitation={renderCitation} />;
  if (block.level === 1) return <h1 id={headingId}>{content}</h1>;
  if (block.level === 2) return <h2 id={headingId}>{content}</h2>;
  if (block.level === 3) return <h3 id={headingId}>{content}</h3>;
  if (block.level === 4) return <h4 id={headingId}>{content}</h4>;
  if (block.level === 5) return <h5 id={headingId}>{content}</h5>;
  return <h6 id={headingId}>{content}</h6>;
}

export function MarkdownBlockContent({ block, renderCitation, headingId }: MarkdownBlockContentProps) {
  if (block.type === 'heading') return heading(block, renderCitation, headingId);
  if (block.type === 'paragraph') return <p><MarkdownInline text={block.text} renderCitation={renderCitation} /></p>;
  if (block.type === 'blockquote') {
    return (
      <blockquote className={block.alert ? `markdown-alert markdown-alert-${block.alert}` : undefined}>
        {block.alert && <strong className="markdown-alert-label">{block.alert}</strong>}
        {block.text && <p><MarkdownInline text={block.text} renderCitation={renderCitation} /></p>}
      </blockquote>
    );
  }
  if (block.type === 'rule') return <hr />;
  if (block.type === 'code') return <pre><code data-language={block.language || undefined}>{block.text}</code></pre>;
  if (block.type === 'image') {
    return <MarkdownImage src={block.src} alt={block.alt} title={block.title} width={block.width} height={block.height} />;
  }
  if (block.type === 'table') {
    return (
      <div className="markdown-table-wrap">
        <table>
          <thead>
            <tr>{block.headers.map((cell, index) => <th key={`header-${index}-${cell}`}><MarkdownInline text={cell} renderCitation={renderCitation} /></th>)}</tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}-${row.join('|')}`}>
                {block.headers.map((_, cellIndex) => (
                  <td key={`cell-${cellIndex}`}><MarkdownInline text={row[cellIndex] ?? ''} renderCitation={renderCitation} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const List = block.type === 'ordered-list' ? 'ol' : 'ul';
  return (
    <List className={block.items.some((item) => item.checked !== undefined) ? 'task-list' : undefined}>
      {block.items.map((item, index) => (
        <li className={item.checked !== undefined ? 'task-list-item' : undefined} key={`${index}-${item.text}`}>
          {item.checked !== undefined && <input type="checkbox" checked={item.checked} readOnly disabled aria-label={item.checked ? 'Completed' : 'Not completed'} />}
          <MarkdownInline text={item.text} renderCitation={renderCitation} />
        </li>
      ))}
    </List>
  );
}
