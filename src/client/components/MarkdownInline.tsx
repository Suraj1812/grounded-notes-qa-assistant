import { Fragment, type ReactNode } from 'react';
import { MarkdownImage } from './MarkdownImage';

export type CitationRenderer = (number: number, key: string) => ReactNode;

type MarkdownInlineProps = {
  text: string;
  renderCitation?: CitationRenderer;
};

type TokenKind = 'escape' | 'linked-image' | 'image' | 'link' | 'citation' | 'code' | 'strong-asterisk'
  | 'strong-underscore' | 'strikethrough' | 'emphasis-asterisk' | 'emphasis-underscore' | 'autolink';

type InlineToken = {
  kind: TokenKind;
  match: RegExpMatchArray;
};

const tokenMatchers: Array<{ kind: TokenKind; pattern: RegExp }> = [
  { kind: 'escape', pattern: /\\([\\`*{}\[\]()#+\-.!_>~|])/ },
  { kind: 'linked-image', pattern: /\[!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/ },
  { kind: 'image', pattern: /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/ },
  { kind: 'link', pattern: /\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/ },
  { kind: 'citation', pattern: /\[(\d+)\]/ },
  { kind: 'code', pattern: /`([^`]+)`/ },
  { kind: 'strong-asterisk', pattern: /\*\*([^*]+)\*\*/ },
  { kind: 'strong-underscore', pattern: /__([^_]+)__/ },
  { kind: 'strikethrough', pattern: /~~([^~]+)~~/ },
  { kind: 'emphasis-asterisk', pattern: /\*([^*\n]+)\*/ },
  { kind: 'emphasis-underscore', pattern: /_([^_\n]+)_/ },
  { kind: 'autolink', pattern: /<((?:https?:\/\/|mailto:)[^>]+)>/ },
];

function safeHref(value: string): string | null {
  const href = value.trim();
  const lowerHref = href.toLowerCase();
  if (lowerHref.startsWith('javascript:') || lowerHref.startsWith('data:') || lowerHref.startsWith('vbscript:')) return null;
  if (/^[a-z][a-z\d+.-]*:/i.test(href) && !/^(?:https?:|mailto:)/i.test(href)) return null;
  return href || null;
}

function nextInlineToken(text: string): InlineToken | null {
  let selected: InlineToken | null = null;
  for (const matcher of tokenMatchers) {
    const match = text.match(matcher.pattern);
    if (!match || match.index === undefined) continue;
    if (!selected || match.index < (selected.match.index ?? Number.POSITIVE_INFINITY)) {
      selected = { kind: matcher.kind, match };
    }
  }
  return selected;
}

function inlineNodes(text: string, keyPrefix: string, renderCitation?: CitationRenderer): ReactNode[] {
  const nodes: ReactNode[] = [];
  let remaining = text;
  let offset = 0;

  while (remaining) {
    const token = nextInlineToken(remaining);
    if (!token || token.match.index === undefined) {
      nodes.push(remaining);
      break;
    }

    if (token.match.index > 0) nodes.push(remaining.slice(0, token.match.index));
    const key = `${keyPrefix}-${offset + token.match.index}`;
    const [raw] = token.match;

    if (token.kind === 'escape') {
      nodes.push(token.match[1]);
    } else if (token.kind === 'linked-image') {
      const href = safeHref(token.match[4]);
      const image = <MarkdownImage src={token.match[2]} alt={token.match[1]} title={token.match[3]} />;
      nodes.push(href ? (
        <a key={key} href={href} target={/^https?:\/\//i.test(href) ? '_blank' : undefined} rel={/^https?:\/\//i.test(href) ? 'noreferrer' : undefined}>
          {image}
        </a>
      ) : <Fragment key={key}>{image}</Fragment>);
    } else if (token.kind === 'image') {
      nodes.push(<MarkdownImage key={key} src={token.match[2]} alt={token.match[1]} title={token.match[3]} />);
    } else if (token.kind === 'link') {
      const href = safeHref(token.match[2]);
      nodes.push(href ? (
        <a key={key} href={href} target={/^https?:\/\//i.test(href) ? '_blank' : undefined} rel={/^https?:\/\//i.test(href) ? 'noreferrer' : undefined}>
          {inlineNodes(token.match[1], `${key}-link`, renderCitation)}
        </a>
      ) : raw);
    } else if (token.kind === 'citation') {
      nodes.push(renderCitation?.(Number(token.match[1]), key) ?? raw);
    } else if (token.kind === 'code') {
      nodes.push(<code key={key}>{token.match[1]}</code>);
    } else if (token.kind === 'strong-asterisk' || token.kind === 'strong-underscore') {
      nodes.push(<strong key={key}>{inlineNodes(token.match[1], `${key}-strong`, renderCitation)}</strong>);
    } else if (token.kind === 'strikethrough') {
      nodes.push(<del key={key}>{inlineNodes(token.match[1], `${key}-del`, renderCitation)}</del>);
    } else if (token.kind === 'emphasis-asterisk' || token.kind === 'emphasis-underscore') {
      nodes.push(<em key={key}>{inlineNodes(token.match[1], `${key}-em`, renderCitation)}</em>);
    } else {
      const href = safeHref(token.match[1]);
      nodes.push(href ? <a key={key} href={href} target="_blank" rel="noreferrer">{token.match[1]}</a> : raw);
    }

    const consumed = token.match.index + raw.length;
    offset += consumed;
    remaining = remaining.slice(consumed);
  }

  return nodes;
}

export function MarkdownInline({ text, renderCitation }: MarkdownInlineProps) {
  return text.split('\n').map((line, index, lines) => (
    <Fragment key={`${index}-${line}`}>
      {inlineNodes(line, `line-${index}`, renderCitation)}
      {index < lines.length - 1 && <br />}
    </Fragment>
  ));
}
