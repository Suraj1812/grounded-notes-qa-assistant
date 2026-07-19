import { useState } from 'react';

type MarkdownImageProps = {
  src: string;
  alt: string;
  title?: string;
  width?: number;
  height?: number;
};

function safeImageSource(value: string): string | null {
  const source = value.trim();
  if (!source || /[\u0000-\u001f\\]/.test(source)) return null;
  if (/^(?:javascript|data|vbscript):/i.test(source)) return null;
  if (/^[a-z][a-z\d+.-]*:/i.test(source) && !/^https?:/i.test(source)) return null;
  const publicPath = source.match(/^\.?\/?src\/client\/public\/(.+)$/i);
  return publicPath ? `/${publicPath[1]}` : source;
}

export function MarkdownImage({ src, alt, title, width, height }: MarkdownImageProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const safeSource = safeImageSource(src);
  if (!safeSource || failedSource === safeSource) {
    return <span className="markdown-image-fallback" role="img" aria-label={alt || 'Image unavailable'}>{alt || 'Image unavailable'}</span>;
  }

  const badge = /^https?:\/\/img\.shields\.io\//i.test(safeSource);
  return (
    <img
      className={badge ? 'markdown-image markdown-image-badge' : 'markdown-image'}
      src={safeSource}
      alt={alt}
      title={title}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailedSource(safeSource)}
    />
  );
}
