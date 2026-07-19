import type { HealthResponse } from '../../shared/api';

type HeaderProps = {
  health: HealthResponse | null;
  healthError: boolean;
  reindexing: boolean;
  onReindex: () => void;
};

function statusText(health: HealthResponse | null, healthError: boolean): string {
  if (healthError) return 'Connection unavailable';
  if (!health) return 'Connecting…';
  if (health.chunksIndexed === 0) return 'No notes indexed';
  return `${health.notesIndexed} notes · ${health.chunksIndexed} chunks`;
}

export function Header({ health, healthError, reindexing, onReindex }: HeaderProps) {
  const showWarning = healthError || health?.chunksIndexed === 0;

  return (
    <header className="topbar">
      <a className="brand" href="/" aria-label="Grounded home">
        <img className="brand-mark" src="/grounded-logo.svg" alt="" />
        <span>Grounded</span>
      </a>
      <div className="topbar-actions">
        <a className="topbar-link" href="/admin">Manage notes</a>
        <div className="index-status" role="status" aria-live="polite">
          <span className={`status-dot${showWarning ? ' warning' : reindexing ? ' syncing' : ''}`} />
          <span>{statusText(health, healthError)}</span>
          <button className="reindex-button" onClick={onReindex} disabled={reindexing}>
            {reindexing ? 'Indexing…' : 'Re-index'}
          </button>
        </div>
      </div>
    </header>
  );
}
